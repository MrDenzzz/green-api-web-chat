/**
 * GREEN-API serves MAX and Telegram with the same methods and notification formats.
 * Everything that differs between the two messengers is described here.
 */
export type MessengerId = 'max' | 'telegram';

export interface MessengerProfile {
  id: MessengerId;
  /** Name shown in the UI. */
  name: string;
  /** `typeInstance` reported by getSettings for this messenger. */
  typeInstance: string;
  /** Limit of the `message` field in SendMessage. */
  maxMessageLength: number;
  /** Phone numbers CheckAccount accepts: digits in international format. */
  phonePattern: RegExp;
  /** Explains `phonePattern` when a number does not match it. */
  phoneHint: string;
  /** Telegram's CheckAccount can also find a user by @username. */
  supportsUsernameLookup: boolean;
  docsUrl: string;
}

export const MESSENGERS: Record<MessengerId, MessengerProfile> = {
  max: {
    id: 'max',
    name: 'MAX',
    typeInstance: 'v3',
    maxMessageLength: 4000,
    // GREEN-API supports only Russian (7) and Belarusian (375) numbers in MAX.
    phonePattern: /^(7\d{10}|375\d{9})$/,
    phoneHint: 'В MAX через GREEN-API можно писать на номера России (+7) и Беларуси (+375)',
    supportsUsernameLookup: false,
    docsUrl: 'https://green-api.com/v3/docs/',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    typeInstance: 'telegram',
    maxMessageLength: 4096,
    phonePattern: /^[1-9]\d{7,14}$/,
    phoneHint: 'Введите номер в международном формате, например +7 999 123-45-67',
    supportsUsernameLookup: true,
    docsUrl: 'https://green-api.com/telegram/docs/',
  },
};

/** Returns the messenger behind an instance, or `null` for instance types the app does not support. */
export function detectMessenger(typeInstance: string | undefined): MessengerProfile | null {
  return Object.values(MESSENGERS).find((profile) => profile.typeInstance === typeInstance) ?? null;
}
