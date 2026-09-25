import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';
import { Icon, type IconName } from './Icon';
import styles from './IconButton.module.css';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Read by screen readers and shown as a tooltip. */
  label: string;
}

export function IconButton({ icon, label, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}
