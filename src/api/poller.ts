import { backoffDelay } from '../lib/backoff';
import { sleep as abortableSleep } from '../lib/sleep';
import type { GreenApiClient } from './client';
import { isAbortError, isTransientError } from './errors';
import { parseNotification, type ParsedNotification } from './notifications';

export type PollerStatus = 'connected' | 'reconnecting' | 'error';

export interface PollerOptions {
  client: Pick<GreenApiClient, 'receiveNotification' | 'deleteNotification'>;
  signal: AbortSignal;
  onNotification: (notification: ParsedNotification) => void;
  /** Called when the status changes and on every failed attempt, with its error. */
  onStatusChange: (status: PollerStatus, error: unknown) => void;
  /** How long the server may hold an empty request; GREEN-API accepts 5–60 s. */
  receiveTimeoutSec?: number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

export const RECEIVE_TIMEOUT_SEC = 20;

/** An empty answer faster than this means the request was not held; wait before the next one. */
const MIN_EMPTY_POLL_MS = 1000;

/**
 * Long-polls the notification queue until `signal` aborts or an error needs the user.
 *
 * Every notification is handled first and deleted second, even if it was ignored:
 * the queue is FIFO, so an undeleted notification would block all the others.
 * If deleting fails, the notification comes again, which is harmless because
 * the store deduplicates messages by idMessage and never moves a status backwards.
 */
export async function pollNotifications({
  client,
  signal,
  onNotification,
  onStatusChange,
  receiveTimeoutSec = RECEIVE_TIMEOUT_SEC,
  sleep = abortableSleep,
  random = Math.random,
  now = Date.now,
}: PollerOptions): Promise<void> {
  const aborted = () => signal.aborted;
  let failures = 0;
  let connected = false;

  while (!aborted()) {
    try {
      const startedAt = now();
      const received = await client.receiveNotification(receiveTimeoutSec, signal);
      failures = 0;
      if (!connected) {
        connected = true;
        onStatusChange('connected', null);
      }

      if (received === null) {
        const elapsed = now() - startedAt;
        if (elapsed < MIN_EMPTY_POLL_MS) await sleep(MIN_EMPTY_POLL_MS - elapsed, signal);
        continue;
      }

      try {
        onNotification(parseNotification(received.body));
      } catch (error) {
        // A bug in a handler must not jam the queue: report it and delete the notification anyway.
        console.error('Failed to handle a GREEN-API notification', error);
      }
      await client.deleteNotification(received.receiptId, signal);
    } catch (error) {
      if (aborted() || isAbortError(error)) return;
      connected = false;
      if (!isTransientError(error)) {
        onStatusChange('error', error);
        return;
      }
      failures += 1;
      onStatusChange('reconnecting', error);
      await sleep(backoffDelay(failures, random), signal);
    }
  }
}
