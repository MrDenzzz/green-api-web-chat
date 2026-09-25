import { Logo } from '../ui/Logo';
import { LoginForm } from './LoginForm';
import styles from './LoginScreen.module.css';

export function LoginScreen() {
  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Logo />
          <h1 className={styles.title}>Web Chat</h1>
          <p className={styles.subtitle}>Сообщения MAX и Telegram через GREEN-API</p>
        </header>

        <LoginForm />

        <section className={styles.help}>
          <h2 className={styles.helpTitle}>Где взять данные</h2>
          <ol className={styles.steps}>
            <li>
              Создайте инстанс MAX или Telegram в{' '}
              <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
                личном кабинете GREEN-API
              </a>
              .
            </li>
            <li>Авторизуйте инстанс: отсканируйте QR-код в приложении мессенджера.</li>
            <li>Скопируйте apiUrl, idInstance и apiTokenInstance со страницы инстанса.</li>
          </ol>
          <p>Данные для входа хранятся только в этом браузере.</p>
        </section>
      </div>
    </main>
  );
}
