import { describe, expect, it } from 'vitest';
import { formatChatTime, formatDay, formatTime } from './formatTime';

/** Local time, so the tests do not depend on the machine's time zone. */
const at = (year: number, month: number, day: number, hours = 12, minutes = 0) =>
  new Date(year, month - 1, day, hours, minutes).getTime();

// Friday, 25 September 2026, 15:30.
const NOW = at(2026, 9, 25, 15, 30);

describe('formatTime', () => {
  it('shows hours and minutes', () => {
    expect(formatTime(at(2026, 9, 25, 9, 5))).toBe('09:05');
  });
});

describe('formatChatTime', () => {
  it.each([
    ['today', at(2026, 9, 25, 9, 5), '09:05'],
    ['yesterday', at(2026, 9, 24, 23, 59), 'вчера'],
    ['earlier this week', at(2026, 9, 21), 'пн'],
    ['long ago', at(2026, 9, 1), '01.09.26'],
  ])('describes a message from %s', (_, timestamp, label) => {
    expect(formatChatTime(timestamp, NOW)).toBe(label);
  });
});

describe('formatDay', () => {
  it.each([
    ['today', at(2026, 9, 25, 0, 1), 'Сегодня'],
    ['yesterday', at(2026, 9, 24), 'Вчера'],
    ['this year', at(2026, 9, 1), '1 сентября'],
    ['last year', at(2025, 12, 31), '31 декабря 2025 г.'],
  ])('names a day from %s', (_, timestamp, label) => {
    expect(formatDay(timestamp, NOW)).toBe(label);
  });
});
