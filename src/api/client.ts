import type { z } from 'zod';
import { GreenApiError, reasonFromResponse } from './errors';
import {
  checkAccountSchema,
  deleteNotificationSchema,
  receiveNotificationSchema,
  sendMessageSchema,
  setSettingsSchema,
  settingsSchema,
  stateInstanceSchema,
  type InstanceSettings,
} from './schemas';

export interface GreenApiCredentials {
  /** Instance host from the GREEN-API console, e.g. `https://3100.api.green-api.com`. */
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

/** Envelope returned by receiveNotification; `body` is parsed by `parseNotification()`. */
export interface ReceivedNotification {
  receiptId: number;
  body: unknown;
}

export type CheckAccountQuery = { phoneNumber: number } | { username: string };

export type CheckAccountResult = { exists: true; chatId: string } | { exists: false };

/** Settings the app manages; booleans are sent as GREEN-API's "yes"/"no". */
export interface SettingsPatch {
  webhookUrl?: string;
  incomingWebhook?: boolean;
  outgoingWebhook?: boolean;
  outgoingMessageWebhook?: boolean;
  outgoingAPIMessageWebhook?: boolean;
}

export interface GreenApiClient {
  getStateInstance: (signal?: AbortSignal) => Promise<string>;
  getSettings: (signal?: AbortSignal) => Promise<InstanceSettings>;
  setSettings: (patch: SettingsPatch, signal?: AbortSignal) => Promise<boolean>;
  /** Resolves with the `idMessage` of the sent message. */
  sendMessage: (chatId: string, message: string, signal?: AbortSignal) => Promise<string>;
  checkAccount: (query: CheckAccountQuery, signal?: AbortSignal) => Promise<CheckAccountResult>;
  receiveNotification: (
    receiveTimeoutSec: number,
    signal?: AbortSignal,
  ) => Promise<ReceivedNotification | null>;
  deleteNotification: (receiptId: number, signal?: AbortSignal) => Promise<boolean>;
}

export interface GreenApiClientOptions {
  /** Injected in tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Per-request timeout. Long-poll requests get their receiveTimeout on top of it. */
  timeoutMs?: number;
}

type HttpMethod = 'GET' | 'POST' | 'DELETE';

interface CallOptions {
  body?: unknown;
  /** Appended after the token, e.g. `/{receiptId}`. */
  path?: string;
  query?: Record<string, number>;
  signal?: AbortSignal | undefined;
  extraTimeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Thin typed wrapper over the GREEN-API HTTP API:
 * `{apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}`.
 * Every response is validated with Zod; every failure becomes a `GreenApiError`.
 */
export function createGreenApiClient(
  credentials: GreenApiCredentials,
  options: GreenApiClientOptions = {},
): GreenApiClient {
  const fetchImpl = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const apiUrl = credentials.apiUrl.replace(/\/+$/, '');
  const instancePath = `waInstance${encodeURIComponent(credentials.idInstance)}`;
  const token = credentials.apiTokenInstance;

  async function call<T>(
    httpMethod: HttpMethod,
    method: string,
    schema: z.ZodType<T>,
    { body, path = '', query = {}, signal, extraTimeoutMs = 0 }: CallOptions = {},
  ): Promise<T> {
    const url = new URL(`${apiUrl}/${instancePath}/${method}/${encodeURIComponent(token)}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }

    const request = createRequestSignal(signal, timeoutMs + extraTimeoutMs);
    try {
      let response: Response;
      let text: string;
      try {
        response = await fetchImpl(url, {
          method: httpMethod,
          signal: request.signal,
          ...(body !== undefined && {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
        });
        text = await response.text();
      } catch (error) {
        throw new GreenApiError({
          reason: request.abortReason() ?? 'network',
          method,
          cause: error,
        });
      }

      if (!response.ok) {
        const details = readErrorDetails(text, token);
        throw new GreenApiError({
          reason: reasonFromResponse(response.status, details),
          method,
          status: response.status,
          details,
        });
      }

      return parseBody(text, schema, method);
    } finally {
      request.dispose();
    }
  }

  return {
    getStateInstance: async (signal) => {
      const { stateInstance } = await call('GET', 'getStateInstance', stateInstanceSchema, {
        signal,
      });
      return stateInstance;
    },

    getSettings: (signal) => call('GET', 'getSettings', settingsSchema, { signal }),

    setSettings: async (patch, signal) => {
      const { saveSettings } = await call('POST', 'setSettings', setSettingsSchema, {
        body: toSettingsBody(patch),
        signal,
      });
      return saveSettings;
    },

    sendMessage: async (chatId, message, signal) => {
      const { idMessage } = await call('POST', 'sendMessage', sendMessageSchema, {
        body: { chatId, message },
        signal,
      });
      return idMessage;
    },

    checkAccount: async (query, signal) => {
      const { exist, chatId } = await call('POST', 'checkAccount', checkAccountSchema, {
        body: query,
        signal,
      });
      // MAX answers `exist: false, chatId: ""` for unknown numbers.
      return exist && chatId ? { exists: true, chatId } : { exists: false };
    },

    receiveNotification: (receiveTimeoutSec, signal) =>
      call('GET', 'receiveNotification', receiveNotificationSchema, {
        query: { receiveTimeout: receiveTimeoutSec },
        extraTimeoutMs: receiveTimeoutSec * 1000,
        signal,
      }),

    deleteNotification: async (receiptId, signal) => {
      const { result } = await call('DELETE', 'deleteNotification', deleteNotificationSchema, {
        path: `/${receiptId}`,
        signal,
      });
      return result;
    },
  };
}

/**
 * Links the caller's signal with a timeout. Unlike `AbortSignal.any()` + `AbortSignal.timeout()`,
 * it tells which of the two fired and clears the timer as soon as the request settles.
 */
function createRequestSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let abortReason: 'aborted' | 'timeout' | null = null;

  const abort = (reason: 'aborted' | 'timeout') => {
    abortReason ??= reason;
    controller.abort();
  };
  const onParentAbort = () => {
    abort('aborted');
  };
  const timer = setTimeout(() => {
    abort('timeout');
  }, timeoutMs);

  if (parent?.aborted) {
    onParentAbort();
  } else {
    parent?.addEventListener('abort', onParentAbort, { once: true });
  }

  return {
    signal: controller.signal,
    abortReason: () => abortReason,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', onParentAbort);
    },
  };
}

function parseBody<T>(text: string, schema: z.ZodType<T>, method: string): T {
  let json: unknown = null;
  try {
    // An empty body is how receiveNotification reports an empty queue.
    if (text.trim() !== '') json = JSON.parse(text);
  } catch (error) {
    throw new GreenApiError({ reason: 'invalid-response', method, cause: error });
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new GreenApiError({ reason: 'invalid-response', method, cause: result.error });
  }
  return result.data;
}

/** Pulls a short server message out of an error body and masks the token, just in case. */
function readErrorDetails(text: string, token: string): string | undefined {
  let details = text.trim();
  try {
    const json: unknown = JSON.parse(details);
    if (typeof json === 'object' && json !== null) {
      const { message, description, error } = json as Record<string, unknown>;
      const candidate = [message, description, error].find((value) => typeof value === 'string');
      if (typeof candidate === 'string') details = candidate;
    }
  } catch {
    // Plain-text or empty body: keep it as is.
  }
  return details === '' ? undefined : details.replaceAll(token, '***').slice(0, 300);
}

const SETTING_FLAGS = [
  'incomingWebhook',
  'outgoingWebhook',
  'outgoingMessageWebhook',
  'outgoingAPIMessageWebhook',
] as const;

function toSettingsBody(patch: SettingsPatch): Record<string, string> {
  const body: Record<string, string> = {};
  if (patch.webhookUrl !== undefined) body.webhookUrl = patch.webhookUrl;
  for (const flag of SETTING_FLAGS) {
    const enabled = patch[flag];
    if (enabled !== undefined) body[flag] = enabled ? 'yes' : 'no';
  }
  return body;
}
