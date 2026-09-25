import { useId, useState, type SubmitEvent } from 'react';
import type { GreenApiClient } from '../../api/client';
import { describeError } from '../../api/errors';
import type { MessengerProfile } from '../../api/messengers';
import { formatPhone, parseRecipient, type Recipient } from '../../lib/phone';
import type { NewChat } from '../../store/chatReducer';
import { useChatStore } from '../../store/chatStore';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { TextField } from '../ui/TextField';
import styles from './NewChatForm.module.css';

interface NewChatFormProps {
  client: GreenApiClient;
  messenger: MessengerProfile;
  onClose: () => void;
}

/** Finds the recipient with CheckAccount: incoming messages carry its chatId, not the phone. */
export function NewChatForm({ client, messenger, onClose }: NewChatFormProps) {
  const dispatch = useChatStore((state) => state.dispatch);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const titleId = useId();

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseRecipient(value, messenger);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const { recipient } = parsed;
    setError(undefined);
    setChecking(true);
    try {
      const account = await client.checkAccount(
        recipient.kind === 'phone'
          ? { phoneNumber: Number(recipient.phone) }
          : { username: recipient.username },
      );
      if (!account.exists) {
        setError(`${describeRecipient(recipient)} нет в ${messenger.name}`);
        setChecking(false);
        return;
      }

      const chat: NewChat =
        recipient.kind === 'phone'
          ? { chatId: account.chatId, phone: recipient.phone }
          : { chatId: account.chatId, username: recipient.username };
      dispatch({ type: 'chat/added', chat, timestamp: Date.now() });
      setActiveChat(account.chatId);
      onClose();
    } catch (checkError) {
      setError(describeError(checkError));
      setChecking(false);
    }
  };

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <IconButton icon="back" label="Назад к чатам" onClick={onClose} />
        <h2 className={styles.title} id={titleId}>
          Новый чат
        </h2>
      </header>
      <form
        className={styles.form}
        aria-labelledby={titleId}
        onSubmit={(event) => void handleSubmit(event)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        noValidate
      >
        <TextField
          label={
            messenger.supportsUsernameLookup ? 'Номер телефона или @username' : 'Номер телефона'
          }
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(undefined);
          }}
          placeholder="+7 999 123-45-67"
          inputMode={messenger.supportsUsernameLookup ? 'text' : 'tel'}
          hint={
            messenger.supportsUsernameLookup
              ? 'Номер в международном формате или имя пользователя'
              : 'Номера России (+7) и Беларуси (+375)'
          }
          error={error}
          disabled={checking}
          autoComplete="off"
          autoFocus
        />
        <Button type="submit" loading={checking} block>
          Создать чат
        </Button>
      </form>
    </div>
  );
}

function describeRecipient(recipient: Recipient): string {
  return recipient.kind === 'phone'
    ? `Номера ${formatPhone(recipient.phone)}`
    : `Пользователя ${recipient.username}`;
}
