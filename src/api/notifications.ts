import { z } from 'zod';

/*
 * Turns a raw notification body into a small domain event. MAX and Telegram share the format.
 * The parser never throws: anything the app cannot use becomes `{ kind: 'ignored' }`,
 * so the polling loop can always delete the notification and move on.
 */

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatInfo {
  chatId: string;
  /** Contact or group name, if the messenger shared it. */
  name: string | undefined;
  /** Contact's phone number (digits), known for incoming personal messages. */
  phone: string | undefined;
  /** Groups, supergroups and channels have negative ids in both MAX and Telegram. */
  isGroup: boolean;
}

export type MessageContent =
  { type: 'text'; text: string } | { type: 'unsupported'; typeMessage: string };

export interface MessageNotification {
  kind: 'message';
  direction: 'incoming' | 'outgoing';
  idMessage: string;
  /** Unix time, ms. */
  timestamp: number;
  chat: ChatInfo;
  /** Author of an incoming group message. */
  senderName: string | undefined;
  content: MessageContent;
}

export interface StatusNotification {
  kind: 'status';
  idMessage: string;
  chatId: string;
  /** Unix time, ms. */
  timestamp: number;
  status: DeliveryStatus;
  /** Why delivery failed; set only for "failed". */
  error: string | undefined;
}

export interface InstanceStateNotification {
  kind: 'instance-state';
  state: string;
}

export interface QuotaExceededNotification {
  kind: 'quota-exceeded';
  description: string;
}

export interface IgnoredNotification {
  kind: 'ignored';
  reason: string;
}

export type ParsedNotification =
  | MessageNotification
  | StatusNotification
  | InstanceStateNotification
  | QuotaExceededNotification
  | IgnoredNotification;

/** Descriptive fields are best-effort: a malformed name must not cost us the message itself. */
const optionalString = z.string().optional().catch(undefined);
const optionalNumber = z.number().optional().catch(undefined);

const headerSchema = z.object({
  typeWebhook: z.string(),
});

const messageDataSchema = z.object({
  typeMessage: z.string(),
  textMessageData: z.object({ textMessage: z.string() }).optional().catch(undefined),
  extendedTextMessageData: z.object({ text: z.string() }).optional().catch(undefined),
});

const messageSchema = z.object({
  typeWebhook: z.enum([
    'incomingMessageReceived',
    'outgoingMessageReceived',
    'outgoingAPIMessageReceived',
  ]),
  idMessage: z.string().min(1),
  timestamp: z.number(),
  senderData: z.object({
    chatId: z.string().min(1),
    chatName: optionalString,
    senderName: optionalString,
    senderContactName: optionalString,
    senderPhoneNumber: optionalNumber,
  }),
  messageData: messageDataSchema,
});

const statusSchema = z.object({
  idMessage: z.string().min(1),
  chatId: z.string().min(1),
  timestamp: z.number(),
  status: z.string(),
  description: optionalString,
});

const instanceStateSchema = z.object({
  stateInstance: z.string(),
});

const quotaExceededSchema = z.object({
  quotaData: z.object({ description: optionalString }).optional().catch(undefined),
});

const FAILURE_REASONS = {
  failed: 'Не удалось доставить сообщение',
  noAccount: 'У получателя нет аккаунта в мессенджере',
  notInGroup: 'Вы не участник этой группы',
};

export function parseNotification(body: unknown): ParsedNotification {
  const header = headerSchema.safeParse(body);
  if (!header.success) return ignore('not a GREEN-API notification');

  const { typeWebhook } = header.data;
  switch (typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived':
      return parseMessage(body);
    case 'outgoingMessageStatus':
      return parseStatus(body);
    case 'stateInstanceChanged': {
      const result = instanceStateSchema.safeParse(body);
      return result.success
        ? { kind: 'instance-state', state: result.data.stateInstance }
        : ignoreInvalid(typeWebhook, result.error);
    }
    case 'quotaExceeded': {
      const result = quotaExceededSchema.safeParse(body);
      return { kind: 'quota-exceeded', description: result.data?.quotaData?.description ?? '' };
    }
    default:
      return ignore(`typeWebhook "${typeWebhook}" is not handled`);
  }
}

function parseMessage(body: unknown): MessageNotification | IgnoredNotification {
  const result = messageSchema.safeParse(body);
  if (!result.success) return ignoreInvalid('message notification', result.error);

  const { typeWebhook, idMessage, timestamp, senderData, messageData } = result.data;
  const content = readContent(messageData);
  if ('kind' in content) return content;

  const incoming = typeWebhook === 'incomingMessageReceived';
  const isGroup = senderData.chatId.startsWith('-');
  // In outgoing notifications the sender fields describe our own account,
  // so the contact's name and phone are taken from incoming messages only.
  const contactName = incoming
    ? (nonEmpty(senderData.senderContactName) ?? nonEmpty(senderData.senderName))
    : undefined;
  const phone =
    incoming && !isGroup && senderData.senderPhoneNumber
      ? String(senderData.senderPhoneNumber)
      : undefined;

  return {
    kind: 'message',
    direction: incoming ? 'incoming' : 'outgoing',
    idMessage,
    timestamp: timestamp * 1000,
    chat: {
      chatId: senderData.chatId,
      name: nonEmpty(senderData.chatName) ?? (isGroup ? undefined : contactName),
      phone,
      isGroup,
    },
    senderName: isGroup ? contactName : undefined,
    content,
  };
}

function readContent({
  typeMessage,
  textMessageData,
  extendedTextMessageData,
}: z.output<typeof messageDataSchema>): MessageContent | IgnoredNotification {
  switch (typeMessage) {
    case 'textMessage':
      return textContent(typeMessage, textMessageData?.textMessage);
    case 'extendedTextMessage': // text with a link preview
    case 'quotedMessage': // a reply; only the reply text is shown
      return textContent(typeMessage, extendedTextMessageData?.text);
    case 'reactionMessage':
    case 'editedMessage':
    case 'deletedMessage':
      // Events about other messages rather than messages to show.
      return ignore(`${typeMessage} is not shown in the chat`);
    default:
      // Media, stickers, locations, contacts, polls: the chat shows a placeholder.
      return { type: 'unsupported', typeMessage };
  }
}

function textContent(
  typeMessage: string,
  text: string | undefined,
): MessageContent | IgnoredNotification {
  return text === undefined ? ignore(`${typeMessage} has no text`) : { type: 'text', text };
}

function parseStatus(body: unknown): StatusNotification | IgnoredNotification {
  const result = statusSchema.safeParse(body);
  if (!result.success) return ignoreInvalid('outgoingMessageStatus', result.error);

  const { idMessage, chatId, timestamp, status, description } = result.data;
  const base = { kind: 'status', idMessage, chatId, timestamp: timestamp * 1000 } as const;
  switch (status) {
    // MAX and Telegram docs do not list "sent", but it costs nothing to accept it.
    case 'sent':
    case 'delivered':
    case 'read':
      return { ...base, status, error: undefined };
    case 'failed':
    case 'noAccount':
    case 'notInGroup':
      return { ...base, status: 'failed', error: nonEmpty(description) ?? FAILURE_REASONS[status] };
    default:
      return ignore(`status "${status}" is not handled`);
  }
}

function ignore(reason: string): IgnoredNotification {
  return { kind: 'ignored', reason };
}

function ignoreInvalid(what: string, error: z.ZodError): IgnoredNotification {
  return ignore(`invalid ${what}: ${z.prettifyError(error)}`);
}

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}
