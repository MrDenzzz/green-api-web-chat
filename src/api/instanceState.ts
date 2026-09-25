/**
 * Explains a `stateInstance` value from getStateInstance or a stateInstanceChanged
 * notification. `null` means the instance is authorized and ready to work.
 */
export function describeInstanceState(state: string): string | null {
  switch (state) {
    case 'authorized':
      return null;
    case 'notAuthorized':
      return 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.';
    case 'blocked':
      return 'Аккаунт заблокирован мессенджером.';
    case 'starting':
      return 'Инстанс запускается. Это может занять до 5 минут.';
    case 'suspended':
      return 'На аккаунте временные ограничения на отправку сообщений.';
    case 'pendingPassword':
      return 'Для завершения авторизации нужен пароль двухфакторной аутентификации.';
    default:
      return `Неизвестное состояние инстанса: ${state}.`;
  }
}
