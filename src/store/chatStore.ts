import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chatReducer, initialChatState, type ChatAction, type ChatState } from './chatReducer';

interface ChatStore extends ChatState {
  activeChatId: string | null;
  dispatch: (action: ChatAction) => void;
  setActiveChat: (chatId: string | null) => void;
  reset: () => void;
}

export const CHATS_STORAGE_KEY = 'green-api-web-chat:chats';

/** Chats and messages, persisted in localStorage so they survive a reload. */
export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      ...initialChatState,
      activeChatId: null,
      // The reducer returns the very same object when nothing changed, so no-op
      // notifications (duplicates, stale statuses) do not re-render anything.
      dispatch: (action) => {
        set((state) => chatReducer(state, action));
      },
      setActiveChat: (activeChatId) => {
        set({ activeChatId });
      },
      reset: () => {
        set({ ...initialChatState, activeChatId: null });
      },
    }),
    {
      name: CHATS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ chats, messages, earlyStatuses, activeChatId }) => ({
        chats,
        messages,
        earlyStatuses,
        activeChatId,
      }),
      // There is no older schema yet: data of an unknown version is dropped instead of crashing the app.
      migrate: () => ({ ...initialChatState, activeChatId: null }),
    },
  ),
);
