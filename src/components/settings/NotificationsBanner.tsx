import type { GreenApiClient } from '../../api/client';
import { useInstanceSettings } from '../../hooks/useInstanceSettings';
import { useSessionStore } from '../../store/session';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

interface NotificationsBannerProps {
  client: GreenApiClient;
  /** Called after setSettings succeeded, e.g. to restart polling. */
  onSaved: () => void;
}

/** Warnings about the instance: notification settings and service notifications. */
export function NotificationsBanner({ client, onSaved }: NotificationsBannerProps) {
  const { check, enable, retry, dismiss } = useInstanceSettings(client, onSaved);
  const notice = useSessionStore((state) => state.notice);

  return (
    <>
      {notice && <Banner tone="warning">{notice}</Banner>}

      {check.kind === 'problem' && (
        <Banner
          tone="warning"
          role="alert"
          actions={
            <Button size="small" loading={check.saving} onClick={() => void enable()}>
              Включить уведомления
            </Button>
          }
        >
          <p>
            <strong>
              {check.problem.missesMessages
                ? 'Входящие сообщения не будут приходить.'
                : 'Статусы доставки не будут обновляться.'}
            </strong>{' '}
            {check.problem.webhookUrl
              ? `Уведомления инстанса уходят на webhook ${check.problem.webhookUrl}, а через HTTP API их тогда не получить. Кнопка очистит webhookUrl и включит уведомления.`
              : 'В настройках инстанса выключены уведомления, кнопка включит их.'}
          </p>
          {check.error && <p>Не получилось: {check.error}</p>}
        </Banner>
      )}

      {check.kind === 'saved' && (
        <Banner
          tone="success"
          actions={<IconButton icon="close" label="Скрыть" onClick={dismiss} />}
        >
          Настройки сохранены. Инстанс перезапускается, изменения вступят в силу в течение 5 минут.
        </Banner>
      )}

      {check.kind === 'failed' && (
        <Banner
          tone="error"
          actions={
            <Button size="small" variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        >
          Не удалось проверить настройки уведомлений. {check.error}
        </Banner>
      )}
    </>
  );
}
