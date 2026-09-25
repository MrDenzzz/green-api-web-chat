import { beforeEach, describe, expect, it } from 'vitest';
import { parseNotification } from '../api/notifications';
import {
  maxIncomingText,
  maxQuotaExceeded,
  maxStateInstanceChanged,
} from '../test/fixtures/notifications';
import { applyNotification } from './applyNotification';
import { useChatStore } from './chatStore';
import { useSessionStore } from './session';

describe('applyNotification', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
  });

  it('puts messages into the chat store', () => {
    applyNotification(parseNotification(maxIncomingText));

    expect(useChatStore.getState().messages['10000000']).toHaveLength(1);
  });

  it('warns when the instance loses authorization and clears the warning once it is back', () => {
    applyNotification(
      parseNotification({ ...maxStateInstanceChanged, stateInstance: 'notAuthorized' }),
    );
    expect(useSessionStore.getState().notice).toBe(
      'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.',
    );

    applyNotification(parseNotification(maxStateInstanceChanged));
    expect(useSessionStore.getState().notice).toBeNull();
  });

  it('warns about the Developer plan quota', () => {
    applyNotification(parseNotification(maxQuotaExceeded));

    expect(useSessionStore.getState().notice).toMatch(
      /^Превышен лимит тарифа «Разработчик»\. Monthly quota has been exceeded/,
    );
  });

  it('leaves the stores alone for ignored notifications', () => {
    const chats = useChatStore.getState();

    applyNotification({ kind: 'ignored', reason: 'test' });

    expect(useChatStore.getState()).toBe(chats);
    expect(useSessionStore.getState().notice).toBeNull();
  });
});
