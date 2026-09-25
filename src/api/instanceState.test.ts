import { describe, expect, it } from 'vitest';
import { describeInstanceState } from './instanceState';

describe('describeInstanceState', () => {
  it('has nothing to say about an authorized instance', () => {
    expect(describeInstanceState('authorized')).toBeNull();
  });

  it.each(['notAuthorized', 'blocked', 'starting', 'suspended', 'pendingPassword'])(
    'explains %s',
    (state) => {
      expect(describeInstanceState(state)).toEqual(expect.any(String));
    },
  );

  it('mentions an unknown state as is', () => {
    expect(describeInstanceState('yellowCard')).toBe('Неизвестное состояние инстанса: yellowCard.');
  });
});
