import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHATS_STORAGE_KEY, useChatStore } from './chatStore';

const addChat = () => {
  useChatStore.getState().dispatch({
    type: 'chat/added',
    chat: { chatId: '10000000', phone: '79991234567' },
    timestamp: 1000,
  });
};

const saved = (version: number) =>
  JSON.stringify({
    state: {
      chats: {
        '10000000': {
          chatId: '10000000',
          phone: '79991234567',
          isGroup: false,
          createdAt: 1000,
        },
      },
      messages: { '10000000': [] },
      earlyStatuses: [],
      activeChatId: '10000000',
    },
    version,
  });

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('saves chats to localStorage', () => {
    addChat();

    const stored = JSON.parse(localStorage.getItem(CHATS_STORAGE_KEY) ?? '{}') as {
      state?: { chats?: Record<string, unknown> };
    };
    expect(Object.keys(stored.state?.chats ?? {})).toEqual(['10000000']);
  });

  it('restores chats after a reload', async () => {
    localStorage.setItem(CHATS_STORAGE_KEY, saved(1));

    await useChatStore.persist.rehydrate();

    expect(useChatStore.getState().chats['10000000']).toMatchObject({ phone: '79991234567' });
    expect(useChatStore.getState().activeChatId).toBe('10000000');
  });

  it('drops data saved with an unknown schema version', async () => {
    localStorage.setItem(CHATS_STORAGE_KEY, saved(0));

    await useChatStore.persist.rehydrate();

    expect(useChatStore.getState().chats).toEqual({});
  });

  it('does not notify subscribers when an action changes nothing', () => {
    addChat();
    const listener = vi.fn();
    const unsubscribe = useChatStore.subscribe(listener);

    addChat();
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
  });
});
