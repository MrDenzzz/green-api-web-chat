import { useEffect, useState } from 'react';
import type { GreenApiClient, SettingsPatch } from '../api/client';
import { describeError, GreenApiError, isAbortError } from '../api/errors';
import type { InstanceSettings } from '../api/schemas';
import { sleep } from '../lib/sleep';
import { useSessionStore } from '../store/session';

/** Without these flags the chat misses incoming messages or delivery statuses. */
const REQUIRED_FLAGS = ['incomingWebhook', 'outgoingWebhook', 'outgoingAPIMessageWebhook'] as const;

export interface SettingsProblem {
  /** Incoming messages will not arrive; otherwise only statuses are missing. */
  missesMessages: boolean;
  /** GREEN-API does not fill the HTTP API queue while a webhook URL is set. */
  webhookUrl: string;
}

export type SettingsCheck =
  | { kind: 'checking' }
  | { kind: 'ok' }
  | { kind: 'problem'; problem: SettingsProblem; saving: boolean; error: string | null }
  | { kind: 'saved' }
  | { kind: 'failed'; error: string };

export function findSettingsProblem(settings: InstanceSettings): SettingsProblem | null {
  const disabled = REQUIRED_FLAGS.filter((flag) => !settings[flag]);
  if (disabled.length === 0 && settings.webhookUrl === '') return null;
  return {
    missesMessages: !settings.incomingWebhook || settings.webhookUrl !== '',
    webhookUrl: settings.webhookUrl,
  };
}

function checkOf(settings: InstanceSettings): SettingsCheck {
  const problem = findSettingsProblem(settings);
  return problem ? { kind: 'problem', problem, saving: false, error: null } : { kind: 'ok' };
}

async function loadSettings(client: GreenApiClient, signal: AbortSignal) {
  try {
    return await client.getSettings(signal);
  } catch (error) {
    // getSettings allows one request per second, which a quick reload can run into.
    if (!(error instanceof GreenApiError && error.reason === 'rate-limited')) throw error;
    await sleep(1100, signal);
    return client.getSettings(signal);
  }
}

/**
 * Notifications reach the queue only if the instance is set up for them. Checks that
 * with getSettings and turns them on with setSettings when the user agrees.
 */
export function useInstanceSettings(client: GreenApiClient, onSaved: () => void) {
  const settingsFromSignIn = useSessionStore((state) => state.instanceSettings);
  const [check, setCheck] = useState<SettingsCheck>(() =>
    settingsFromSignIn ? checkOf(settingsFromSignIn) : { kind: 'checking' },
  );

  useEffect(() => {
    if (check.kind !== 'checking') return;
    const controller = new AbortController();
    loadSettings(client, controller.signal).then(
      (settings) => {
        setCheck(checkOf(settings));
      },
      (error: unknown) => {
        if (!isAbortError(error)) setCheck({ kind: 'failed', error: describeError(error) });
      },
    );
    return () => {
      controller.abort();
    };
  }, [client, check.kind]);

  const enable = async () => {
    if (check.kind !== 'problem') return;
    const { problem } = check;
    setCheck({ kind: 'problem', problem, saving: true, error: null });

    const patch: SettingsPatch = {
      ...(problem.webhookUrl !== '' && { webhookUrl: '' }),
      incomingWebhook: true,
      outgoingWebhook: true,
      outgoingAPIMessageWebhook: true,
      // Messages sent from the phone show up in the web chat too.
      outgoingMessageWebhook: true,
    };
    try {
      if (await client.setSettings(patch)) {
        setCheck({ kind: 'saved' });
        onSaved();
      } else {
        setCheck({
          kind: 'problem',
          problem,
          saving: false,
          error: 'GREEN-API не сохранил настройки.',
        });
      }
    } catch (error) {
      setCheck({ kind: 'problem', problem, saving: false, error: describeError(error) });
    }
  };

  return {
    check,
    enable,
    retry: () => {
      setCheck({ kind: 'checking' });
    },
    dismiss: () => {
      setCheck({ kind: 'ok' });
    },
  };
}
