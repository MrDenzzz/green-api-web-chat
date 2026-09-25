import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Composer } from './Composer';

function renderComposer(maxLength = 4000) {
  const onSend = vi.fn();
  render(<Composer maxLength={maxLength} onSend={onSend} />);
  return {
    onSend,
    field: screen.getByRole('textbox', { name: 'Сообщение' }),
    sendButton: screen.getByRole('button', { name: 'Отправить' }),
    user: userEvent.setup(),
  };
}

describe('Composer', () => {
  it('sends the text on Enter and clears the field', async () => {
    const { onSend, field, user } = renderComposer();

    await user.type(field, '  Привет!  {Enter}');

    expect(onSend).toHaveBeenCalledWith('Привет!');
    expect(field).toHaveValue('');
  });

  it('starts a new line on Shift+Enter', async () => {
    const { onSend, field, user } = renderComposer();

    await user.type(field, 'Первая{Shift>}{Enter}{/Shift}Вторая');

    expect(field).toHaveValue('Первая\nВторая');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send an empty message', async () => {
    const { onSend, field, sendButton, user } = renderComposer();

    await user.type(field, '   {Enter}');

    expect(sendButton).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('holds back a message longer than the messenger allows', async () => {
    const { onSend, field, sendButton, user } = renderComposer(10);

    await user.type(field, 'Очень длинный{Enter}');

    expect(field).toHaveAccessibleDescription('13 / 10');
    expect(sendButton).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
