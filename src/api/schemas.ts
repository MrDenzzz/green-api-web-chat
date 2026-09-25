import { z } from 'zod';

/*
 * Zod schemas of GREEN-API responses. Only the fields the app relies on are declared;
 * unknown fields are dropped, so additions on the server side do not break parsing.
 */

/** GREEN-API encodes booleans as "yes"/"no"; a missing flag means "no". */
const yesNoFlag = z
  .string()
  .optional()
  .transform((value) => value === 'yes');

export const stateInstanceSchema = z.object({
  stateInstance: z.string(),
});

export const settingsSchema = z.object({
  wid: z.string().optional(),
  typeInstance: z.string().optional(),
  webhookUrl: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  incomingWebhook: yesNoFlag,
  outgoingWebhook: yesNoFlag,
  outgoingMessageWebhook: yesNoFlag,
  outgoingAPIMessageWebhook: yesNoFlag,
});

export type InstanceSettings = z.output<typeof settingsSchema>;

export const setSettingsSchema = z.object({
  saveSettings: z.boolean(),
});

export const sendMessageSchema = z.object({
  idMessage: z.string().min(1),
});

export const checkAccountSchema = z.object({
  exist: z.boolean(),
  chatId: z.string().optional(),
});

/** `null` when the queue stayed empty for the whole receiveTimeout. */
export const receiveNotificationSchema = z
  .object({
    receiptId: z.number().int(),
    body: z.unknown(),
  })
  .nullable();

export const deleteNotificationSchema = z.object({
  result: z.boolean(),
});
