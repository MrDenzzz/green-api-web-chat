import { describe, expect, it } from 'vitest';
import { MESSENGERS } from '../api/messengers';
import { formatPhone, normalizePhone, parseRecipient } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
    ['+44 20 7946 0958', '442079460958'],
  ])('turns %s into %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('parseRecipient', () => {
  describe('in MAX', () => {
    const max = MESSENGERS.max;

    it.each([
      ['+7 999 123-45-67', '79991234567'],
      ['8 (999) 123-45-67', '79991234567'],
      ['+375 29 123 45 67', '375291234567'],
    ])('accepts %s', (input, phone) => {
      expect(parseRecipient(input, max)).toEqual({
        ok: true,
        recipient: { kind: 'phone', phone },
      });
    });

    it('rejects countries GREEN-API does not support in MAX', () => {
      expect(parseRecipient('+44 20 7946 0958', max)).toEqual({
        ok: false,
        error: max.phoneHint,
      });
    });

    it.each([
      ['', 'Введите номер телефона'],
      ['абв', 'В номере могут быть только цифры, пробелы, скобки и дефисы'],
      ['@durov', 'В MAX чат создаётся только по номеру телефона'],
    ])('explains what is wrong with %j', (input, error) => {
      expect(parseRecipient(input, max)).toEqual({ ok: false, error });
    });
  });

  describe('in Telegram', () => {
    const telegram = MESSENGERS.telegram;

    it('accepts a number of any country', () => {
      expect(parseRecipient('+44 20 7946 0958', telegram)).toEqual({
        ok: true,
        recipient: { kind: 'phone', phone: '442079460958' },
      });
    });

    it('accepts a username', () => {
      expect(parseRecipient(' @durov_team ', telegram)).toEqual({
        ok: true,
        recipient: { kind: 'username', username: '@durov_team' },
      });
    });

    it.each(['@abc', '@имя_пользователя'])('rejects the username %s', (input) => {
      expect(parseRecipient(input, telegram)).toMatchObject({ ok: false });
    });

    it('rejects a number without a country code', () => {
      expect(parseRecipient('012345', telegram)).toEqual({
        ok: false,
        error: telegram.phoneHint,
      });
    });
  });
});

describe('formatPhone', () => {
  it.each([
    ['79991234567', '+7 999 123-45-67'],
    ['375291234567', '+375 29 123-45-67'],
    ['442079460958', '+442079460958'],
  ])('formats %s as %s', (phone, formatted) => {
    expect(formatPhone(phone)).toBe(formatted);
  });
});
