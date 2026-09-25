import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { GreenApiCredentials } from '../api/client';
import type { MessengerId } from '../api/messengers';
import type { InstanceSettings } from '../api/schemas';
import { useChatStore } from './chatStore';

export interface Session {
  credentials: GreenApiCredentials;
  messengerId: MessengerId;
  /** Own account id from getSettings, e.g. "79991234567@c.us". */
  wid: string | undefined;
}

interface SessionStore {
  session: Session | null;
  /**
   * Settings read while signing in. getSettings allows one request per second,
   * so the notifications banner reuses them instead of asking again. Not persisted.
   */
  instanceSettings: InstanceSettings | null;
  /** Warning about the instance from service notifications. Not persisted. */
  notice: string | null;
  signIn: (session: Session, instanceSettings?: InstanceSettings) => void;
  signOut: () => void;
  setNotice: (notice: string | null) => void;
}

export const SESSION_STORAGE_KEY = 'green-api-web-chat:session';

/** Credentials live only here, in the browser's localStorage. */
export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      session: null,
      instanceSettings: null,
      notice: null,
      signIn: (session, instanceSettings) => {
        // Never mix chats of different instances.
        useChatStore.getState().reset();
        set({ session, instanceSettings: instanceSettings ?? null, notice: null });
      },
      signOut: () => {
        set({ session: null, instanceSettings: null, notice: null });
        useChatStore.getState().reset();
        useChatStore.persist.clearStorage();
      },
      setNotice: (notice) => {
        set({ notice });
      },
    }),
    {
      name: SESSION_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ session }) => ({ session }),
      migrate: () => ({ session: null }),
    },
  ),
);
