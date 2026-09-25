import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GreenApiClient } from '../../api/client';
import { GreenApiError } from '../../api/errors';
import { MESSENGERS, type MessengerProfile } from '../../api/messengers';
import { useChatStore } from '../../store/chatStore';
import { createFakeClient } from '../../test/fakeClient';
import { NewChatForm } from './NewChatForm';

const found = () => Promise.resolve({ exists: true as const, chatId: '10000000' });

function renderForm(
  checkAccount: GreenApiClient['checkAccount'],
  messenger: MessengerProfile = MESSENGERS.max,
) {
  const onClose = vi.fn();
  const check = vi.fn(checkAccount);
  render(
    <NewChatForm
      client={createFakeClient({ checkAccount: check })}
      messenger={messenger}
      onClose={onClose}
    />,
  );
  return { check, onClose, user: userEvent.setup() };
}

describe('NewChatForm', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('finds the chat of a number written the Russian way and opens it', async () => {
    const { check, onClose, user } = renderForm(found);

    await user.type(screen.getByLabelText('Номер телефона'), '8 (999) 123-45-67');
    await user.click(screen.getByRole('button', { name: 'Создать чат' }));

    expect(check).toHaveBeenCalledWith({ phoneNumber: 79991234567 });
    expect(useChatStore.getState().chats['10000000']).toMatchObject({ phone: '79991234567' });
    expect(useChatStore.getState().activeChatId).toBe('10000000');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('says when the number has no account in the messenger', async () => {
    const { onClose, user } = renderForm(() => Promise.resolve({ exists: false }));

    await user.type(screen.getByLabelText('Номер телефона'), '+7 999 123-45-67{Enter}');

    expect(await screen.findByText('Номера +7 999 123-45-67 нет в MAX')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('explains which numbers MAX accepts without calling the API', async () => {
    const { check, user } = renderForm(found);

    await user.type(screen.getByLabelText('Номер телефона'), '+44 20 7946 0958{Enter}');

    expect(screen.getByLabelText('Номер телефона')).toHaveAccessibleDescription(
      MESSENGERS.max.phoneHint,
    );
    expect(check).not.toHaveBeenCalled();
  });

  it('finds a Telegram user by username', async () => {
    const { check, user } = renderForm(found, MESSENGERS.telegram);

    await user.type(screen.getByLabelText('Номер телефона или @username'), '@durov_team{Enter}');

    expect(check).toHaveBeenCalledWith({ username: '@durov_team' });
    expect(useChatStore.getState().chats['10000000']).toMatchObject({ username: '@durov_team' });
  });

  it('shows API errors', async () => {
    const { user } = renderForm(() =>
      Promise.reject(new GreenApiError({ reason: 'check-limit', method: 'checkAccount' })),
    );

    await user.type(screen.getByLabelText('Номер телефона'), '+7 999 123-45-67{Enter}');

    expect(
      await screen.findByText('Превышен лимит проверок номеров. Попробуйте позже.'),
    ).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const { onClose, user } = renderForm(found);

    await user.type(screen.getByLabelText('Номер телефона'), '{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });
});
