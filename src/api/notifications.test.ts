import { describe, expect, it } from 'vitest';
import {
  maxIncomingExtendedText,
  maxIncomingGroupText,
  maxIncomingImage,
  maxIncomingQuoted,
  maxIncomingSticker,
  maxIncomingText,
  maxOutgoingApiMessage,
  maxOutgoingText,
  maxQuotaExceeded,
  maxStateInstanceChanged,
  maxStatusDelivered,
  maxStatusRead,
  telegramIncomingExtendedText,
  telegramIncomingSupergroupText,
  telegramIncomingText,
  telegramOutgoingApiGroupMessage,
  telegramStatusDelivered,
} from '../test/fixtures/notifications';
import { parseNotification } from './notifications';

const DOCS_TEXT = 'Я использую GREEN-API для отправки этого сообщения!';

const withText = (text: string) => ({
  typeMessage: 'textMessage',
  textMessageData: { textMessage: text },
});

describe('parseNotification', () => {
  describe('incoming messages', () => {
    it('reads a personal MAX text message', () => {
      expect(parseNotification(maxIncomingText)).toEqual({
        kind: 'message',
        direction: 'incoming',
        idMessage: '1763115112345',
        timestamp: 1763115112000,
        chat: {
          chatId: '10000000',
          name: 'Ходабрыш Пробешёлов',
          phone: '79876543210',
          isGroup: false,
        },
        senderName: undefined,
        content: { type: 'text', text: DOCS_TEXT },
      });
    });

    it('reads a personal Telegram text message', () => {
      expect(parseNotification(telegramIncomingText)).toMatchObject({
        kind: 'message',
        direction: 'incoming',
        chat: { chatId: '10000000', name: 'Василиса Премудрая', phone: '79998887766' },
        content: { type: 'text', text: DOCS_TEXT },
      });
    });

    it.each([
      ['MAX group', maxIncomingGroupText, 'Название группы', 'Ходабрыш'],
      ['Telegram supergroup', telegramIncomingSupergroupText, 'Тридесятое царство', 'Василиса'],
    ])('keeps the author of a %s message', (_, body, chatName, author) => {
      expect(parseNotification(body)).toMatchObject({
        chat: { name: chatName, phone: undefined, isGroup: true },
        senderName: author,
        content: { type: 'text', text: DOCS_TEXT },
      });
    });

    it.each([
      ['MAX', maxIncomingExtendedText],
      ['Telegram', telegramIncomingExtendedText],
    ])('reads the text of a %s message with a link', (_, body) => {
      expect(parseNotification(body)).toMatchObject({
        content: { type: 'text', text: body.messageData.extendedTextMessageData.text },
      });
    });

    it('shows the reply text of a quoted message', () => {
      expect(parseNotification(maxIncomingQuoted)).toMatchObject({
        content: { type: 'text', text: 'Цитируем это' },
      });
    });

    it.each([
      ['imageMessage', maxIncomingImage],
      ['stickerMessage', maxIncomingSticker],
    ])('turns %s into an unsupported placeholder', (typeMessage, body) => {
      expect(parseNotification(body)).toMatchObject({
        kind: 'message',
        content: { type: 'unsupported', typeMessage },
      });
    });

    it.each(['reactionMessage', 'editedMessage', 'deletedMessage'])('ignores %s', (typeMessage) => {
      const body = { ...maxIncomingText, messageData: { typeMessage } };

      expect(parseNotification(body)).toMatchObject({ kind: 'ignored' });
    });

    it('ignores a text message without text', () => {
      const body = { ...maxIncomingText, messageData: { typeMessage: 'textMessage' } };

      expect(parseNotification(body)).toMatchObject({ kind: 'ignored' });
    });
  });

  describe('outgoing messages', () => {
    it('reads a message sent from the phone', () => {
      expect(parseNotification(maxOutgoingText)).toEqual({
        kind: 'message',
        direction: 'outgoing',
        idMessage: '1763115112345',
        timestamp: 1763115112000,
        chat: { chatId: '10000000', name: 'Ходабрыш Пробешёлов', phone: undefined, isGroup: false },
        senderName: undefined,
        content: { type: 'text', text: DOCS_TEXT },
      });
    });

    it('reads a message sent through the API', () => {
      const body = { ...maxOutgoingApiMessage, messageData: withText('Привет!') };

      expect(parseNotification(body)).toMatchObject({
        kind: 'message',
        direction: 'outgoing',
        content: { type: 'text', text: 'Привет!' },
      });
    });

    it('does not mistake our own phone number for the contact one', () => {
      const body = { ...telegramOutgoingApiGroupMessage, messageData: withText('Всем привет') };

      expect(parseNotification(body)).toMatchObject({
        direction: 'outgoing',
        chat: { name: 'Тридесятое царство', phone: undefined, isGroup: true },
        senderName: undefined,
      });
    });

    it('ignores an API message without message data, as in the docs example', () => {
      expect(parseNotification(maxOutgoingApiMessage)).toMatchObject({ kind: 'ignored' });
    });
  });

  describe('delivery statuses', () => {
    it.each([
      ['MAX delivered', maxStatusDelivered, 'delivered'],
      ['MAX read', maxStatusRead, 'read'],
      ['Telegram delivered', telegramStatusDelivered, 'delivered'],
    ])('reads %s', (_, body, status) => {
      expect(parseNotification(body)).toEqual({
        kind: 'status',
        idMessage: '115054445839974415',
        chatId: '10000000',
        timestamp: 1755591519000,
        status,
        error: undefined,
      });
    });

    it('accepts "sent" although the docs do not list it', () => {
      expect(parseNotification({ ...maxStatusDelivered, status: 'sent' })).toMatchObject({
        kind: 'status',
        status: 'sent',
      });
    });

    it.each([
      ['failed', 'Не удалось доставить сообщение'],
      ['noAccount', 'У получателя нет аккаунта в мессенджере'],
      ['notInGroup', 'Вы не участник этой группы'],
    ])('maps %s to a failure with a reason', (status, error) => {
      expect(parseNotification({ ...maxStatusDelivered, status })).toMatchObject({
        kind: 'status',
        status: 'failed',
        error,
      });
    });

    it('prefers the server description of a failure', () => {
      const body = {
        ...telegramStatusDelivered,
        status: 'failed',
        description: 'chatId unresolvable on this session',
      };

      expect(parseNotification(body)).toMatchObject({
        status: 'failed',
        error: 'chatId unresolvable on this session',
      });
    });

    it('ignores an unknown status', () => {
      expect(parseNotification({ ...maxStatusDelivered, status: 'yellowCard' })).toMatchObject({
        kind: 'ignored',
      });
    });
  });

  describe('service notifications', () => {
    it('reads an instance state change', () => {
      expect(parseNotification(maxStateInstanceChanged)).toEqual({
        kind: 'instance-state',
        state: 'authorized',
      });
    });

    it('reads a quota warning', () => {
      expect(parseNotification(maxQuotaExceeded)).toEqual({
        kind: 'quota-exceeded',
        description: maxQuotaExceeded.quotaData.description,
      });
    });
  });

  describe('robustness', () => {
    it.each([null, undefined, 'text', 42, [], {}, { typeWebhook: 5 }])(
      'ignores %j as not a notification',
      (body) => {
        expect(parseNotification(body)).toMatchObject({ kind: 'ignored' });
      },
    );

    it('ignores notification types the app does not handle', () => {
      expect(parseNotification({ typeWebhook: 'incomingCall' })).toMatchObject({
        kind: 'ignored',
      });
    });

    it('ignores a message without idMessage', () => {
      const body = { ...maxIncomingText, idMessage: undefined };

      expect(parseNotification(body)).toMatchObject({ kind: 'ignored' });
    });

    it('keeps the message when descriptive fields are malformed', () => {
      const body = {
        ...maxIncomingText,
        senderData: { ...maxIncomingText.senderData, chatName: 42, senderPhoneNumber: 'hidden' },
      };

      expect(parseNotification(body)).toMatchObject({
        kind: 'message',
        chat: { name: 'Ходабрыш Пробешёлов', phone: undefined },
        content: { type: 'text', text: DOCS_TEXT },
      });
    });
  });
});
