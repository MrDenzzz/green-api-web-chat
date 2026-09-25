import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Banner.module.css';
import { Icon } from './Icon';

interface BannerProps {
  tone: 'warning' | 'success' | 'error';
  children: ReactNode;
  actions?: ReactNode;
  /** "alert" interrupts a screen reader; use it only for problems that need action. */
  role?: 'alert' | 'status';
}

export function Banner({ tone, children, actions, role = 'status' }: BannerProps) {
  return (
    <div className={cx(styles.banner, styles[tone])} role={role}>
      <span className={styles.icon}>
        <Icon name={tone === 'success' ? 'check' : 'alert'} size={20} />
      </span>
      <div className={styles.text}>{children}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
