import type { MessengerProfile } from '../../api/messengers';
import type { MessageSender } from '../../hooks/useSendMessage';
import type { ChatMessage } from '../../store/chatReducer';
import { useChatStore } from '../../store/chatStore';
import { chatSubtitle, chatTitle } from '../../store/selectors';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { IconButton } from '../ui/IconButton';
import { Composer } from './Composer';
import styles from './Conversation.module.css';
import { MessageList } from './MessageList';

interface ConversationProps {
  chatId: string;
  messenger: MessengerProfile;
  sender: MessageSender;
}

const NO_MESSAGES: ChatMessage[] = [];

export function Conversation({ chatId, messenger, sender }: ConversationProps) {
  const chat = useChatStore((state) => state.chats[chatId]);
  const messages = useChatStore((state) => state.messages[chatId]) ?? NO_MESSAGES;
  const setActiveChat = useChatStore((state) => state.setActiveChat);

  if (!chat) return null;
  const title = chatTitle(chat);
  const subtitle = chatSubtitle(chat);

  return (
    <section className={styles.conversation} aria-label={title}>
      <header className={styles.header}>
        <IconButton
          className={styles.back}
          icon="back"
          label="К списку чатов"
          onClick={() => {
            setActiveChat(null);
          }}
        />
        <Avatar seed={chat.chatId} title={title} size="small" />
        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </header>

      {messages.length === 0 ? (
        <EmptyState icon="chat" title="Сообщений пока нет">
          Напишите первое сообщение. Ответ появится здесь, как только собеседник ответит в{' '}
          {messenger.name}.
        </EmptyState>
      ) : (
        <MessageList messages={messages} showSenders={chat.isGroup} onRetry={sender.retry} />
      )}

      <Composer
        maxLength={messenger.maxMessageLength}
        onSend={(text) => {
          sender.send(chatId, text);
        }}
      />
    </section>
  );
}
