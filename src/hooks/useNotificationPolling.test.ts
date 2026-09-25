import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReceivedNotification } from '../api/client';
import { GreenApiError } from '../api/errors';
import { maxIncomingText } from '../test/fixtures/notifications';
import { createFakeClient } from '../test/fakeClient';
import { useNotificationPolling } from './useNotificationPolling';

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** A server that answers the first request and holds every later one until it is aborted. */
function createServer(firstAnswer: ReceivedNotification | GreenApiError) {
  const signals: AbortSignal[] = [];
  let calls = 0;

  const receiveNotification = vi.fn((_timeoutSec: number, signal?: AbortSignal) => {
    calls += 1;
    if (signal) signals.push(signal);
    if (calls === 1) {
      return firstAnswer instanceof GreenApiError
        ? Promise.reject(firstAnswer)
        : Promise.resolve(firstAnswer);
    }
    return new Promise<null>((_resolve, reject) => {
      signal?.addEventListener('abort', () => {
        reject(new GreenApiError({ reason: 'aborted', method: 'receiveNotification' }));
      });
    });
  });

  const client = createFakeClient({
    receiveNotification,
    deleteNotification: vi.fn(() => Promise.resolve(true)),
  });
  return { client, receiveNotification, signals };
}

const firstNotification: ReceivedNotification = { receiptId: 1, body: maxIncomingText };

describe('useNotificationPolling', () => {
  beforeEach(() => {
    setVisibility('visible');
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('connects and passes notifications on', async () => {
    const { client } = createServer(firstNotification);
    const onNotification = vi.fn();

    const { result } = renderHook(() => useNotificationPolling(client, onNotification));

    expect(result.current.status).toBe('connecting');
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    expect(onNotification).toHaveBeenCalledWith(expect.objectContaining({ kind: 'message' }));
  });

  it('aborts the request in flight on unmount', async () => {
    const { client, receiveNotification, signals } = createServer(firstNotification);
    const { unmount } = renderHook(() => useNotificationPolling(client, vi.fn()));
    await waitFor(() => {
      expect(receiveNotification).toHaveBeenCalledTimes(2);
    });

    unmount();

    expect(signals[1]?.aborted).toBe(true);
  });

  it('pauses while the tab is hidden and resumes when it is shown', async () => {
    const { client, receiveNotification, signals } = createServer(firstNotification);
    const { result } = renderHook(() => useNotificationPolling(client, vi.fn()));
    await waitFor(() => {
      expect(receiveNotification).toHaveBeenCalledTimes(2);
    });

    act(() => {
      setVisibility('hidden');
    });

    expect(result.current.status).toBe('paused');
    expect(signals[1]?.aborted).toBe(true);

    act(() => {
      setVisibility('visible');
    });

    expect(result.current.status).toBe('connecting');
    await waitFor(() => {
      expect(receiveNotification).toHaveBeenCalledTimes(3);
    });
  });

  it('stops on a fatal error and starts again on restart()', async () => {
    const unauthorized = new GreenApiError({
      reason: 'unauthorized',
      method: 'receiveNotification',
    });
    const { client, receiveNotification } = createServer(unauthorized);
    const { result } = renderHook(() => useNotificationPolling(client, vi.fn()));
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error).toBe(unauthorized);

    act(() => {
      result.current.restart();
    });

    expect(result.current.status).toBe('connecting');
    await waitFor(() => {
      expect(receiveNotification).toHaveBeenCalledTimes(2);
    });
  });

  it('retries at once when the browser comes back online', async () => {
    const { client, receiveNotification } = createServer(
      new GreenApiError({ reason: 'network', method: 'receiveNotification' }),
    );
    const { result } = renderHook(() => useNotificationPolling(client, vi.fn()));
    await waitFor(() => {
      expect(result.current.status).toBe('reconnecting');
    });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(receiveNotification).toHaveBeenCalledTimes(2);
    });
  });
});
