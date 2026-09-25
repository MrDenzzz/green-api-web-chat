import { useState } from 'react';
import type { GreenApiClient } from '../../api/client';
import type { MessengerProfile } from '../../api/messengers';
import type { NotificationPolling } from '../../hooks/useNotificationPolling';
import { cx } from '../../lib/cx';
import { formatPhone } from '../../lib/phone';
import { useSessionStore } from '../../store/session';
import { IconButton } from '../ui/IconButton';
import { ChatList } from './ChatList';
import { ConnectionStatus } from './ConnectionStatus';
import { NewChatForm } from './NewChatForm';
import styles from './Sidebar.module.css';

interface SidebarProps {
  className?: string;
  client: GreenApiClient;
  messenger: MessengerProfile;
  /** Own account id, e.g. "79991234567@c.us". */
  wid: string | undefined;
  polling: NotificationPolling;
}

export function Sidebar({ className, client, messenger, wid, polling }: SidebarProps) {
  const signOut = useSessionStore((state) => state.signOut);
  const [composing, setComposing] = useState(false);
  const startChat = () => {
    setComposing(true);
  };

  const handleSignOut = () => {
    if (window.confirm('Выйти? Чаты и данные для входа будут удалены из этого браузера.')) {
      signOut();
    }
  };

  const account = wid
    ? `${messenger.name} · ${formatPhone(wid.replace(/@.*$/, ''))}`
    : messenger.name;

  return (
    <nav className={cx(styles.sidebar, className)} aria-label="Чаты">
      {composing ? (
        <NewChatForm
          client={client}
          messenger={messenger}
          onClose={() => {
            setComposing(false);
          }}
        />
      ) : (
        <>
          <header className={styles.header}>
            <div className={styles.heading}>
              <h1 className={styles.title}>Чаты</h1>
              <p className={styles.account}>{account}</p>
            </div>
            <IconButton icon="compose" label="Новый чат" onClick={startChat} />
            <IconButton icon="logout" label="Выйти" onClick={handleSignOut} />
          </header>
          <ConnectionStatus polling={polling} />
          <ChatList onNewChat={startChat} />
        </>
      )}
    </nav>
  );
}
