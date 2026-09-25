export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
}

/**
 * Exponential backoff with "equal jitter": half of the delay is fixed and half is random,
 * so clients that failed together do not retry together, and nobody retries instantly.
 * Attempt 1 waits 0.5–1 s, attempt 2 waits 1–2 s, and so on up to 15–30 s.
 */
export function backoffDelay(
  attempt: number,
  random: () => number = Math.random,
  { baseMs = 1000, maxMs = 30_000 }: BackoffOptions = {},
): number {
  const ceiling = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(ceiling / 2 + (ceiling / 2) * random());
}
