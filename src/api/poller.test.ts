import { describe, expect, it, vi } from 'vitest';
import { maxIncomingText } from '../test/fixtures/notifications';
import type { GreenApiClient, ReceivedNotification } from './client';
import { GreenApiError, type GreenApiErrorReason } from './errors';
import type { ParsedNotification } from './notifications';
import { pollNotifications, RECEIVE_TIMEOUT_SEC, type PollerOptions } from './poller';

/** What the fake server answers to consecutive receiveNotification calls. */
type Answer = ReceivedNotification | null | GreenApiError;

const notification = (
  receiptId: number,
  body: unknown = maxIncomingText,
): ReceivedNotification => ({
  receiptId,
  body,
});

const failure = (reason: GreenApiErrorReason) =>
  new GreenApiError({ reason, method: 'receiveNotification' });

function setup(answers: Answer[], options: Partial<PollerOptions> = {}) {
  const controller = new AbortController();
  const log: string[] = [];
  let clock = 0;

  const receiveNotification = vi.fn<GreenApiClient['receiveNotification']>(() => {
    log.push('receive');
    const answer = answers.shift();
    if (answer === undefined) {
      // Out of answers: behave like an unmounted component.
      controller.abort();
      return Promise.reject(failure('aborted'));
    }
    return answer instanceof GreenApiError ? Promise.reject(answer) : Promise.resolve(answer);
  });
  const deleteNotification = vi.fn<GreenApiClient['deleteNotification']>((receiptId) => {
    log.push(`delete ${receiptId}`);
    return Promise.resolve(true);
  });
  const onNotification = vi.fn((parsed: ParsedNotification) => {
    log.push(`handle ${parsed.kind}`);
  });
  const onStatusChange = vi.fn();
  const sleep = vi.fn<NonNullable<PollerOptions['sleep']>>(() => Promise.resolve());

  const poll = () =>
    pollNotifications({
      client: { receiveNotification, deleteNotification },
      signal: controller.signal,
      onNotification,
      onStatusChange,
      sleep,
      random: () => 1,
      // Each request looks like the server held it for a while.
      now: () => {
        clock += 5000;
        return clock;
      },
      ...options,
    });

  return { poll, log, controller, receiveNotification, deleteNotification, onStatusChange, sleep };
}

describe('pollNotifications', () => {
  it('handles each notification before deleting it', async () => {
    const { poll, log } = setup([notification(1), notification(2)]);

    await poll();

    expect(log).toEqual([
      'receive',
      'handle message',
      'delete 1',
      'receive',
      'handle message',
      'delete 2',
      'receive',
    ]);
  });

  it('long-polls with receiveTimeout and the abort signal', async () => {
    const { poll, receiveNotification, controller } = setup([null]);

    await poll();

    expect(receiveNotification).toHaveBeenCalledWith(RECEIVE_TIMEOUT_SEC, controller.signal);
  });

  it('deletes notifications the app does not use, so the queue keeps moving', async () => {
    const { poll, log } = setup([notification(1, { typeWebhook: 'incomingCall' })]);

    await poll();

    expect(log).toEqual(['receive', 'handle ignored', 'delete 1', 'receive']);
  });

  it('deletes a notification even if handling it throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { poll, deleteNotification } = setup([notification(1)], {
      onNotification: () => {
        throw new Error('bug');
      },
    });

    await poll();

    expect(deleteNotification).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it('reports "connected" once, not on every answer', async () => {
    const { poll, onStatusChange } = setup([null, null, notification(1)]);

    await poll();

    expect(onStatusChange.mock.calls).toEqual([['connected', null]]);
  });

  it('waits before the next request when an empty answer came back instantly', async () => {
    const { poll, sleep } = setup([null], { now: () => 0 });

    await poll();

    expect(sleep).toHaveBeenCalledWith(1000, expect.any(AbortSignal));
  });

  it('backs off on transient errors and recovers', async () => {
    const network = failure('network');
    const server = failure('server');
    const { poll, sleep, onStatusChange } = setup([network, server, null]);

    await poll();

    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000]);
    expect(onStatusChange.mock.calls).toEqual([
      ['reconnecting', network],
      ['reconnecting', server],
      ['connected', null],
    ]);
  });

  it('starts the backoff over after a success', async () => {
    const { poll, sleep } = setup([failure('network'), null, failure('network')]);

    await poll();

    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 1000]);
  });

  it('retries a failed delete by receiving the notification again', async () => {
    const { poll, deleteNotification } = setup([notification(1), notification(1)]);
    deleteNotification.mockRejectedValueOnce(failure('timeout'));

    await poll();

    expect(deleteNotification.mock.calls.map(([receiptId]) => receiptId)).toEqual([1, 1]);
  });

  it('stops on an error that needs the user', async () => {
    const unauthorized = failure('unauthorized');
    const { poll, receiveNotification, onStatusChange } = setup([unauthorized, null]);

    await poll();

    expect(receiveNotification).toHaveBeenCalledOnce();
    expect(onStatusChange).toHaveBeenLastCalledWith('error', unauthorized);
  });

  it('does nothing once aborted', async () => {
    const { poll, controller, receiveNotification, onStatusChange } = setup([null]);
    controller.abort();

    await poll();

    expect(receiveNotification).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalled();
  });
});
