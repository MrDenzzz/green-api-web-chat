import { vi } from 'vitest';
import type { GreenApiClient } from '../api/client';

/** A GREEN-API client whose methods fail loudly unless a test provides them. */
export function createFakeClient(overrides: Partial<GreenApiClient> = {}): GreenApiClient {
  const unexpected = (method: string) => () =>
    Promise.reject(new Error(`Unexpected GREEN-API call: ${method}`));

  return {
    getStateInstance: vi.fn(unexpected('getStateInstance')),
    getSettings: vi.fn(unexpected('getSettings')),
    setSettings: vi.fn(unexpected('setSettings')),
    sendMessage: vi.fn(unexpected('sendMessage')),
    checkAccount: vi.fn(unexpected('checkAccount')),
    receiveNotification: vi.fn(unexpected('receiveNotification')),
    deleteNotification: vi.fn(unexpected('deleteNotification')),
    ...overrides,
  };
}
