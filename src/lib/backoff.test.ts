import { describe, expect, it } from 'vitest';
import { backoffDelay } from './backoff';

describe('backoffDelay', () => {
  it.each([
    [1, 500, 1000],
    [2, 1000, 2000],
    [3, 2000, 4000],
    [5, 8000, 16000],
  ])('keeps attempt %i between %i and %i ms', (attempt, min, max) => {
    expect(backoffDelay(attempt, () => 0)).toBe(min);
    expect(backoffDelay(attempt, () => 1)).toBe(max);
  });

  it('never waits longer than the cap', () => {
    expect(backoffDelay(50, () => 1)).toBe(30_000);
    expect(backoffDelay(50, () => 0)).toBe(15_000);
  });

  it('accepts custom limits', () => {
    expect(backoffDelay(3, () => 1, { baseMs: 100, maxMs: 300 })).toBe(300);
  });
});
