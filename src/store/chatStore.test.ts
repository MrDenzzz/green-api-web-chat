import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from './chatReducer';
import { CHATS_STORAGE_KEY, useChatStore } from './chatStore';

const CHAT_ID = '10000000';

const addChat = () => {
  useChatStore.getState().dispatch({
    type: 'chat/added',
    chat: { chatId: CHAT_ID, phone: '79991234567' },
    timestamp: 1000,
  });
};

const save = (version: number, messages: ChatMessage[] = []) => {
  localStorage.setItem(
    CHATS_STORAGE_KEY,
    JSON.stringify({
      state: {
        chats: {
          [CHAT_ID]: { chatId: CHAT_ID, phone: '79991234567', isGroup: false, createdAt: 1000 },
        },
        messages: { [CHAT_ID]: messages },
        earlyStatuses: [],
        activeChatId: CHAT_ID,
      },
      version,
    }),
  );
};

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('saves chats to localStorage', () => {
    addChat();

    const stored = JSON.parse(localStorage.getItem(CHATS_STORAGE_KEY) ?? '{}') as {
      state?: { chats?: Record<string, unknown> };
    };
    expect(Object.keys(stored.state?.chats ?? {})).toEqual([CHAT_ID]);
  });

  it('restores chats after a reload', async () => {
    save(1);

    await useChatStore.persist.rehydrate();

    expect(useChatStore.getState().chats[CHAT_ID]).toMatchObject({ phone: '79991234567' });
    expect(useChatStore.getState().activeChatId).toBe(CHAT_ID);
  });

  it('fails messages that were still being sent when the page closed', async () => {
    save(1, [
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

    await useChatStore.persist.rehydrate();

    expect(useChatStore.getState().messages[CHAT_ID]?.[0]).toMatchObject({
      status: 'failed',
      error: 'Отправка прервалась, когда страница закрылась',
    });
  });

  it('drops data saved with an unknown schema version', async () => {
    save(0);

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
