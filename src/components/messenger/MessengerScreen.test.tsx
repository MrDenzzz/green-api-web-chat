import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GreenApiClient, ReceivedNotification } from '../../api/client';
import { GreenApiError } from '../../api/errors';
import { useChatStore } from '../../store/chatStore';
import { useSessionStore, type Session } from '../../store/session';
import { createFakeClient } from '../../test/fakeClient';
import { maxIncomingText } from '../../test/fixtures/notifications';
import { MessengerScreen } from './MessengerScreen';

const session: Session = {
  credentials: {
    apiUrl: 'https://3100.api.green-api.com',
    idInstance: '3100000001',
    apiTokenInstance: 'd75b3a66374942c5b3c019c698abc2067e151558acbd412345',
  },
  messengerId: 'max',
  wid: '79991234567@c.us',
};

/** Answers with the given notifications, then holds requests like an empty queue would. */
function queueOf(...notifications: ReceivedNotification[]): GreenApiClient['receiveNotification'] {
  return (_timeoutSec, signal) => {
    const next = notifications.shift();
    if (next) return Promise.resolve(next);
    return new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => {
        reject(new GreenApiError({ reason: 'aborted', method: 'receiveNotification' }));
      });
    });
  };
}

function renderMessenger(overrides: Partial<GreenApiClient> = {}) {
  const client = createFakeClient({
    getSettings: vi.fn(() =>
      Promise.resolve({
        wid: session.wid,
        typeInstance: 'v3',
        webhookUrl: '',
        incomingWebhook: true,
        outgoingWebhook: true,
        outgoingMessageWebhook: true,
        outgoingAPIMessageWebhook: true,
      }),
    ),
    receiveNotification: vi.fn(queueOf()),
    deleteNotification: vi.fn(() => Promise.resolve(true)),
    ...overrides,
  });
  useSessionStore.getState().signIn(session);
  render(<MessengerScreen session={session} createClient={() => client} />);
  return { client, user: userEvent.setup() };
}

describe('MessengerScreen', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState');
    useSessionStore.getState().signOut();
  });

  it('starts with an empty chat list', async () => {
    renderMessenger();

    expect(screen.getByRole('heading', { name: 'Чаты' })).toBeInTheDocument();
    expect(screen.getByText('MAX · +7 999 123-45-67')).toBeInTheDocument();
    expect(screen.getByText('Чатов пока нет')).toBeInTheDocument();
    expect(await screen.findByText('Подключение…')).toBeInTheDocument();
  });

  it('creates a chat by phone number and sends a message to it', async () => {
    const checkAccount = vi.fn(() =>
      Promise.resolve({ exists: true as const, chatId: '10000000' }),
    );
    const sendMessage = vi.fn(() => Promise.resolve('1763115112345'));
    const { user } = renderMessenger({ checkAccount, sendMessage });

    await user.click(screen.getByRole('button', { name: 'Новый чат' }));
    await user.type(screen.getByLabelText('Номер телефона'), '+7 999 123-45-67{Enter}');

    expect(
      await screen.findByRole('heading', { name: '+7 999 123-45-67', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Сообщений пока нет')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Привет!{Enter}');

    const log = await screen.findByRole('log', { name: 'Сообщения' });
    expect(within(log).getByText('Привет!')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(log).getByRole('img', { name: 'Отправлено' })).toBeInTheDocument();
    });
    expect(sendMessage).toHaveBeenCalledWith('10000000', 'Привет!');
  });

  it('shows a message that arrived through the notification queue', async () => {
    const { client } = renderMessenger({
      receiveNotification: vi.fn(queueOf({ receiptId: 7, body: maxIncomingText })),
    });

    const chat = await screen.findByRole('button', { name: /Ходабрыш Пробешёлов/ });
    expect(chat).toHaveTextContent('Я использую GREEN-API для отправки этого сообщения!');
    await waitFor(() => {
      expect(client.deleteNotification).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    });
    expect(screen.getByText('Подключено')).toBeInTheDocument();
  });

  it('opens a chat from the list', async () => {
    const { user } = renderMessenger({
      receiveNotification: vi.fn(queueOf({ receiptId: 7, body: maxIncomingText })),
    });

    await user.click(await screen.findByRole('button', { name: /Ходабрыш Пробешёлов/ }));

    const log = screen.getByRole('log', { name: 'Сообщения' });
    expect(
      within(log).getByText('Я использую GREEN-API для отправки этого сообщения!'),
    ).toBeInTheDocument();
    expect(useChatStore.getState().activeChatId).toBe('10000000');
  });

  it('signs out after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = renderMessenger();

    await user.click(screen.getByRole('button', { name: 'Выйти' }));

    expect(useSessionStore.getState().session).toBeNull();
  });
});
