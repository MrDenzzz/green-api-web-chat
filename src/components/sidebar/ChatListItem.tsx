import { formatChatTime } from '../../lib/formatTime';
import { chatTitle, messagePreview, type ChatListEntry } from '../../store/selectors';
import { MessageStatus } from '../conversation/MessageStatus';
import { Avatar } from '../ui/Avatar';
import styles from './ChatListItem.module.css';

interface ChatListItemProps {
  entry: ChatListEntry;
  active: boolean;
  now: number;
  onSelect: (chatId: string) => void;
}

export function ChatListItem({
  entry: { chat, lastMessage },
  active,
  now,
  onSelect,
}: ChatListItemProps) {
  const title = chatTitle(chat);
  const activity = lastMessage?.timestamp ?? chat.createdAt;

  return (
    <button
      type="button"
      className={styles.item}
      aria-current={active ? 'true' : undefined}
      onClick={() => {
        onSelect(chat.chatId);
      }}
    >
      <Avatar seed={chat.chatId} title={title} />
      <span className={styles.body}>
        <span className={styles.row}>
          <span className={styles.title}>{title}</span>
          <time className={styles.time} dateTime={new Date(activity).toISOString()}>
            {formatChatTime(activity, now)}
          </time>
        </span>
        <span className={styles.row}>
          {lastMessage?.direction === 'outgoing' && <MessageStatus status={lastMessage.status} />}
          <span className={styles.preview}>
            {lastMessage ? messagePreview(lastMessage) : 'Нет сообщений'}
          </span>
        </span>
      </span>
    </button>
  );
}
