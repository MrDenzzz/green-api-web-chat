import { useLayoutEffect, useMemo, useRef } from 'react';
import { useNow } from '../../hooks/useNow';
import { formatDay, startOfDay } from '../../lib/formatTime';
import type { ChatMessage, OutgoingMessage } from '../../store/chatReducer';
import { MessageBubble } from './MessageBubble';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: ChatMessage[];
  showSenders: boolean;
  onRetry: (message: OutgoingMessage) => void;
}

/** Keeps following new messages unless the user scrolled further up than this. */
const STICK_TO_BOTTOM_PX = 80;

export function MessageList({ messages, showSenders, onRetry }: MessageListProps) {
  const now = useNow();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const followsBottom = useRef(true);
  const days = useMemo(() => groupByDay(messages), [messages]);

  const last = messages.at(-1);
  const lastId = last?.id;
  const justSent = last?.direction === 'outgoing' && last.status === 'pending';

  // Scroll down to a new message if the user was at the bottom or has just sent it.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && (followsBottom.current || justSent)) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [lastId, justSent]);

  return (
    <div
      ref={scrollerRef}
      className={styles.scroller}
      role="log"
      aria-label="Сообщения"
      tabIndex={0}
      onScroll={(event) => {
        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
        followsBottom.current = scrollHeight - scrollTop - clientHeight < STICK_TO_BOTTOM_PX;
      }}
    >
      <div className={styles.content}>
        {days.map((day) => (
          <section key={day.start} className={styles.day}>
            <h3 className={styles.dayLabel}>{formatDay(day.start, now)}</h3>
            <ol className={styles.messages} role="list">
              {day.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showSender={showSenders}
                  onRetry={onRetry}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function groupByDay(messages: ChatMessage[]): { start: number; messages: ChatMessage[] }[] {
  const days: { start: number; messages: ChatMessage[] }[] = [];
  for (const message of messages) {
    const start = startOfDay(message.timestamp);
    const current = days.at(-1);
    if (current?.start === start) current.messages.push(message);
    else days.push({ start, messages: [message] });
  }
  return days;
}
