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

/**
 * Pastes the credentials, as people do when they copy them from the GREEN-API console.
 * `apiUrl` is typed into the collapsed "Другой адрес API" section only when given.
 */
async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  {
    idInstance = '3100000001',
    token = TOKEN,
    apiUrl,
  }: { idInstance?: string; token?: string; apiUrl?: string } = {},
) {
  for (const [label, value] of Object.entries({ idInstance, apiTokenInstance: token })) {
    if (!value) continue;
    await user.click(screen.getByLabelText(label));
    await user.paste(value);
  }
  if (apiUrl !== undefined) {
    await user.click(screen.getByText('Другой адрес API'));
    await user.clear(screen.getByLabelText('apiUrl'));
    await user.paste(apiUrl);
  }
  await user.click(screen.getByRole('button', { name: 'Войти' }));
}

describe('LoginForm', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
  });

  it('asks only for idInstance and apiTokenInstance, as the task describes', () => {
    renderForm();

    expect(screen.getByLabelText('idInstance')).toBeVisible();
    expect(screen.getByLabelText('apiTokenInstance')).toBeVisible();
    expect(screen.getByLabelText('apiUrl')).not.toBeVisible();
    expect(screen.getByLabelText('apiUrl')).toHaveValue('https://api.green-api.com');
  });

  it('asks for both fields and does not call the API', async () => {
    const { user, createClient } = renderForm();

    await signIn(user, { idInstance: '', token: '' });

    expect(screen.getByText('Укажите idInstance')).toBeInTheDocument();
    expect(screen.getByText('Укажите apiTokenInstance')).toBeInTheDocument();
    expect(screen.getByLabelText('idInstance')).toHaveFocus();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('signs in to a MAX instance through the common API address', async () => {
    const { user, createClient } = renderForm();

    await signIn(user);

    const credentials = {
      apiUrl: 'https://api.green-api.com',
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

  it("uses the instance's own API address when given", async () => {
    const { user, createClient } = renderForm();

    await signIn(user, { apiUrl: 'https://3100.api.green-api.com/' });

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: 'https://3100.api.green-api.com' }),
    );
  });

  it('opens the API address section when that address is wrong', async () => {
    const { user } = renderForm();

    await signIn(user, { idInstance: '31-00', apiUrl: 'http://3100.api.green-api.com' });

    expect(screen.getByLabelText('idInstance')).toHaveAccessibleDescription(
      'idInstance состоит только из цифр',
    );
    expect(screen.getByLabelText('apiUrl')).toBeVisible();
    expect(screen.getByLabelText('apiUrl')).toHaveAccessibleDescription(
      'Нужен адрес вида https://api.green-api.com',
    );
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
    expect(screen.getByLabelText('idInstance')).toBeDisabled();
  });
});
