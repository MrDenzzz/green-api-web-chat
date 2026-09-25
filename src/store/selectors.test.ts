import { describe, expect, it } from 'vitest';
import type { Chat, ChatMessage } from './chatReducer';
import { buildChatList, chatSubtitle, chatTitle, messagePreview } from './selectors';

const chat = (overrides: Partial<Chat> = {}): Chat => ({
  chatId: '10000000',
  name: undefined,
  phone: undefined,
  username: undefined,
  isGroup: false,
  createdAt: 0,
  ...overrides,
});

const incoming = (chatId: string, timestamp: number, senderName?: string): ChatMessage => ({
  id: `${chatId}-${timestamp}`,
  chatId,
  direction: 'incoming',
  timestamp,
  content: { type: 'text', text: 'Привет' },
  senderName,
});

describe('buildChatList', () => {
  it('puts the most recent activity first', () => {
    const chats = {
      a: chat({ chatId: 'a', createdAt: 1000 }),
      b: chat({ chatId: 'b', createdAt: 100 }),
      c: chat({ chatId: 'c', createdAt: 100 }),
    };
    const messages = {
      a: [],
      b: [incoming('b', 500)],
      c: [incoming('c', 200), incoming('c', 3000)],
    };

    const list = buildChatList(chats, messages);

    // "a" has no messages, so the time it was created counts as its activity.
    expect(list.map((item) => item.chat.chatId)).toEqual(['c', 'a', 'b']);
    expect(list[0]?.lastMessage?.timestamp).toBe(3000);
    expect(list[1]?.lastMessage).toBeUndefined();
  });
});

describe('chatTitle and chatSubtitle', () => {
  it.each([
    [chat({ name: 'Василиса', phone: '79991234567' }), 'Василиса', '+7 999 123-45-67'],
    [chat({ username: '@vasilisa' }), '@vasilisa', undefined],
    [chat({ phone: '79991234567' }), '+7 999 123-45-67', undefined],
    [
      chat({ chatId: '-100500', name: 'Тридесятое царство', isGroup: true }),
      'Тридесятое царство',
      'Группа',
    ],
    [chat(), '10000000', undefined],
  ])('names %o', (value, title, subtitle) => {
    expect(chatTitle(value)).toBe(title);
    expect(chatSubtitle(value)).toBe(subtitle);
  });
});

describe('messagePreview', () => {
  it('prefixes group messages with the author', () => {
    expect(messagePreview(incoming('-100500', 1, 'Василиса'))).toBe('Василиса: Привет');
  });

  it('describes messages the app cannot show', () => {
    const sticker: ChatMessage = {
      ...incoming('10000000', 1),
      content: { type: 'unsupported', typeMessage: 'stickerMessage' },
    };

    expect(messagePreview(sticker)).toBe('Сообщение этого типа не поддерживается');
  });
});
