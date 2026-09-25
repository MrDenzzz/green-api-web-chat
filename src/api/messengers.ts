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
  /** Country calling codes CheckAccount accepts; `null` means any country. */
  allowedCountryCodes: readonly string[] | null;
  /** Telegram's CheckAccount can also resolve a chat by @username. */
  supportsUsernameLookup: boolean;
  docsUrl: string;
}

export const MESSENGERS: Record<MessengerId, MessengerProfile> = {
  max: {
    id: 'max',
    name: 'MAX',
    typeInstance: 'v3',
    maxMessageLength: 4000,
    allowedCountryCodes: ['7', '375'],
    supportsUsernameLookup: false,
    docsUrl: 'https://green-api.com/v3/docs/',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    typeInstance: 'telegram',
    maxMessageLength: 4096,
    allowedCountryCodes: null,
    supportsUsernameLookup: true,
    docsUrl: 'https://green-api.com/telegram/docs/',
  },
};

/** Returns the messenger behind an instance, or `null` for instance types the app does not support. */
export function detectMessenger(typeInstance: string | undefined): MessengerProfile | null {
  return Object.values(MESSENGERS).find((profile) => profile.typeInstance === typeInstance) ?? null;
}
