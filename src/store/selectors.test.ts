import { describe, expect, it } from 'vitest';
import type { Chat, ChatMessage } from './chatReducer';
import { buildChatList } from './selectors';

const chat = (chatId: string, createdAt: number): Chat => ({
  chatId,
  name: undefined,
  phone: undefined,
  username: undefined,
  isGroup: false,
  createdAt,
});

const incoming = (chatId: string, timestamp: number): ChatMessage => ({
  id: `${chatId}-${timestamp}`,
  chatId,
  direction: 'incoming',
  timestamp,
  content: { type: 'text', text: 'Привет' },
  senderName: undefined,
});

describe('buildChatList', () => {
  it('puts the most recent activity first', () => {
    const chats = { a: chat('a', 1000), b: chat('b', 100), c: chat('c', 100) };
    const messages = {
      a: [],
      b: [incoming('b', 500)],
      c: [incoming('c', 200), incoming('c', 3000)],
    };

    const list = buildChatList(chats, messages);

    // "a" has no messages, so its creation time counts as activity.
    expect(list.map((item) => item.chat.chatId)).toEqual(['c', 'a', 'b']);
    expect(list[0]?.lastMessage?.timestamp).toBe(3000);
    expect(list[1]?.lastMessage).toBeUndefined();
  });
});
