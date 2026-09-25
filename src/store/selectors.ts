import { formatPhone } from '../lib/phone';
import type { Chat, ChatMessage } from './chatReducer';

export const UNSUPPORTED_MESSAGE_TEXT = 'Сообщение этого типа не поддерживается';

/** What to call a chat: the contact name, then the @username, then the phone number. */
export function chatTitle(chat: Chat): string {
  return chat.name ?? chat.username ?? (chat.phone ? formatPhone(chat.phone) : chat.chatId);
}

/** Second line of the chat header: what else identifies the chat besides its title. */
export function chatSubtitle(chat: Chat): string | undefined {
  if (chat.isGroup) return 'Группа';
  if (chat.name === undefined) return undefined;
  return chat.phone ? formatPhone(chat.phone) : chat.username;
}

/** One line for the chat list; group messages start with the author. */
export function messagePreview(message: ChatMessage): string {
  const text = message.content.type === 'text' ? message.content.text : UNSUPPORTED_MESSAGE_TEXT;
  const author = message.direction === 'incoming' ? message.senderName : undefined;
  return author ? `${author}: ${text}` : text;
}

export interface ChatListEntry {
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
): ChatListEntry[] {
  return Object.values(chats)
    .map((chat) => ({ chat, lastMessage: messages[chat.chatId]?.at(-1) }))
    .sort((a, b) => lastActivity(b) - lastActivity(a));
}

function lastActivity({ chat, lastMessage }: ChatListEntry): number {
  return lastMessage?.timestamp ?? chat.createdAt;
}
