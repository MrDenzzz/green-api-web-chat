import { useMemo } from 'react';
import {
  createGreenApiClient,
  type GreenApiClient,
  type GreenApiCredentials,
} from '../../api/client';
import { MESSENGERS } from '../../api/messengers';
import { useNotificationPolling } from '../../hooks/useNotificationPolling';
import { useSendMessage } from '../../hooks/useSendMessage';
import { applyNotification } from '../../store/applyNotification';
import { useChatStore } from '../../store/chatStore';
import type { Session } from '../../store/session';
import { Conversation } from '../conversation/Conversation';
import { NotificationsBanner } from '../settings/NotificationsBanner';
import { Sidebar } from '../sidebar/Sidebar';
import { EmptyState } from '../ui/EmptyState';
import styles from './MessengerScreen.module.css';

interface MessengerScreenProps {
  session: Session;
  /** Injected in tests. */
  createClient?: (credentials: GreenApiCredentials) => GreenApiClient;
}

/** The signed-in app: chat list on the left, the open chat on the right. */
export function MessengerScreen({
  session,
  createClient = createGreenApiClient,
}: MessengerScreenProps) {
  const client = useMemo(
    () => createClient(session.credentials),
    [createClient, session.credentials],
  );
  const polling = useNotificationPolling(client, applyNotification);
  const sender = useSendMessage(client);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const messenger = MESSENGERS[session.messengerId];

  return (
    <div
      className={styles.screen}
      data-messenger={messenger.id}
      // On narrow screens only one pane is visible at a time.
      data-view={activeChatId ? 'chat' : 'list'}
    >
      <NotificationsBanner client={client} onSaved={polling.restart} />
      <div className={styles.panes}>
        <Sidebar
          className={styles.sidebar}
          client={client}
          messenger={messenger}
          wid={session.wid}
          polling={polling}
        />
        <main className={styles.main}>
          {activeChatId ? (
            <Conversation
              key={activeChatId}
              chatId={activeChatId}
              messenger={messenger}
              sender={sender}
            />
          ) : (
            <EmptyState icon="chat" title="Выберите чат">
              Или создайте новый по номеру телефона.
            </EmptyState>
          )}
        </main>
      </div>
    </div>
  );
}
