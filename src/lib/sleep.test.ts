import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sleep } from './sleep';

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the given time', async () => {
    const done = vi.fn();
    void sleep(1000).then(done);

    await vi.advanceTimersByTimeAsync(999);
    expect(done).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it('resolves as soon as the signal aborts', async () => {
    const controller = new AbortController();
    const done = vi.fn();
    void sleep(60_000, controller.signal).then(done);

    controller.abort();
    await vi.advanceTimersByTimeAsync(0);

    expect(done).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not wait at all with an already aborted signal', async () => {
    await expect(sleep(60_000, AbortSignal.abort())).resolves.toBeUndefined();
  });
});
