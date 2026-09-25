import { describe, expect, it } from 'vitest';
import { detectMessenger } from './messengers';

describe('detectMessenger', () => {
  it.each([
    ['v3', 'MAX'],
    ['telegram', 'Telegram'],
  ])('recognises typeInstance "%s" as %s', (typeInstance, name) => {
    expect(detectMessenger(typeInstance)?.name).toBe(name);
  });

  it.each(['whatsapp', '', undefined])('does not support typeInstance %j', (typeInstance) => {
    expect(detectMessenger(typeInstance)).toBeNull();
  });
});
