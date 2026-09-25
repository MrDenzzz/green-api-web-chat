import type { GreenApiClient, GreenApiCredentials } from '../../api/client';
import { describeError } from '../../api/errors';
import { describeInstanceState } from '../../api/instanceState';
import { detectMessenger } from '../../api/messengers';
import type { InstanceSettings } from '../../api/schemas';
import type { Session } from '../../store/session';

export type VerificationResult =
  { ok: true; session: Session; settings: InstanceSettings } | { ok: false; error: string };

/**
 * Signs in in two steps: getStateInstance proves the credentials and that the instance
 * is authorized in the messenger, getSettings tells MAX from Telegram.
 */
export async function verifyInstance(
  client: GreenApiClient,
  credentials: GreenApiCredentials,
): Promise<VerificationResult> {
  try {
    const problem = describeInstanceState(await client.getStateInstance());
    if (problem) return { ok: false, error: problem };

    const settings = await client.getSettings();
    const messenger = detectMessenger(settings.typeInstance);
    if (!messenger) {
      return {
        ok: false,
        error: `Приложение работает с инстансами MAX и Telegram, а это ${settings.typeInstance ?? 'инстанс неизвестного типа'}.`,
      };
    }

    return {
      ok: true,
      session: { credentials, messengerId: messenger.id, wid: settings.wid },
      settings,
    };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}
