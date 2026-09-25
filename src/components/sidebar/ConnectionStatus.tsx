import { describeError } from '../../api/errors';
import type { NotificationPolling, PollingStatus } from '../../hooks/useNotificationPolling';
import { cx } from '../../lib/cx';
import styles from './ConnectionStatus.module.css';

const LABELS: Record<PollingStatus, string> = {
  connecting: 'Подключение…',
  connected: 'Подключено',
  reconnecting: 'Переподключение…',
  error: 'Ошибка получения сообщений',
  paused: 'Пауза, пока вкладка скрыта',
};

/** State of the long-poll loop, with the reason when something is wrong. */
export function ConnectionStatus({ polling }: { polling: NotificationPolling }) {
  const { status, error, restart } = polling;
  const problem = status === 'reconnecting' || status === 'error' ? describeError(error) : null;

  return (
    <div className={cx(styles.status, styles[status])} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <span>{LABELS[status]}</span>
      {status === 'error' && (
        <button type="button" className={styles.retry} onClick={restart}>
          Повторить
        </button>
      )}
      {problem && <span className={styles.problem}>{problem}</span>}
    </div>
  );
}
