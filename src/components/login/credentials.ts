import type { GreenApiCredentials } from '../../api/client';

export type CredentialsForm = Record<keyof GreenApiCredentials, string>;

export type CredentialsErrors = Partial<Record<keyof GreenApiCredentials, string>>;

export type CredentialsValidation =
  { ok: true; credentials: GreenApiCredentials } | { ok: false; errors: CredentialsErrors };

export function validateCredentials(form: CredentialsForm): CredentialsValidation {
  const apiUrl = normalizeApiUrl(form.apiUrl);
  const idInstance = form.idInstance.trim();
  const apiTokenInstance = form.apiTokenInstance.trim();
  const errors: CredentialsErrors = {};

  if (form.apiUrl.trim() === '') {
    errors.apiUrl = 'Укажите apiUrl';
  } else if (apiUrl === null) {
    errors.apiUrl = 'Нужен адрес вида https://3100.api.green-api.com';
  }

  if (idInstance === '') {
    errors.idInstance = 'Укажите idInstance';
  } else if (!/^\d+$/.test(idInstance)) {
    errors.idInstance = 'idInstance состоит только из цифр';
  }

  if (apiTokenInstance === '') {
    errors.apiTokenInstance = 'Укажите apiTokenInstance';
  } else if (/\s/.test(apiTokenInstance)) {
    errors.apiTokenInstance = 'В токене не должно быть пробелов';
  }

  if (apiUrl === null || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, credentials: { apiUrl, idInstance, apiTokenInstance } };
}

/**
 * Accepts what people paste from the console: "https://3100.api.green-api.com/",
 * or even "3100.api.green-api.com". The token travels in the URL, so only https is allowed.
 */
export function normalizeApiUrl(input: string): string | null {
  const value = input.trim();
  if (value === '') return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.hostname.includes('.')) return null;
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}
