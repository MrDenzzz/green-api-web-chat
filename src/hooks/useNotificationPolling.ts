import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import type { GreenApiClient } from '../api/client';
import type { ParsedNotification } from '../api/notifications';
import { pollNotifications, type PollerStatus } from '../api/poller';

export type PollingStatus = 'connecting' | 'paused' | PollerStatus;

export interface NotificationPolling {
  status: PollingStatus;
  /** Error of the last failed attempt while reconnecting, or the one that stopped polling. */
  error: unknown;
  /** Starts a fresh loop, e.g. after the user fixed what stopped it. */
  restart: () => void;
}

interface Report {
  client: GreenApiClient;
  run: number;
  status: PollerStatus;
  error: unknown;
}

const isPageVisible = () => document.visibilityState !== 'hidden';

/**
 * Runs the long-poll loop while the tab is visible. Hiding the tab or unmounting aborts
 * the request in flight; showing the tab, coming back online or `restart()` starts a new loop.
 */
export function useNotificationPolling(
  client: GreenApiClient,
  onNotification: (notification: ParsedNotification) => void,
): NotificationPolling {
  const [visible, setVisible] = useState(isPageVisible);
  const [run, setRun] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const handleNotification = useEffectEvent(onNotification);

  const restart = useCallback(() => {
    setRun((value) => value + 1);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      const nowVisible = isPageVisible();
      setVisible(nowVisible);
      if (nowVisible) restart();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', restart);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', restart);
    };
  }, [restart]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void pollNotifications({
      client,
      signal: controller.signal,
      onNotification: (notification) => {
        handleNotification(notification);
      },
      onStatusChange: (status, error) => {
        setReport({ client, run, status, error });
      },
    });
    return () => {
      controller.abort();
    };
  }, [client, visible, run]);

  if (!visible) return { status: 'paused', error: null, restart };

  // A report from a previous loop (another client or run) says nothing about this one.
  const current = report?.client === client && report.run === run ? report : null;
  return { status: current?.status ?? 'connecting', error: current?.error ?? null, restart };
}
