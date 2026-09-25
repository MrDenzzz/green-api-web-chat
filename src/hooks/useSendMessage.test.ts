import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GreenApiClient } from '../api/client';
import { GreenApiError } from '../api/errors';
import { useChatStore } from '../store/chatStore';
import { createFakeClient } from '../test/fakeClient';
import { useSendMessage } from './useSendMessage';

const CHAT_ID = '10000000';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

const messages = () => useChatStore.getState().messages[CHAT_ID] ?? [];

function renderSender(sendMessage: GreenApiClient['sendMessage']) {
  const client = createFakeClient({ sendMessage });
  return renderHook(() => useSendMessage(client)).result;
}

describe('useSendMessage', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useChatStore.getState().dispatch({
      type: 'chat/added',
      chat: { chatId: CHAT_ID },
      timestamp: 1000,
    });
  });

  it('shows a message at once and confirms it with idMessage', async () => {
    const response = deferred<string>();
    const sender = renderSender(() => response.promise);

    act(() => {
      sender.current.send(CHAT_ID, 'Привет!');
    });
    expect(messages()).toMatchObject([
      { status: 'pending', content: { type: 'text', text: 'Привет!' } },
    ]);

    response.resolve('id-1');
    await vi.waitFor(() => {
      expect(messages()).toMatchObject([{ id: 'id-1', status: 'sent' }]);
    });
  });

  it('sends messages to one chat one at a time, in order', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const sendMessage = vi
      .fn<GreenApiClient['sendMessage']>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const sender = renderSender(sendMessage);

    act(() => {
      sender.current.send(CHAT_ID, 'Первое');
      sender.current.send(CHAT_ID, 'Второе');
    });
    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });
    expect(sendMessage).toHaveBeenLastCalledWith(CHAT_ID, 'Первое');

    first.resolve('id-1');
    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(2);
    });
    expect(sendMessage).toHaveBeenLastCalledWith(CHAT_ID, 'Второе');
  });

  it('explains a failure and sends the message again on retry', async () => {
    const sendMessage = vi
      .fn<GreenApiClient['sendMessage']>()
      .mockRejectedValueOnce(new GreenApiError({ reason: 'network', method: 'sendMessage' }))
      .mockResolvedValueOnce('id-1');
    const sender = renderSender(sendMessage);

    act(() => {
      sender.current.send(CHAT_ID, 'Привет!');
    });
    await vi.waitFor(() => {
      expect(messages()[0]).toMatchObject({
        status: 'failed',
        error: 'Нет связи с GREEN-API. Проверьте интернет и apiUrl.',
      });
    });

    const failed = messages()[0];
    if (failed?.direction !== 'outgoing') throw new Error('Expected an outgoing message');
    act(() => {
      sender.current.retry(failed);
    });

    await vi.waitFor(() => {
      expect(messages()).toMatchObject([{ id: 'id-1', status: 'sent', error: undefined }]);
    });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
