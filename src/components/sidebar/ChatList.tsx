import { useMemo } from 'react';
import { useNow } from '../../hooks/useNow';
import { useChatStore } from '../../store/chatStore';
import { buildChatList } from '../../store/selectors';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import styles from './ChatList.module.css';
import { ChatListItem } from './ChatListItem';

export function ChatList({ onNewChat }: { onNewChat: () => void }) {
  const chats = useChatStore((state) => state.chats);
  const messages = useChatStore((state) => state.messages);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const now = useNow();
  const entries = useMemo(() => buildChatList(chats, messages), [chats, messages]);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="chat"
        title="Чатов пока нет"
        action={<Button onClick={onNewChat}>Создать чат</Button>}
      >
        Начните переписку по номеру телефона. Сообщения от новых собеседников тоже появятся здесь.
      </EmptyState>
    );
  }

  return (
    // role="list" keeps list semantics in Safari, which drops them for list-style: none.
    <ul className={styles.list} role="list">
      {entries.map((entry) => (
        <li key={entry.chat.chatId}>
          <ChatListItem
            entry={entry}
            active={entry.chat.chatId === activeChatId}
            now={now}
            onSelect={setActiveChat}
          />
        </li>
      ))}
    </ul>
  );
}
