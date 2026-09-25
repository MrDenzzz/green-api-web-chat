import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import {
  createGreenApiClient,
  type GreenApiClient,
  type GreenApiCredentials,
} from '../../api/client';
import { useSessionStore } from '../../store/session';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { validateCredentials, type CredentialsErrors, type CredentialsForm } from './credentials';
import styles from './LoginForm.module.css';
import { verifyInstance } from './verifyInstance';

interface LoginFormProps {
  /** Injected in tests. */
  createClient?: (credentials: GreenApiCredentials) => GreenApiClient;
}

const FIELDS = [
  {
    name: 'apiUrl',
    placeholder: 'https://3100.api.green-api.com',
    type: 'url',
    inputMode: 'url',
  },
  { name: 'idInstance', placeholder: '3100123456', type: 'text', inputMode: 'numeric' },
  {
    name: 'apiTokenInstance',
    placeholder: 'Ключ доступа из личного кабинета',
    type: 'password',
    inputMode: 'text',
  },
] as const;

const EMPTY_FORM: CredentialsForm = { apiUrl: '', idInstance: '', apiTokenInstance: '' };

export function LoginForm({ createClient = createGreenApiClient }: LoginFormProps) {
  const signIn = useSessionStore((state) => state.signIn);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<CredentialsErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateCredentials(form);
    if (!validation.ok) {
      setErrors(validation.errors);
      const firstInvalid = FIELDS.find((field) => validation.errors[field.name]);
      const input = firstInvalid && event.currentTarget.elements.namedItem(firstInvalid.name);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }

    setFormError(null);
    setChecking(true);
    const result = await verifyInstance(
      createClient(validation.credentials),
      validation.credentials,
    );
    if (result.ok) {
      signIn(result.session, result.settings);
    } else {
      setChecking(false);
      setFormError(result.error);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-label="Вход"
    >
      {FIELDS.map((field) => (
        <TextField
          key={field.name}
          label={field.name}
          name={field.name}
          type={field.type}
          inputMode={field.inputMode}
          placeholder={field.placeholder}
          value={form[field.name]}
          onChange={handleChange}
          error={errors[field.name]}
          disabled={checking}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      ))}
      {formError && (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      )}
      <Button type="submit" loading={checking} block>
        {checking ? 'Проверяем инстанс…' : 'Войти'}
      </Button>
    </form>
  );
}
