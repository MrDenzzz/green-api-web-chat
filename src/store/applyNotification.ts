import { describeInstanceState } from '../api/instanceState';
import type { ParsedNotification } from '../api/notifications';
import { useChatStore } from './chatStore';
import { useSessionStore } from './session';

/** Routes a parsed notification to the store that owns it. */
export function applyNotification(notification: ParsedNotification): void {
  switch (notification.kind) {
    case 'message':
    case 'status':
      useChatStore.getState().dispatch({ type: 'notification/received', notification });
      return;
    case 'instance-state':
      useSessionStore.getState().setNotice(describeInstanceState(notification.state));
      return;
    case 'quota-exceeded':
      useSessionStore
        .getState()
        .setNotice(`Превышен лимит тарифа «Разработчик». ${notification.description}`.trim());
      return;
    case 'ignored':
      return;
  }
}
