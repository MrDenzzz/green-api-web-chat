/*
 * Notification bodies copied verbatim from the GREEN-API docs:
 * MAX      https://green-api.com/v3/docs/api/receiving/notifications-format/
 * Telegram https://green-api.com/telegram/docs/api/receiving/notifications-format/
 */

// MAX: incoming-message/TextMessage (personal chat)
export const maxIncomingText = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Я использую GREEN-API для отправки этого сообщения!' },
  },
};

// MAX: incoming-message/TextMessage (group chat)
export const maxIncomingGroupText = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '-69876543210123',
    chatName: 'Название группы',
    chatType: 'group',
    sender: '10000000',
    senderName: 'Ходабрыш',
    senderType: 'user',
    senderContactName: '',
    senderPhoneNumber: 0,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: {
      textMessage: 'Я использую GREEN-API для отправки этого сообщения!',
      forwardingScore: 0,
      isForwarded: false,
    },
  },
};

// MAX: incoming-message/ExtendedTextMessage
export const maxIncomingExtendedText = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'extendedTextMessage',
    extendedTextMessageData: {
      text: 'Я использую GREEN-API для отправки этого сообщения! Документация на сайте https://green-api.com/',
      description:
        'Сервис GREEN-API — интеграция с MAX на любом языке программирования: PHP, JavaScript, 1С, Python, Java, C#, VBA.',
      title: 'Доступный MAX API для отправки сообщений | Сервис GREEN-API',
      forwardingScore: 0,
      isForwarded: false,
    },
  },
};

// MAX: incoming-message/QuotedMessage
export const maxIncomingQuoted = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1588091580,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'quotedMessage',
    extendedTextMessageData: {
      text: 'Цитируем это',
      stanzaId: '116413118178426437',
      participant: '10000000',
    },
  },
};

// MAX: incoming-message/ImageMessage
export const maxIncomingImage = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'imageMessage',
    fileMessageData: {
      downloadUrl:
        'https://sw-media-3100.storage.yandexcloud.net/3100000000/15697d2c-397c-4fd0-8e1a-8be95f753aae.webp',
      caption: '',
      fileName: '15697d2c-397c-4fd0-8e1a-8be95f753aae.webp',
      jpegThumbnail:
        'UklGRjoAAABXRUJQVlA4IC4AAACwAwCdASoyADIAPm0skkYkIqGhLggAgA2JaQAAZAEm0xUUDzF5wAD++yGAAAAA',
      isAnimated: false,
      mimeType: 'image/webp',
      forwardingScore: 0,
      isForwarded: false,
    },
  },
};

// MAX: incoming-message/StickerMessage
export const maxIncomingSticker = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1705895506,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'stickerMessage',
    fileMessageData: {
      downloadUrl:
        'https://media-3100.storage.yandexcloud.net/3100000000/07dde0a-01dc-4dd9-8afb-707cbf610943.png',
      caption: '',
      fileName: '07dde0a-01dc-4dd9-8afb-707cbf610943.png',
      jpegThumbnail: '',
      isAnimated: true,
      mimeType: 'image/png',
      forwardingScore: 0,
      isForwarded: false,
    },
  },
};

// MAX: outgoing-message/TextMessage (sent from the phone)
export const maxOutgoingText = {
  typeWebhook: 'outgoingMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Я использую GREEN-API для отправки этого сообщения!' },
  },
};

// MAX: outgoing-message/OutgoingApiMessage (the docs show an empty messageData)
export const maxOutgoingApiMessage = {
  typeWebhook: 'outgoingAPIMessageReceived',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {},
};

// MAX: statuses/OutgoingMessageStatus
export const maxStatusDelivered = {
  typeWebhook: 'outgoingMessageStatus',
  chatId: '10000000',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1755591519,
  idMessage: '115054445839974415',
  status: 'delivered',
};

export const maxStatusRead = {
  typeWebhook: 'outgoingMessageStatus',
  chatId: '10000000',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1755591519,
  idMessage: '115054445839974415',
  status: 'read',
};

// MAX: service/StateInstanceChanged
export const maxStateInstanceChanged = {
  typeWebhook: 'stateInstanceChanged',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1755589527,
  stateInstance: 'authorized',
};

// MAX: service/QuotaExceeded
export const maxQuotaExceeded = {
  typeWebhook: 'quotaExceeded',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  quotaData: {
    method: 'correspondents',
    used: 3,
    total: 3,
    status: 'CORRESPONDENTS_QUOTA_EXCEEDED',
    description:
      'Monthly quota has been exceeded. You can only send or receive messages from following chats: 10000000, 10000001, 10000002. Please go to your personal account and change the tariff to business https://console.green-api.com',
  },
};

// Telegram: incoming-message/TextMessage (personal chat)
export const telegramIncomingText = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    sender: '10000000',
    chatName: 'Василиса Премудрая',
    senderName: 'Василиса Премудрая',
    senderType: 'user',
    senderContactName: 'Василиса Премудрая',
    senderPhoneNumber: 79998887766,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: {
      textMessage: 'Я использую GREEN-API для отправки этого сообщения!',
      forwardingScore: 0,
      isForwarded: false,
    },
  },
};

// Telegram: incoming-message/TextMessage (supergroup)
export const telegramIncomingSupergroupText = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '-10000000000000',
    chatType: 'supergroup',
    sender: '10000000',
    chatName: 'Тридесятое царство',
    senderName: 'Василиса',
    senderType: 'user',
    senderContactName: '',
    senderPhoneNumber: 0,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: {
      textMessage: 'Я использую GREEN-API для отправки этого сообщения!',
      forwardingScore: 1,
      isForwarded: true,
    },
  },
};

// Telegram: incoming-message/ExtendedTextMessage
export const telegramIncomingExtendedText = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' },
  timestamp: 1770351383,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    sender: '10000000',
    chatName: 'Василиса',
    senderName: 'Василиса Премудрая',
    senderType: 'user',
    senderContactName: 'Василиса Премудрая',
    senderPhoneNumber: 79998887766,
  },
  messageData: {
    typeMessage: 'extendedTextMessage',
    extendedTextMessageData: {
      text: 'Я использую GREEN-API для отправки этого сообщения! Документация на сайте https://green-api.com/',
      description: 'GREEN-API docs shows how you can develop the Telegram Bot',
      title: 'How to develop Telegram Bot',
      jpegThumbnail:
        'UklGRjoAAABXRUJQVlA4IC4AAACwAwCdASoyADIAPm0skkYkIqGhLggAgA2JaQAAZAEm0xUUDzF5wAD++yGAAAAA',
    },
  },
};

// Telegram: outgoing-message/OutgoingApiMessage (group chat; senderPhoneNumber is our own number)
export const telegramOutgoingApiGroupMessage = {
  typeWebhook: 'outgoingAPIMessageReceived',
  instanceData: { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' },
  timestamp: 1763115112,
  idMessage: '1763468266381',
  senderData: {
    chatId: '-10000000000000',
    chatType: 'supergroup',
    sender: '10000000',
    chatName: 'Тридесятое царство',
    senderName: 'Василиса',
    senderType: 'user',
    senderContactName: '',
    senderPhoneNumber: 79876543210,
  },
  messageData: {},
};

// Telegram: statuses/OutgoingMessageStatus
export const telegramStatusDelivered = {
  typeWebhook: 'outgoingMessageStatus',
  chatId: '10000000',
  instanceData: { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' },
  timestamp: 1755591519,
  idMessage: '115054445839974415',
  status: 'delivered',
};
