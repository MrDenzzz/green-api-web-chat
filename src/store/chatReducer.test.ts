import { describe, expect, it } from 'vitest';
import type { DeliveryStatus, MessageNotification, StatusNotification } from '../api/notifications';
import {
  chatReducer,
  initialChatState,
  MAX_MESSAGES_PER_CHAT,
  type ChatAction,
  type ChatState,
} from './chatReducer';

const CHAT_ID = '10000000';

const run = (...actions: ChatAction[]) => actions.reduce(chatReducer, initialChatState);

const message = (
  idMessage: string,
  timestamp: number,
  overrides: Partial<MessageNotification> = {},
): MessageNotification => ({
  kind: 'message',
  direction: 'incoming',
  idMessage,
  timestamp,
  chat: { chatId: CHAT_ID, name: 'Василиса', phone: '79998887766', isGroup: false },
  senderName: undefined,
  content: { type: 'text', text: `Сообщение ${idMessage}` },
  ...overrides,
});

const status = (
  idMessage: string,
  value: DeliveryStatus,
  overrides: Partial<StatusNotification> = {},
): StatusNotification => ({
  kind: 'status',
  idMessage,
  chatId: CHAT_ID,
  timestamp: 0,
  status: value,
  error: value === 'failed' ? 'Не удалось доставить сообщение' : undefined,
  ...overrides,
});

const received = (notification: MessageNotification | StatusNotification): ChatAction => ({
  type: 'notification/received',
  notification,
});

const addChat: ChatAction = {
  type: 'chat/added',
  chat: { chatId: CHAT_ID, phone: '79991234567' },
  timestamp: 1000,
};
const queue = (localId: string, timestamp = 2000): ChatAction => ({
  type: 'message/queued',
  chatId: CHAT_ID,
  localId,
  text: 'Привет!',
  timestamp,
});
const sent = (localId: string, idMessage: string): ChatAction => ({
  type: 'message/sent',
  chatId: CHAT_ID,
  localId,
  idMessage,
});

const messagesOf = (state: ChatState) => state.messages[CHAT_ID] ?? [];
const idsOf = (state: ChatState) => messagesOf(state).map((item) => item.id);
const statusOf = (state: ChatState, id: string) => {
  const found = messagesOf(state).find((item) => item.id === id);
  return found?.direction === 'outgoing' ? found.status : undefined;
};

describe('chatReducer', () => {
  describe('chats', () => {
    it('adds a chat created by phone number', () => {
      const state = run(addChat);

      expect(state.chats[CHAT_ID]).toEqual({
        chatId: CHAT_ID,
        name: undefined,
        phone: '79991234567',
        username: undefined,
        isGroup: false,
        createdAt: 1000,
      });
      expect(messagesOf(state)).toEqual([]);
    });

    it('keeps the chat and its messages when the same chat is added again', () => {
      const state = run(addChat, queue('local-1'), { ...addChat, timestamp: 9000 });

      expect(state.chats[CHAT_ID]?.createdAt).toBe(1000);
      expect(idsOf(state)).toEqual(['local-1']);
    });

    it('creates a chat when someone new writes', () => {
      const state = run(received(message('m1', 1000)));

      expect(state.chats[CHAT_ID]).toMatchObject({
        name: 'Василиса',
        phone: '79998887766',
        isGroup: false,
      });
    });

    it('learns the contact name from a later message', () => {
      const state = run(addChat, received(message('m1', 2000)));

      expect(state.chats[CHAT_ID]).toMatchObject({ name: 'Василиса', phone: '79991234567' });
    });
  });

  describe('messages', () => {
    it('ignores a notification delivered twice', () => {
      const once = run(received(message('m1', 1000)));
      const twice = chatReducer(once, received(message('m1', 1000)));

      expect(twice).toBe(once);
    });

    it('keeps messages in chronological order', () => {
      const state = run(
        received(message('m3', 3000)),
        received(message('m1', 1000)),
        received(message('m2', 2000)),
      );

      expect(idsOf(state)).toEqual(['m1', 'm2', 'm3']);
    });

    it(`keeps only the last ${MAX_MESSAGES_PER_CHAT} messages of a chat`, () => {
      const actions = Array.from({ length: MAX_MESSAGES_PER_CHAT + 5 }, (_, index) =>
        received(message(`m${index}`, index)),
      );

      const state = run(...actions);

      expect(messagesOf(state)).toHaveLength(MAX_MESSAGES_PER_CHAT);
      expect(messagesOf(state)[0]?.id).toBe('m5');
    });

    it('marks an outgoing message from a notification as sent', () => {
      const state = run(received(message('m1', 1000, { direction: 'outgoing' })));

      expect(statusOf(state, 'm1')).toBe('sent');
    });
  });

  describe('sending', () => {
    it('shows a queued message as pending', () => {
      const state = run(addChat, queue('local-1'));

      expect(messagesOf(state)).toEqual([
        {
          id: 'local-1',
          chatId: CHAT_ID,
          direction: 'outgoing',
          timestamp: 2000,
          content: { type: 'text', text: 'Привет!' },
          status: 'pending',
          error: undefined,
        },
      ]);
    });

    it('switches to idMessage once SendMessage answers', () => {
      const state = run(addChat, queue('local-1'), sent('local-1', 'id-1'));

      expect(idsOf(state)).toEqual(['id-1']);
      expect(statusOf(state, 'id-1')).toBe('sent');
    });

    it('marks a message as failed with the reason', () => {
      const state = run(addChat, queue('local-1'), {
        type: 'message/failed',
        chatId: CHAT_ID,
        localId: 'local-1',
        error: 'Нет связи с GREEN-API.',
      });

      expect(messagesOf(state)[0]).toMatchObject({
        status: 'failed',
        error: 'Нет связи с GREEN-API.',
      });
    });

    it('moves a retried message to the end as pending', () => {
      const state = run(
        addChat,
        queue('local-1', 2000),
        { type: 'message/failed', chatId: CHAT_ID, localId: 'local-1', error: 'Ошибка' },
        received(message('m1', 3000)),
        { type: 'message/retried', chatId: CHAT_ID, localId: 'local-1', timestamp: 4000 },
      );

      expect(idsOf(state)).toEqual(['m1', 'local-1']);
      expect(messagesOf(state)[1]).toMatchObject({ status: 'pending', error: undefined });
    });

    it('does not duplicate a message whose notification beat the SendMessage response', () => {
      const state = run(
        addChat,
        queue('local-1'),
        received(message('id-1', 2001, { direction: 'outgoing' })),
        received(status('id-1', 'delivered')),
        sent('local-1', 'id-1'),
      );

      expect(idsOf(state)).toEqual(['id-1']);
      expect(statusOf(state, 'id-1')).toBe('delivered');
    });
  });

  describe('statuses', () => {
    const withSentMessage = run(addChat, queue('local-1'), sent('local-1', 'id-1'));

    it('moves a status forward', () => {
      const delivered = chatReducer(withSentMessage, received(status('id-1', 'delivered')));
      const read = chatReducer(delivered, received(status('id-1', 'read')));

      expect(statusOf(delivered, 'id-1')).toBe('delivered');
      expect(statusOf(read, 'id-1')).toBe('read');
    });

    it('never moves a status backwards', () => {
      const read = chatReducer(withSentMessage, received(status('id-1', 'read')));

      expect(chatReducer(read, received(status('id-1', 'delivered')))).toBe(read);
      expect(chatReducer(read, received(status('id-1', 'sent')))).toBe(read);
    });

    it('shows why delivery failed', () => {
      const state = chatReducer(
        withSentMessage,
        received(status('id-1', 'failed', { error: 'У получателя нет аккаунта в мессенджере' })),
      );

      expect(messagesOf(state)[0]).toMatchObject({
        status: 'failed',
        error: 'У получателя нет аккаунта в мессенджере',
      });
    });

    it('trusts a later delivery over an earlier failure', () => {
      const state = run(
        addChat,
        queue('local-1'),
        sent('local-1', 'id-1'),
        received(status('id-1', 'failed')),
        received(status('id-1', 'delivered')),
      );

      expect(messagesOf(state)[0]).toMatchObject({ status: 'delivered', error: undefined });
    });

    it('ignores a failure reported after delivery', () => {
      const delivered = chatReducer(withSentMessage, received(status('id-1', 'delivered')));

      expect(chatReducer(delivered, received(status('id-1', 'failed')))).toBe(delivered);
    });

    it('keeps a status that arrived before its message', () => {
      const early = run(addChat, queue('local-1'), received(status('id-1', 'delivered')));
      const state = chatReducer(early, sent('local-1', 'id-1'));

      expect(early.earlyStatuses).toHaveLength(1);
      expect(statusOf(state, 'id-1')).toBe('delivered');
      expect(state.earlyStatuses).toEqual([]);
    });

    it('finds the message even when the status names another chat', () => {
      const state = chatReducer(
        withSentMessage,
        received(status('id-1', 'read', { chatId: '79991234567@c.us' })),
      );

      expect(statusOf(state, 'id-1')).toBe('read');
    });

    it('ignores statuses of incoming messages', () => {
      const state = run(received(message('m1', 1000)));

      expect(chatReducer(state, received(status('m1', 'read')))).toBe(state);
    });

    it('limits how many early statuses it keeps', () => {
      const actions = Array.from({ length: 250 }, (_, index) =>
        received(status(`unknown-${index}`, 'delivered')),
      );

      expect(run(...actions).earlyStatuses).toHaveLength(200);
    });
  });
});
