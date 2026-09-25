import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GreenApiClient } from '../../api/client';
import { GreenApiError } from '../../api/errors';
import type { InstanceSettings } from '../../api/schemas';
import { useSessionStore } from '../../store/session';
import { createFakeClient } from '../../test/fakeClient';
import { NotificationsBanner } from './NotificationsBanner';

const enabled: InstanceSettings = {
  wid: '79991234567@c.us',
  typeInstance: 'v3',
  webhookUrl: '',
  incomingWebhook: true,
  outgoingWebhook: true,
  outgoingMessageWebhook: true,
  outgoingAPIMessageWebhook: true,
};

function renderBanner(
  settings: Partial<InstanceSettings>,
  overrides: Partial<GreenApiClient> = {},
) {
  const getSettings = vi.fn(() => Promise.resolve({ ...enabled, ...settings }));
  const setSettings = vi.fn(() => Promise.resolve(true));
  const onSaved = vi.fn();
  render(
    <NotificationsBanner
      client={createFakeClient({ getSettings, setSettings, ...overrides })}
      onSaved={onSaved}
    />,
  );
  return { getSettings, setSettings, onSaved, user: userEvent.setup() };
}

describe('NotificationsBanner', () => {
  beforeEach(() => {
    useSessionStore.setState({ instanceSettings: null, notice: null });
  });

  it('stays hidden when notifications are on', async () => {
    const { getSettings } = renderBanner({});

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers to turn on incoming notifications', async () => {
    const { setSettings, onSaved, user } = renderBanner({ incomingWebhook: false });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Входящие сообщения не будут приходить.',
    );
    await user.click(screen.getByRole('button', { name: 'Включить уведомления' }));

    expect(setSettings).toHaveBeenCalledWith({
      incomingWebhook: true,
      outgoingWebhook: true,
      outgoingAPIMessageWebhook: true,
      outgoingMessageWebhook: true,
    });
    expect(onSaved).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Настройки сохранены. Инстанс перезапускается, изменения вступят в силу в течение 5 минут.',
    );
  });

  it('warns about missing delivery statuses', async () => {
    renderBanner({ outgoingWebhook: false });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Статусы доставки не будут обновляться.',
    );
  });

  it('clears a webhook URL that blocks the HTTP API', async () => {
    const { setSettings, user } = renderBanner({ webhookUrl: 'https://example.com/hook' });

    expect(await screen.findByRole('alert')).toHaveTextContent('https://example.com/hook');
    await user.click(screen.getByRole('button', { name: 'Включить уведомления' }));

    expect(setSettings).toHaveBeenCalledWith(expect.objectContaining({ webhookUrl: '' }));
  });

  it('reuses the settings read while signing in', () => {
    useSessionStore.setState({ instanceSettings: { ...enabled, incomingWebhook: false } });

    const { getSettings } = renderBanner({});

    expect(screen.getByRole('alert')).toHaveTextContent('Входящие сообщения не будут приходить.');
    expect(getSettings).not.toHaveBeenCalled();
  });

  it('lets the user retry a failed check', async () => {
    const getSettings = vi
      .fn<GreenApiClient['getSettings']>()
      .mockRejectedValueOnce(new GreenApiError({ reason: 'network', method: 'getSettings' }))
      .mockResolvedValueOnce(enabled);
    const { user } = renderBanner({}, { getSettings });

    expect(
      await screen.findByText(/Не удалось проверить настройки уведомлений/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalledTimes(2);
    });
  });

  it('shows warnings about the instance', () => {
    useSessionStore.setState({ notice: 'Инстанс не авторизован.' });

    renderBanner({});

    expect(screen.getByText('Инстанс не авторизован.')).toBeInTheDocument();
  });
});
