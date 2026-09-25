import { describe, expect, it, vi } from 'vitest';
import { checkAccountFound, checkAccountMissing, maxSettings } from '../test/fixtures/responses';
import { createGreenApiClient, type GreenApiClientOptions } from './client';
import { GreenApiError } from './errors';

const TOKEN = 'd75b3a66374942c5b3c019c698abc2067e151558acbd412345';
const BASE = `https://3100.api.green-api.com/waInstance3100000001`;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function setup(
  responses: (Response | Error)[],
  options: Omit<GreenApiClientOptions, 'fetch'> = {},
) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  const client = createGreenApiClient(
    // A trailing slash, as people often paste it from the console.
    {
      apiUrl: 'https://3100.api.green-api.com/',
      idInstance: '3100000001',
      apiTokenInstance: TOKEN,
    },
    { ...options, fetch: fetchMock },
  );
  return { client, fetchMock };
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) {
  const call = fetchMock.mock.lastCall;
  if (!call) throw new Error('fetch was not called');
  const [input, init] = call;
  return {
    url: input instanceof Request ? input.url : input.toString(),
    method: init?.method,
    contentType: new Headers(init?.headers).get('Content-Type'),
    body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
  };
}

async function captureError(promise: Promise<unknown>): Promise<GreenApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof GreenApiError) return error;
    throw error;
  }
  throw new Error('Expected the request to fail');
}

describe('createGreenApiClient', () => {
  describe('requests', () => {
    it('reads the instance state', async () => {
      const { client, fetchMock } = setup([json({ stateInstance: 'authorized' })]);

      await expect(client.getStateInstance()).resolves.toBe('authorized');
      expect(lastRequest(fetchMock)).toMatchObject({
        url: `${BASE}/getStateInstance/${TOKEN}`,
        method: 'GET',
        body: undefined,
      });
    });

    it('sends a text message as JSON and returns its idMessage', async () => {
      const { client, fetchMock } = setup([json({ idMessage: '1763115112345' })]);

      await expect(client.sendMessage('10000000', 'Привет!')).resolves.toBe('1763115112345');
      expect(lastRequest(fetchMock)).toEqual({
        url: `${BASE}/sendMessage/${TOKEN}`,
        method: 'POST',
        contentType: 'application/json',
        body: { chatId: '10000000', message: 'Привет!' },
      });
    });

    it('turns "yes"/"no" settings into booleans', async () => {
      const { client } = setup([json({ ...maxSettings, outgoingWebhook: 'no' })]);

      await expect(client.getSettings()).resolves.toEqual({
        wid: '79991234567@c.us',
        typeInstance: 'v3',
        webhookUrl: '',
        incomingWebhook: true,
        outgoingWebhook: false,
        outgoingMessageWebhook: true,
        outgoingAPIMessageWebhook: true,
      });
    });

    it('writes only the given settings, as "yes"/"no"', async () => {
      const { client, fetchMock } = setup([json({ saveSettings: true })]);

      await expect(
        client.setSettings({ webhookUrl: '', incomingWebhook: true, outgoingWebhook: false }),
      ).resolves.toBe(true);
      expect(lastRequest(fetchMock)).toMatchObject({
        url: `${BASE}/setSettings/${TOKEN}`,
        method: 'POST',
        body: { webhookUrl: '', incomingWebhook: 'yes', outgoingWebhook: 'no' },
      });
    });

    it('resolves a phone number to a chatId', async () => {
      const { client, fetchMock } = setup([json(checkAccountFound), json(checkAccountMissing)]);

      await expect(client.checkAccount({ phoneNumber: 79991234567 })).resolves.toEqual({
        exists: true,
        chatId: '10000000',
      });
      expect(lastRequest(fetchMock)).toMatchObject({
        url: `${BASE}/checkAccount/${TOKEN}`,
        body: { phoneNumber: 79991234567 },
      });
      await expect(client.checkAccount({ phoneNumber: 79990000000 })).resolves.toEqual({
        exists: false,
      });
    });

    it('long-polls with receiveTimeout and returns the receipt', async () => {
      const notification = { receiptId: 1234567, body: { typeWebhook: 'incomingMessageReceived' } };
      const { client, fetchMock } = setup([json(notification)]);

      await expect(client.receiveNotification(20)).resolves.toEqual(notification);
      expect(lastRequest(fetchMock)).toMatchObject({
        url: `${BASE}/receiveNotification/${TOKEN}?receiveTimeout=20`,
        method: 'GET',
      });
    });

    it.each([
      ['an empty body', ''],
      ['null', 'null'],
    ])('treats %s from receiveNotification as an empty queue', async (_, body) => {
      const { client } = setup([new Response(body, { status: 200 })]);

      await expect(client.receiveNotification(20)).resolves.toBeNull();
    });

    it('deletes a notification by receiptId', async () => {
      const { client, fetchMock } = setup([json({ result: true, reason: '' })]);

      await expect(client.deleteNotification(1234567)).resolves.toBe(true);
      expect(lastRequest(fetchMock)).toMatchObject({
        url: `${BASE}/deleteNotification/${TOKEN}/1234567`,
        method: 'DELETE',
      });
    });
  });

  describe('errors', () => {
    it.each([
      [401, '', 'unauthorized'],
      [403, '', 'forbidden'],
      [403, 'Your account is suspended', 'account-suspended'],
      [404, '', 'not-found'],
      [429, '', 'rate-limited'],
      [466, '{"message":"Monthly quota has been exceeded"}', 'quota-exceeded'],
      [400, 'Message cannot be received because custom webhook url is set', 'webhook-url-set'],
      [400, 'instance in starting process try later', 'instance-starting'],
      [400, 'Instance account is expired. Renew your instance', 'instance-expired'],
      [400, 'Validation failed', 'bad-request'],
      [502, 'Bad Gateway', 'server'],
    ])('classifies HTTP %i "%s" as %s', async (status, body, reason) => {
      const { client } = setup([new Response(body, { status })]);

      const error = await captureError(client.getStateInstance());

      expect(error).toMatchObject({ reason, status, method: 'getStateInstance' });
    });

    it('extracts the message from a JSON error body', async () => {
      const body = JSON.stringify({
        code: 400,
        message: "Validation failed. 'chatId' is required",
      });
      const { client } = setup([new Response(body, { status: 400 })]);

      const error = await captureError(client.sendMessage('', 'Привет!'));

      expect(error.details).toBe("Validation failed. 'chatId' is required");
    });

    it('reports a network failure', async () => {
      const { client } = setup([new TypeError('Failed to fetch')]);

      const error = await captureError(client.getSettings());

      expect(error.reason).toBe('network');
    });

    it.each([
      ['malformed JSON', '{"stateInstance":'],
      ['an unexpected shape', '{"state":"authorized"}'],
    ])('rejects %s as an invalid response', async (_, body) => {
      const { client } = setup([new Response(body, { status: 200 })]);

      const error = await captureError(client.getStateInstance());

      expect(error.reason).toBe('invalid-response');
    });

    it('reports an aborted request', async () => {
      const { client } = setup([new DOMException('Aborted', 'AbortError')]);
      const controller = new AbortController();
      controller.abort();

      const error = await captureError(client.getStateInstance(controller.signal));

      expect(error.reason).toBe('aborted');
    });

    it('gives up after the timeout', async () => {
      const fetchMock = vi.fn<typeof fetch>(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );
      const client = createGreenApiClient(
        { apiUrl: 'https://api.green-api.com', idInstance: '1', apiTokenInstance: TOKEN },
        { fetch: fetchMock, timeoutMs: 20 },
      );

      const error = await captureError(client.getStateInstance());

      expect(error.reason).toBe('timeout');
    });

    it('never exposes the token', async () => {
      const { client } = setup([new Response(`Bad token ${TOKEN}`, { status: 400 })]);

      const error = await captureError(client.getStateInstance());

      expect(error.message).not.toContain(TOKEN);
      expect(error.details).toBe('Bad token ***');
    });
  });
});
