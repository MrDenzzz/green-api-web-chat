import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  createGreenApiClient,
  type GreenApiClient,
  type GreenApiCredentials,
} from '../../api/client';
import { useSessionStore } from '../../store/session';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import {
  DEFAULT_API_URL,
  validateCredentials,
  type CredentialsErrors,
  type CredentialsForm,
} from './credentials';
import styles from './LoginForm.module.css';
import { verifyInstance } from './verifyInstance';

interface LoginFormProps {
  /** Injected in tests. */
  createClient?: (credentials: GreenApiCredentials) => GreenApiClient;
}

/** In the order the first invalid field gets focus. */
const FIELD_ORDER = ['idInstance', 'apiTokenInstance', 'apiUrl'] as const;

const INITIAL_FORM: CredentialsForm = {
  apiUrl: DEFAULT_API_URL,
  idInstance: '',
  apiTokenInstance: '',
};

export function LoginForm({ createClient = createGreenApiClient }: LoginFormProps) {
  const signIn = useSessionStore((state) => state.signIn);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<CredentialsErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [apiUrlShown, setApiUrlShown] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateCredentials(form);
    if (!validation.ok) {
      const { errors: fieldErrors } = validation;
      // Render the errors (and open the API address section) before moving focus there.
      flushSync(() => {
        setErrors(fieldErrors);
        if (fieldErrors.apiUrl) setApiUrlShown(true);
      });
      const firstInvalid = FIELD_ORDER.find((name) => fieldErrors[name]);
      const input = firstInvalid && event.currentTarget.elements.namedItem(firstInvalid);
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

  const fieldProps = {
    onChange: handleChange,
    disabled: checking,
    autoComplete: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(event)}
      noValidate
      aria-label="Вход"
    >
      <TextField
        label="idInstance"
        name="idInstance"
        inputMode="numeric"
        placeholder="3100123456"
        value={form.idInstance}
        error={errors.idInstance}
        {...fieldProps}
      />
      <TextField
        label="apiTokenInstance"
        name="apiTokenInstance"
        type="password"
        placeholder="Ключ доступа из личного кабинета"
        value={form.apiTokenInstance}
        error={errors.apiTokenInstance}
        {...fieldProps}
      />

      <details
        className={styles.advanced}
        open={apiUrlShown}
        onToggle={(event) => {
          setApiUrlShown(event.currentTarget.open);
        }}
      >
        <summary className={styles.summary}>Другой адрес API</summary>
        <TextField
          label="apiUrl"
          name="apiUrl"
          type="url"
          inputMode="url"
          placeholder={DEFAULT_API_URL}
          value={form.apiUrl}
          error={errors.apiUrl}
          hint="Нужен, только если общий адрес не подходит: свой apiUrl инстанса указан в личном кабинете."
          {...fieldProps}
        />
      </details>

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
