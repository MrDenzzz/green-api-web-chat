const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const shortDateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dayWithYearFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight of the timestamp's day in local time; also a key to group messages by day. */
export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Calendar days from `timestamp` to `now`; rounding absorbs daylight saving shifts. */
function daysAgo(timestamp: number, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY_MS);
}

/** "14:05" */
export function formatTime(timestamp: number): string {
  return timeFormat.format(timestamp);
}

/** Chat list: time today, "вчера", a weekday within a week, otherwise a date. */
export function formatChatTime(timestamp: number, now: number): string {
  const days = daysAgo(timestamp, now);
  if (days <= 0) return formatTime(timestamp);
  if (days === 1) return 'вчера';
  if (days < 7) return weekdayFormat.format(timestamp);
  return shortDateFormat.format(timestamp);
}

/** Separator above a day of messages: "Сегодня", "Вчера", "12 сентября". */
export function formatDay(timestamp: number, now: number): string {
  const days = daysAgo(timestamp, now);
  if (days <= 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? dayFormat : dayWithYearFormat).format(timestamp);
}
