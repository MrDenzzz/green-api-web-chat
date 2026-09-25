import { describe, expect, it } from 'vitest';
import { describeError, GreenApiError, isTransientError, type GreenApiErrorReason } from './errors';

const errorOf = (reason: GreenApiErrorReason, details?: string) =>
  new GreenApiError({ reason, method: 'sendMessage', ...(details && { details }) });

describe('describeError', () => {
  it.each([
    ['unauthorized', 'Неверный apiTokenInstance.'],
    ['forbidden', 'Неверный idInstance или apiUrl.'],
    ['network', 'Нет связи с GREEN-API. Проверьте интернет и apiUrl.'],
  ] as const)('explains %s in Russian', (reason, message) => {
    expect(describeError(errorOf(reason))).toBe(message);
  });

  it('adds the server explanation where it helps', () => {
    const error = errorOf('quota-exceeded', 'You can only send messages to 10000000');

    expect(describeError(error)).toBe(
      'Превышен лимит тарифа «Разработчик». You can only send messages to 10000000',
    );
  });

  it('keeps generic reasons short', () => {
    expect(describeError(errorOf('server', 'upstream connect error'))).toBe(
      'GREEN-API временно недоступен. Попробуйте позже.',
    );
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(describeError(new Error('boom'))).toBe('Что-то пошло не так. Попробуйте ещё раз.');
  });
});

describe('isTransientError', () => {
  it.each<GreenApiErrorReason>([
    'network',
    'timeout',
    'rate-limited',
    'server',
    'instance-starting',
  ])('retries %s', (reason) => {
    expect(isTransientError(errorOf(reason))).toBe(true);
  });

  it.each<GreenApiErrorReason>([
    'unauthorized',
    'forbidden',
    'webhook-url-set',
    'instance-expired',
    'invalid-response',
  ])('stops on %s', (reason) => {
    expect(isTransientError(errorOf(reason))).toBe(false);
  });

  it('does not retry errors that did not come from the client', () => {
    expect(isTransientError(new Error('boom'))).toBe(false);
  });
});
