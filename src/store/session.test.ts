import { beforeEach, describe, expect, it } from 'vitest';
import { CHATS_STORAGE_KEY, useChatStore } from './chatStore';
import { SESSION_STORAGE_KEY, useSessionStore, type Session } from './session';

const TOKEN = 'd75b3a66374942c5b3c019c698abc2067e151558acbd412345';

const session: Session = {
  credentials: {
    apiUrl: 'https://3100.api.green-api.com',
    idInstance: '3100000001',
    apiTokenInstance: TOKEN,
  },
  messengerId: 'max',
  wid: '79991234567@c.us',
};

const addChat = () => {
  useChatStore.getState().dispatch({
    type: 'chat/added',
    chat: { chatId: '10000000' },
    timestamp: 1000,
  });
};

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
  });

  it('keeps the session in localStorage', () => {
    useSessionStore.getState().signIn(session);

    expect(useSessionStore.getState().session).toEqual(session);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toContain(TOKEN);
  });

  it('starts every session with an empty chat list', () => {
    addChat();

    useSessionStore.getState().signIn(session);

    expect(useChatStore.getState().chats).toEqual({});
  });

  it('wipes credentials, chats and notices on sign-out', () => {
    useSessionStore.getState().signIn(session);
    addChat();
    useSessionStore.getState().setNotice('Инстанс не авторизован.');

    useSessionStore.getState().signOut();

    expect(useSessionStore.getState()).toMatchObject({ session: null, notice: null });
    expect(useChatStore.getState().chats).toEqual({});
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toContain(TOKEN);
    expect(localStorage.getItem(CHATS_STORAGE_KEY)).toBeNull();
  });

  it('does not persist notices', () => {
    useSessionStore.getState().signIn(session);
    useSessionStore.getState().setNotice('Инстанс не авторизован.');

    expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toContain('Инстанс');
  });
});
