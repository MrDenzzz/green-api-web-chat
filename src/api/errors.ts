/**
 * Every failure of a GREEN-API call is reduced to one of these reasons.
 * The UI shows `describeError()`, the polling loop asks `isTransientError()`.
 */
export type GreenApiErrorReason =
  | 'aborted'
  | 'network'
  | 'timeout'
  | 'invalid-response'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'quota-exceeded'
  | 'check-limit'
  | 'webhook-url-set'
  | 'instance-starting'
  | 'instance-expired'
  | 'instance-deleted'
  | 'account-suspended'
  | 'bad-request'
  | 'server';

interface GreenApiErrorInit {
  reason: GreenApiErrorReason;
  method: string;
  status?: number;
  details?: string;
  cause?: unknown;
}

export class GreenApiError extends Error {
  readonly reason: GreenApiErrorReason;
  /** GREEN-API method, e.g. "sendMessage". */
  readonly method: string;
  readonly status: number | undefined;
  /** Explanation from the response body, if any. Never contains the token. */
  readonly details: string | undefined;

  constructor({ reason, method, status, details, cause }: GreenApiErrorInit) {
    const httpStatus = status === undefined ? '' : ` (HTTP ${status})`;
    super(`GREEN-API ${method} failed: ${reason}${httpStatus}`, { cause });
    this.name = 'GreenApiError';
    this.reason = reason;
    this.method = method;
    this.status = status;
    this.details = details;
  }
}

/**
 * Picks a reason for a non-2xx response. The body wins where the status is ambiguous:
 * GREEN-API answers 400 both for bad input and for an instance that is not ready,
 * and 403 both for a wrong idInstance and for a suspended account.
 */
export function reasonFromResponse(status: number, details = ''): GreenApiErrorReason {
  const text = details.toLowerCase();
  if (text.includes('webhook url is set')) return 'webhook-url-set';
  if (text.includes('expired')) return 'instance-expired';
  if (text.includes('instance is deleted')) return 'instance-deleted';
  if (text.includes('suspended')) return 'account-suspended';
  if (text.includes('starting') || text.includes('not authorized')) return 'instance-starting';

  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    // The server gave up on the request, e.g. while the instance restarts after setSettings.
    case 408:
      return 'timeout';
    case 429:
      return 'rate-limited';
    case 466:
      return 'quota-exceeded';
    case 469:
      return 'check-limit';
    default:
      return status >= 500 ? 'server' : 'bad-request';
  }
}

const MESSAGES: Record<GreenApiErrorReason, string> = {
  aborted: 'Запрос отменён.',
  network: 'Нет связи с GREEN-API. Проверьте интернет и apiUrl.',
  timeout: 'GREEN-API не ответил вовремя. Попробуйте ещё раз.',
  'invalid-response': 'GREEN-API вернул неожиданный ответ.',
  unauthorized: 'Неверный apiTokenInstance.',
  forbidden: 'Неверный idInstance или apiUrl.',
  'not-found': 'Метод не найден. Проверьте apiUrl.',
  'rate-limited': 'Слишком много запросов. Подождите немного.',
  'quota-exceeded': 'Превышен лимит тарифа «Разработчик».',
  'check-limit': 'Превышен лимит проверок номеров. Попробуйте позже.',
  'webhook-url-set': 'У инстанса задан webhookUrl, поэтому получение через HTTP API недоступно.',
  'instance-starting': 'Инстанс запускается или не авторизован. Попробуйте через минуту.',
  'instance-expired': 'Срок действия инстанса истёк. Продлите его в личном кабинете GREEN-API.',
  'instance-deleted': 'Инстанс удалён.',
  'account-suspended': 'На аккаунте временные ограничения на отправку.',
  'bad-request': 'GREEN-API отклонил запрос.',
  server: 'GREEN-API временно недоступен. Попробуйте позже.',
};

/** Reasons where the server's own words help the user more than a generic message. */
const REASONS_WITH_DETAILS: ReadonlySet<GreenApiErrorReason> = new Set([
  'bad-request',
  'quota-exceeded',
]);

/** Russian message for any error thrown by the client. */
export function describeError(error: unknown): string {
  if (!(error instanceof GreenApiError)) {
    return 'Что-то пошло не так. Попробуйте ещё раз.';
  }
  const message = MESSAGES[error.reason];
  return REASONS_WITH_DETAILS.has(error.reason) && error.details
    ? `${message} ${error.details}`
    : message;
}

const TRANSIENT_REASONS: ReadonlySet<GreenApiErrorReason> = new Set([
  'network',
  'timeout',
  'rate-limited',
  'server',
  'instance-starting',
]);

/** Errors that are worth retrying with a backoff; the rest need the user's attention. */
export function isTransientError(error: unknown): boolean {
  return error instanceof GreenApiError && TRANSIENT_REASONS.has(error.reason);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof GreenApiError && error.reason === 'aborted';
}
