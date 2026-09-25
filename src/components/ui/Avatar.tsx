import { cx } from '../../lib/cx';
import styles from './Avatar.module.css';
import { Icon } from './Icon';

/** Avatar gradients of web.max.ru. */
const GRADIENTS = ['coral', 'orange', 'green', 'sky', 'violet'] as const;

interface AvatarProps {
  /** Picks the color, so a chat keeps its avatar color between sessions. */
  seed: string;
  title: string;
  size?: 'medium' | 'small';
}

export function Avatar({ seed, title, size = 'medium' }: AvatarProps) {
  const letters = initials(title);
  const gradient = GRADIENTS[hash(seed) % GRADIENTS.length] ?? 'sky';

  return (
    <span className={cx(styles.avatar, styles[gradient], styles[size])} aria-hidden="true">
      {letters || <Icon name="user" size={size === 'small' ? 20 : 24} />}
    </span>
  );
}

/** First letters of the first two words: "Василиса Премудрая" → "ВП"; none for phone numbers. */
function initials(title: string): string {
  return title
    .split(/\s+/)
    .map((word) => /\p{L}/u.exec(word)?.[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hash(value: string): number {
  let result = 0;
  for (const char of value) {
    result = (result * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return result;
}
