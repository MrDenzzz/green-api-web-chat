import type { Chat, ChatMessage } from './chatReducer';

export interface ChatListItem {
  chat: Chat;
  lastMessage: ChatMessage | undefined;
}

/**
 * Chats with their last message, most recent activity first. Takes store slices rather
 * than the whole state, so components can memoize it on `chats` and `messages`.
 */
export function buildChatList(
  chats: Record<string, Chat>,
  messages: Record<string, ChatMessage[]>,
): ChatListItem[] {
  return Object.values(chats)
    .map((chat) => ({ chat, lastMessage: messages[chat.chatId]?.at(-1) }))
    .sort((a, b) => lastActivity(b) - lastActivity(a));
}

function lastActivity({ chat, lastMessage }: ChatListItem): number {
  return lastMessage?.timestamp ?? chat.createdAt;
}
