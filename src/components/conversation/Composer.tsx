import { useId, useRef, useState } from 'react';
import { cx } from '../../lib/cx';
import { IconButton } from '../ui/IconButton';
import styles from './Composer.module.css';

interface ComposerProps {
  /** SendMessage limit of the current messenger. */
  maxLength: number;
  onSend: (text: string) => void;
}

/** The counter appears when the text gets this close to the limit. */
const COUNTER_MARGIN = 200;

export function Composer({ maxLength, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const counterId = useId();

  const message = text.trim();
  const tooLong = message.length > maxLength;
  const canSend = message !== '' && !tooLong;
  const showCounter = message.length > maxLength - COUNTER_MARGIN;

  const send = () => {
    if (!canSend) return;
    onSend(message);
    setText('');
    if (fieldRef.current) fieldRef.current.style.height = '';
  };

  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <div className={styles.field}>
        <textarea
          ref={fieldRef}
          className={styles.input}
          aria-label="Сообщение"
          aria-describedby={showCounter ? counterId : undefined}
          placeholder="Сообщение"
          rows={1}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            growToFit(event.target);
          }}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter starts a new line; Enter that finishes an IME input does neither.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
        />
        {showCounter && (
          <span id={counterId} className={cx(styles.counter, tooLong && styles.over)}>
            {message.length} / {maxLength}
          </span>
        )}
      </div>
      <IconButton
        type="submit"
        className={styles.send}
        icon="send"
        label="Отправить"
        disabled={!canSend}
      />
    </form>
  );
}

/** Grows the textarea with its text; CSS caps the height and scrolls the rest. */
function growToFit(field: HTMLTextAreaElement) {
  field.style.height = 'auto';
  field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
}
