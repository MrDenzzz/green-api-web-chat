import type { MessengerProfile } from '../api/messengers';

export type Recipient = { kind: 'phone'; phone: string } | { kind: 'username'; username: string };

export type ParsedRecipient = { ok: true; recipient: Recipient } | { ok: false; error: string };

/** Characters people write phone numbers with: "+7 (999) 123-45-67". */
const PHONE_INPUT = /^\+?[\d\s().-]+$/;

/** Telegram usernames: 5–32 Latin letters, digits and underscores. */
const USERNAME_INPUT = /^@\w{5,32}$/;

/** Reads what the user typed to start a chat: a phone number or, in Telegram, an @username. */
export function parseRecipient(input: string, messenger: MessengerProfile): ParsedRecipient {
  const value = input.trim();
  if (value === '') {
    return failure(
      messenger.supportsUsernameLookup
        ? 'Введите номер телефона или @username'
        : 'Введите номер телефона',
    );
  }

  if (value.startsWith('@')) {
    if (!messenger.supportsUsernameLookup) {
      return failure(`В ${messenger.name} чат создаётся только по номеру телефона`);
    }
    return USERNAME_INPUT.test(value)
      ? { ok: true, recipient: { kind: 'username', username: value } }
      : failure('После @ нужно от 5 до 32 латинских букв, цифр или «_»');
  }

  if (!PHONE_INPUT.test(value)) {
    return failure('В номере могут быть только цифры, пробелы, скобки и дефисы');
  }
  const phone = normalizePhone(value);
  return messenger.phonePattern.test(phone)
    ? { ok: true, recipient: { kind: 'phone', phone } }
    : failure(messenger.phoneHint);
}

/** Keeps only digits and turns the Russian habit "8 9xx…" into the international "7 9xx…". */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('89') ? `7${digits.slice(1)}` : digits;
}

const PHONE_FORMATS: [RegExp, string][] = [
  [/^7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4'],
  [/^375(\d{2})(\d{3})(\d{2})(\d{2})$/, '+375 $1 $2-$3-$4'],
];

/** "79991234567" → "+7 999 123-45-67"; numbers of other countries just get a plus. */
export function formatPhone(phone: string): string {
  for (const [pattern, format] of PHONE_FORMATS) {
    if (pattern.test(phone)) return phone.replace(pattern, format);
  }
  return `+${phone}`;
}

function failure(error: string): ParsedRecipient {
  return { ok: false, error };
}
