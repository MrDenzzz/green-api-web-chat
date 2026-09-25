import type {
  ChatInfo,
  DeliveryStatus,
  MessageContent,
  MessageNotification,
  StatusNotification,
} from '../api/notifications';

/*
 * Pure state transitions for chats and messages. Notifications are delivered at least once
 * (a notification is re-received if deleting it failed), so every transition is idempotent:
 * messages are deduplicated by idMessage and statuses only move forward.
 */

export type MessageStatus = 'pending' | DeliveryStatus;

interface MessageBase {
  /** idMessage from GREEN-API; a local id until SendMessage answers. */
  id: string;
  chatId: string;
  /** Unix time, ms. */
  timestamp: number;
  content: MessageContent;
}

export interface IncomingMessage extends MessageBase {
  direction: 'incoming';
  /** Author of a group message. */
  senderName: string | undefined;
}

export interface OutgoingMessage extends MessageBase {
  direction: 'outgoing';
  status: MessageStatus;
  /** Why sending or delivery failed. */
  error: string | undefined;
}

export type ChatMessage = IncomingMessage | OutgoingMessage;

export interface Chat {
  chatId: string;
  /** Contact or group name reported by the messenger. */
  name: string | undefined;
  /** Phone number (digits) the chat was created with or learned from a notification. */
  phone: string | undefined;
  /** Telegram @username the chat was created with. */
  username: string | undefined;
  isGroup: boolean;
  /** Unix time, ms; orders chats that have no messages yet. */
  createdAt: number;
}

/** A status that arrived before its message. */
interface EarlyStatus {
  idMessage: string;
  status: MessageStatus;
  error: string | undefined;
}

export interface ChatState {
  chats: Record<string, Chat>;
  /** Messages of each chat, oldest first. */
  messages: Record<string, ChatMessage[]>;
  earlyStatuses: EarlyStatus[];
}

export interface NewChat {
  chatId: string;
  phone?: string;
  username?: string;
}

export type ChatAction =
  | { type: 'chat/added'; chat: NewChat; timestamp: number }
  | { type: 'message/queued'; chatId: string; localId: string; text: string; timestamp: number }
  | { type: 'message/sent'; chatId: string; localId: string; idMessage: string }
  | { type: 'message/failed'; chatId: string; localId: string; error: string }
  | { type: 'message/retried'; chatId: string; localId: string; timestamp: number }
  | { type: 'sending/interrupted'; error: string }
  | { type: 'notification/received'; notification: MessageNotification | StatusNotification };

export const initialChatState: ChatState = { chats: {}, messages: {}, earlyStatuses: [] };

/** Keeps localStorage well below its ~5 MB quota. */
export const MAX_MESSAGES_PER_CHAT = 500;
const MAX_EARLY_STATUSES = 200;

/**
 * Failure outranks "sent" (delivery failed after sending), while delivery and reading
 * outrank failure: a later positive status is stronger evidence than an earlier error.
 */
const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  failed: 2,
  delivered: 3,
  read: 4,
};

function advance(current: MessageStatus, next: MessageStatus): MessageStatus {
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chat/added':
      return addChat(state, action.chat, action.timestamp);

    case 'message/queued':
      return insertMessage(ensureChat(state, action.chatId, action.timestamp), {
        id: action.localId,
        chatId: action.chatId,
        direction: 'outgoing',
        timestamp: action.timestamp,
        content: { type: 'text', text: action.text },
        status: 'pending',
        error: undefined,
      });

    case 'message/sent':
      return confirmSent(state, action.chatId, action.localId, action.idMessage);

    case 'message/failed':
      return updateOutgoing(state, action.chatId, action.localId, (message) =>
        message.status === 'pending'
          ? { ...message, status: 'failed', error: action.error }
          : message,
      );

    case 'message/retried':
      return retry(state, action.chatId, action.localId, action.timestamp);

    case 'sending/interrupted':
      return failPending(state, action.error);

    case 'notification/received':
      return action.notification.kind === 'message'
        ? receiveMessage(state, action.notification)
        : receiveStatus(state, action.notification);
  }
}

function addChat(state: ChatState, chat: NewChat, createdAt: number): ChatState {
  const existing = state.chats[chat.chatId];
  if (!existing) {
    return putChat(state, {
      chatId: chat.chatId,
      name: undefined,
      phone: chat.phone,
      username: chat.username,
      isGroup: chat.chatId.startsWith('-'),
      createdAt,
    });
  }
  const phone = existing.phone ?? chat.phone;
  const username = existing.username ?? chat.username;
  return phone === existing.phone && username === existing.username
    ? state
    : putChat(state, { ...existing, phone, username });
}

function ensureChat(state: ChatState, chatId: string, createdAt: number): ChatState {
  return state.chats[chatId] ? state : addChat(state, { chatId }, createdAt);
}

/** Creates a chat seen for the first time and keeps name and phone up to date. */
function syncChat(state: ChatState, info: ChatInfo, createdAt: number): ChatState {
  const existing = state.chats[info.chatId];
  if (!existing) {
    return putChat(state, { ...info, username: undefined, createdAt });
  }
  const name = info.name ?? existing.name;
  const phone = existing.phone ?? info.phone;
  return name === existing.name && phone === existing.phone
    ? state
    : putChat(state, { ...existing, name, phone });
}

function putChat(state: ChatState, chat: Chat): ChatState {
  return {
    ...state,
    chats: { ...state.chats, [chat.chatId]: chat },
    messages: { ...state.messages, [chat.chatId]: state.messages[chat.chatId] ?? [] },
  };
}

function receiveMessage(state: ChatState, notification: MessageNotification): ChatState {
  const { idMessage, chat, timestamp, content } = notification;
  if (findMessage(state, idMessage, chat.chatId)) return state;

  const message: ChatMessage =
    notification.direction === 'incoming'
      ? {
          id: idMessage,
          chatId: chat.chatId,
          direction: 'incoming',
          timestamp,
          content,
          senderName: notification.senderName,
        }
      : {
          id: idMessage,
          chatId: chat.chatId,
          direction: 'outgoing',
          timestamp,
          content,
          status: 'sent',
          error: undefined,
        };
  return applyEarlyStatus(insertMessage(syncChat(state, chat, timestamp), message));
}

function receiveStatus(state: ChatState, notification: StatusNotification): ChatState {
  const { idMessage, chatId, status, error } = notification;
  const location = findMessage(state, idMessage, chatId);
  if (location) {
    return updateOutgoing(state, location.chatId, idMessage, (message) =>
      withStatus(message, status, error),
    );
  }

  // The status beat its message, e.g. while the SendMessage response is still in flight.
  const previous = state.earlyStatuses.find((early) => early.idMessage === idMessage);
  const next = previous ? advance(previous.status, status) : status;
  if (previous?.status === next) return state;
  const others = state.earlyStatuses.filter((early) => early.idMessage !== idMessage);
  return {
    ...state,
    earlyStatuses: [
      ...others,
      { idMessage, status: next, error: next === 'failed' ? error : undefined },
    ].slice(-MAX_EARLY_STATUSES),
  };
}

function confirmSent(
  state: ChatState,
  chatId: string,
  localId: string,
  idMessage: string,
): ChatState {
  const messages = state.messages[chatId];
  const local = messages?.find((message) => message.id === localId);
  if (!messages || local?.direction !== 'outgoing') return state;

  // The outgoingAPIMessageReceived notification may have beaten the HTTP response;
  // then the same message is already in the chat under its real id.
  const echo = messages.find((message) => message.id === idMessage);
  const status = advance(
    advance(local.status, 'sent'),
    echo?.direction === 'outgoing' ? echo.status : 'pending',
  );
  const confirmed: OutgoingMessage = { ...local, id: idMessage, status, error: undefined };
  const next = messages
    .filter((message) => message !== echo)
    .map((message) => (message === local ? confirmed : message));
  return applyEarlyStatus({ ...state, messages: { ...state.messages, [chatId]: next } });
}

function retry(state: ChatState, chatId: string, localId: string, timestamp: number): ChatState {
  const messages = state.messages[chatId];
  const failed = messages?.find((message) => message.id === localId);
  if (!messages || failed?.direction !== 'outgoing' || failed.status !== 'failed') return state;

  // A retried message goes to the end of the chat, where the recipient will see it.
  const withoutFailed = {
    ...state,
    messages: { ...state.messages, [chatId]: messages.filter((message) => message !== failed) },
  };
  return insertMessage(withoutFailed, {
    ...failed,
    status: 'pending',
    error: undefined,
    timestamp,
  });
}

/** Pending messages restored after a reload will never get their SendMessage response. */
function failPending(state: ChatState, error: string): ChatState {
  const isPending = (message: ChatMessage) =>
    message.direction === 'outgoing' && message.status === 'pending';
  if (!Object.values(state.messages).some((list) => list.some(isPending))) return state;

  const messages: Record<string, ChatMessage[]> = {};
  for (const [chatId, list] of Object.entries(state.messages)) {
    messages[chatId] = list.map((message) =>
      message.direction === 'outgoing' && message.status === 'pending'
        ? { ...message, status: 'failed', error }
        : message,
    );
  }
  return { ...state, messages };
}

function applyEarlyStatus(state: ChatState): ChatState {
  if (state.earlyStatuses.length === 0) return state;

  let next = state;
  for (const early of state.earlyStatuses) {
    const location = findMessage(next, early.idMessage);
    if (!location) continue;
    next = updateOutgoing(next, location.chatId, early.idMessage, (message) =>
      withStatus(message, early.status, early.error),
    );
    next = { ...next, earlyStatuses: next.earlyStatuses.filter((item) => item !== early) };
  }
  return next;
}

function withStatus(
  message: OutgoingMessage,
  status: MessageStatus,
  error: string | undefined,
): OutgoingMessage {
  const next = advance(message.status, status);
  return next === message.status
    ? message
    : { ...message, status: next, error: next === 'failed' ? error : undefined };
}

/** Inserts a message keeping the chat ordered by time; equal timestamps keep arrival order. */
function insertMessage(state: ChatState, message: ChatMessage): ChatState {
  const messages = state.messages[message.chatId] ?? [];
  const index = messages.findLastIndex((other) => other.timestamp <= message.timestamp) + 1;
  const next = messages.toSpliced(index, 0, message).slice(-MAX_MESSAGES_PER_CHAT);
  return { ...state, messages: { ...state.messages, [message.chatId]: next } };
}

function updateOutgoing(
  state: ChatState,
  chatId: string,
  id: string,
  update: (message: OutgoingMessage) => OutgoingMessage,
): ChatState {
  const messages = state.messages[chatId];
  const index = messages?.findIndex((message) => message.id === id) ?? -1;
  const message = messages?.[index];
  if (!messages || message?.direction !== 'outgoing') return state;

  const updated = update(message);
  return updated === message
    ? state
    : { ...state, messages: { ...state.messages, [chatId]: messages.with(index, updated) } };
}

/** Looks in the given chat first, then everywhere: an id is unique across chats. */
function findMessage(state: ChatState, id: string, chatIdHint?: string): { chatId: string } | null {
  if (chatIdHint && state.messages[chatIdHint]?.some((message) => message.id === id)) {
    return { chatId: chatIdHint };
  }
  for (const [chatId, messages] of Object.entries(state.messages)) {
    if (messages.some((message) => message.id === id)) return { chatId };
  }
  return null;
}
