import { cx } from '../../lib/cx';
import type { MessageStatus as Status } from '../../store/chatReducer';
import { Icon, type IconName } from '../ui/Icon';
import styles from './MessageStatus.module.css';

const STATUSES: Record<Status, { icon: IconName; label: string }> = {
  pending: { icon: 'clock', label: 'Отправляется' },
  sent: { icon: 'check', label: 'Отправлено' },
  delivered: { icon: 'checks', label: 'Доставлено' },
  read: { icon: 'checks', label: 'Прочитано' },
  failed: { icon: 'alert', label: 'Не отправлено' },
};

export function MessageStatus({ status }: { status: Status }) {
  const { icon, label } = STATUSES[status];
  return (
    <span className={cx(styles.status, styles[status])} role="img" aria-label={label} title={label}>
      <Icon name={icon} size={16} />
    </span>
  );
}
