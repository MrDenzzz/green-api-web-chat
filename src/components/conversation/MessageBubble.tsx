import { formatTime } from '../../lib/formatTime';
import type { ChatMessage, OutgoingMessage } from '../../store/chatReducer';
import { UNSUPPORTED_MESSAGE_TEXT } from '../../store/selectors';
import styles from './MessageBubble.module.css';
import { MessageStatus } from './MessageStatus';

interface MessageBubbleProps {
  message: ChatMessage;
  /** In groups, incoming messages are signed with the author's name. */
  showSender: boolean;
  onRetry: (message: OutgoingMessage) => void;
}

export function MessageBubble({ message, showSender, onRetry }: MessageBubbleProps) {
  const outgoing = message.direction === 'outgoing';
  const sender = message.direction === 'incoming' && showSender ? message.senderName : undefined;

  return (
    <li className={outgoing ? styles.outgoing : styles.incoming}>
      <div className={styles.bubble}>
        {sender && <p className={styles.sender}>{sender}</p>}
        {message.content.type === 'text' ? (
          <p className={styles.text}>{message.content.text}</p>
        ) : (
          <p className={styles.unsupported} title={message.content.typeMessage}>
            {UNSUPPORTED_MESSAGE_TEXT}
          </p>
        )}
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {outgoing && <MessageStatus status={message.status} />}
        </span>
      </div>
      {outgoing && message.status === 'failed' && (
        <p className={styles.failure}>
          {message.error ?? 'Сообщение не отправлено'}
          {message.content.type === 'text' && (
            <button
              type="button"
              className={styles.retry}
              onClick={() => {
                onRetry(message);
              }}
            >
              Повторить
            </button>
          )}
        </p>
      )}
    </li>
  );
}
