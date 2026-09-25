import { describe, expect, it } from 'vitest';
import { normalizeApiUrl, validateCredentials } from './credentials';

describe('normalizeApiUrl', () => {
  it.each([
    ['https://3100.api.green-api.com', 'https://3100.api.green-api.com'],
    ['  https://3100.api.green-api.com/  ', 'https://3100.api.green-api.com'],
    ['3100.api.green-api.com', 'https://3100.api.green-api.com'],
    ['https://api.green-api.com/v3/', 'https://api.green-api.com/v3'],
  ])('turns %j into %s', (input, expected) => {
    expect(normalizeApiUrl(input)).toBe(expected);
  });

  it.each(['', 'http://3100.api.green-api.com', 'https://localhost', 'не адрес'])(
    'rejects %j',
    (input) => {
      expect(normalizeApiUrl(input)).toBeNull();
    },
  );
});

describe('validateCredentials', () => {
  it('trims and normalizes valid input', () => {
    expect(
      validateCredentials({
        apiUrl: 'https://3100.api.green-api.com/',
        idInstance: ' 3100000001 ',
        apiTokenInstance: ' token ',
      }),
    ).toEqual({
      ok: true,
      credentials: {
        apiUrl: 'https://3100.api.green-api.com',
        idInstance: '3100000001',
        apiTokenInstance: 'token',
      },
    });
  });

  it('falls back to the common API address when none is given', () => {
    expect(
      validateCredentials({ apiUrl: '  ', idInstance: '3100000001', apiTokenInstance: 'token' }),
    ).toMatchObject({ ok: true, credentials: { apiUrl: 'https://api.green-api.com' } });
  });

  it('reports every problem at once', () => {
    expect(
      validateCredentials({ apiUrl: 'ftp://host', idInstance: '31-00', apiTokenInstance: 'a b' }),
    ).toEqual({
      ok: false,
      errors: {
        apiUrl: 'Нужен адрес вида https://api.green-api.com',
        idInstance: 'idInstance состоит только из цифр',
        apiTokenInstance: 'В токене не должно быть пробелов',
      },
    });
  });
});
