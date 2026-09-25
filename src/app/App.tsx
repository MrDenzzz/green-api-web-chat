import { LoginScreen } from '../components/login/LoginScreen';
import { MessengerScreen } from '../components/messenger/MessengerScreen';
import { useSessionStore } from '../store/session';

export function App() {
  const session = useSessionStore((state) => state.session);
  return session ? <MessengerScreen session={session} /> : <LoginScreen />;
}
