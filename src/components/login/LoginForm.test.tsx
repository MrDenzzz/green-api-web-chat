import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GreenApiClient } from '../../api/client';
import { GreenApiError, type GreenApiErrorReason } from '../../api/errors';
import { settingsSchema } from '../../api/schemas';
import { useSessionStore } from '../../store/session';
import { createFakeClient } from '../../test/fakeClient';
import { maxSettings, telegramSettings } from '../../test/fixtures/responses';
import { LoginForm } from './LoginForm';

const TOKEN = 'd75b3a66374942c5b3c019c698abc2067e151558acbd412345';

const authorized = () => Promise.resolve('authorized');
const settingsOf = (raw: object) => () => Promise.resolve(settingsSchema.parse(raw));
const failure =
  (reason: GreenApiErrorReason, method = 'getStateInstance') =>
  () =>
    Promise.reject(new GreenApiError({ reason, method }));

function renderForm(overrides: Partial<GreenApiClient> = {}) {
  const client = createFakeClient({
    getStateInstance: vi.fn(authorized),
    getSettings: vi.fn(settingsOf(maxSettings)),
    ...overrides,
  });
  const createClient = vi.fn(() => client);
  render(<LoginForm createClient={createClient} />);
  return { client, createClient, user: userEvent.setup() };
}

/** Pastes the credentials, as people do when they copy them from the GREEN-API console. */
async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  { apiUrl = 'https://3100.api.green-api.com/', idInstance = '3100000001', token = TOKEN } = {},
) {
  const fields = { apiUrl, idInstance, apiTokenInstance: token };
  for (const [label, value] of Object.entries(fields)) {
    if (!value) continue;
    await user.click(screen.getByLabelText(label));
    await user.paste(value);
  }
  await user.click(screen.getByRole('button', { name: 'Войти' }));
}

describe('LoginForm', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
  });

  it('asks for every field and does not call the API', async () => {
    const { user, createClient } = renderForm();

    await signIn(user, { apiUrl: '', idInstance: '', token: '' });

    expect(screen.getByText('Укажите apiUrl')).toBeInTheDocument();
    expect(screen.getByText('Укажите idInstance')).toBeInTheDocument();
    expect(screen.getByText('Укажите apiTokenInstance')).toBeInTheDocument();
    expect(screen.getByLabelText('apiUrl')).toHaveFocus();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('checks the format of the fields', async () => {
    const { user } = renderForm();

    await signIn(user, { apiUrl: 'http://3100.api.green-api.com', idInstance: '31-00' });

    expect(screen.getByLabelText('apiUrl')).toHaveAccessibleDescription(
      'Нужен адрес вида https://3100.api.green-api.com',
    );
    expect(screen.getByLabelText('idInstance')).toHaveAccessibleDescription(
      'idInstance состоит только из цифр',
    );
  });

  it('signs in to a MAX instance with normalized credentials', async () => {
    const { user, createClient } = renderForm();

    await signIn(user);

    const credentials = {
      apiUrl: 'https://3100.api.green-api.com',
      idInstance: '3100000001',
      apiTokenInstance: TOKEN,
    };
    expect(createClient).toHaveBeenCalledWith(credentials);
    expect(useSessionStore.getState().session).toEqual({
      credentials,
      messengerId: 'max',
      wid: '79991234567@c.us',
    });
  });

  it('recognises a Telegram instance', async () => {
    const { user } = renderForm({ getSettings: vi.fn(settingsOf(telegramSettings)) });

    await signIn(user);

    expect(useSessionStore.getState().session?.messengerId).toBe('telegram');
  });

  it.each([
    ['a wrong token', { getStateInstance: failure('unauthorized') }, 'Неверный apiTokenInstance.'],
    [
      'a wrong idInstance',
      { getStateInstance: failure('forbidden') },
      'Неверный idInstance или apiUrl.',
    ],
    [
      'no network',
      { getStateInstance: failure('network') },
      'Нет связи с GREEN-API. Проверьте интернет и apiUrl.',
    ],
    [
      'an instance that is not authorized',
      { getStateInstance: () => Promise.resolve('notAuthorized') },
      'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.',
    ],
    [
      'a WhatsApp instance',
      { getSettings: settingsOf({ ...maxSettings, typeInstance: 'whatsapp' }) },
      'Приложение работает с инстансами MAX и Telegram, а это whatsapp.',
    ],
  ] satisfies [string, Partial<GreenApiClient>, string][])(
    'explains %s',
    async (_, overrides, message) => {
      const { user } = renderForm(overrides);

      await signIn(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(useSessionStore.getState().session).toBeNull();
      expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled();
    },
  );

  it('blocks the form while the instance is being checked', async () => {
    const { user } = renderForm({ getStateInstance: () => new Promise<string>(() => undefined) });

    await signIn(user);

    const button = screen.getByRole('button', { name: 'Проверяем инстанс…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('apiUrl')).toBeDisabled();
  });
});
