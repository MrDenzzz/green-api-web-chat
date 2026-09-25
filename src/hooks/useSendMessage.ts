import { useCallback, useState } from 'react';
import type { GreenApiClient } from '../api/client';
import { describeError } from '../api/errors';
import type { OutgoingMessage } from '../store/chatReducer';
import { useChatStore } from '../store/chatStore';

export interface MessageSender {
  send: (chatId: string, text: string) => void;
  retry: (message: OutgoingMessage) => void;
}

const createLocalId = () =>
  `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Sends text messages with SendMessage. The message shows up at once as "pending";
 * messages to one chat go out one at a time, so the recipient gets them in order.
 */
export function useSendMessage(client: GreenApiClient): MessageSender {
  const dispatch = useChatStore((state) => state.dispatch);
  const [queues] = useState(() => new Map<string, Promise<void>>());

  const deliver = useCallback(
    (chatId: string, localId: string, text: string) => {
      const previous = queues.get(chatId) ?? Promise.resolve();
      const next = previous.then(async () => {
        try {
          const idMessage = await client.sendMessage(chatId, text);
          dispatch({ type: 'message/sent', chatId, localId, idMessage });
        } catch (error) {
          dispatch({ type: 'message/failed', chatId, localId, error: describeError(error) });
        }
      });
      queues.set(chatId, next);
    },
    [client, dispatch, queues],
  );

  const send = useCallback(
    (chatId: string, text: string) => {
      const localId = createLocalId();
      dispatch({ type: 'message/queued', chatId, localId, text, timestamp: Date.now() });
      deliver(chatId, localId, text);
    },
    [deliver, dispatch],
  );

  const retry = useCallback(
    (message: OutgoingMessage) => {
      if (message.content.type !== 'text') return;
      const { chatId, id } = message;
      dispatch({ type: 'message/retried', chatId, localId: id, timestamp: Date.now() });
      deliver(chatId, id, message.content.text);
    },
    [deliver, dispatch],
  );

  return { send, retry };
}
