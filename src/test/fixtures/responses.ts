/* Method responses copied verbatim from the GREEN-API docs. */

// MAX: account/GetSettings
export const maxSettings = {
  wid: '79991234567@c.us',
  typeInstance: 'v3',
  webhookUrl: '',
  webhookUrlToken: '',
  delaySendMessagesMilliseconds: 0,
  markIncomingMessagesReaded: 'no',
  markIncomingMessagesReadedOnReply: 'no',
  outgoingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
  stateWebhook: 'yes',
  incomingWebhook: 'yes',
  editedMessageWebhook: 'no',
  deletedMessageWebhook: 'no',
  pollMessageWebhook: 'no',
  downloadUrlJpeg: 'no',
};

// Telegram: account/GetSettings
export const telegramSettings = {
  wid: '79876543210@c.us',
  typeInstance: 'telegram',
  webhookUrl: '',
  webhookUrlToken: '',
  delaySendMessagesMilliseconds: 500,
  markIncomingMessagesReaded: 'no',
  markIncomingMessagesReadedOnReply: 'no',
  outgoingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
  incomingWebhook: 'yes',
  stateWebhook: 'yes',
  keepOnlineStatus: 'no',
  editedMessageWebhook: 'yes',
  deletedMessageWebhook: 'yes',
};

// MAX: service/CheckAccount
export const checkAccountFound = { exist: true, chatId: '10000000', fromCache: true };
export const checkAccountMissing = { exist: false, chatId: '', fromCache: false };
