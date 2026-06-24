import { TelegramClient, Api, Logger } from 'telegram';
import { LogLevel } from 'telegram/extensions/Logger';
import { StringSession } from 'telegram/sessions';
import type { TgProxy } from '../types';

type PendingAuth = {
  client: TelegramClient;
  phoneNumber: string;
  phoneCodeHash: string;
  step: 'code' | '2fa';
};

// In-memory pending auth sessions keyed by account ID
const pending = new Map<number, PendingAuth>();

export async function requestCode(accountId: number, apiId: number, apiHash: string, phoneNumber: string, proxy?: TgProxy): Promise<void> {
  const existing = pending.get(accountId);
  if (existing) {
    await existing.client.disconnect().catch(() => undefined);
    pending.delete(accountId);
  }

  const client = new TelegramClient(
    new StringSession(''),
    apiId,
    apiHash,
    { connectionRetries: 3, baseLogger: new Logger(LogLevel.NONE), ...(proxy ? { proxy } : {}) },
  );
  await client.connect();

  const { phoneCodeHash } = await client.sendCode({ apiId, apiHash }, phoneNumber);
  pending.set(accountId, { client, phoneNumber, phoneCodeHash, step: 'code' });
}

export async function submitCode(
  accountId: number,
  code: string
): Promise<{ needsPassword: boolean; session?: string }> {
  const entry = pending.get(accountId);
  if (!entry || entry.step !== 'code') throw new Error('No pending code auth for this account');

  try {
    await entry.client.invoke(new Api.auth.SignIn({
      phoneNumber: entry.phoneNumber,
      phoneCodeHash: entry.phoneCodeHash,
      phoneCode: code,
    }));

    const session = entry.client.session.save() as unknown as string;
    await entry.client.disconnect();
    pending.delete(accountId);
    return { needsPassword: false, session };
  } catch (err: any) {
    if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      entry.step = '2fa';
      return { needsPassword: true };
    }
    throw err;
  }
}

export async function submitPassword(accountId: number, password: string): Promise<string> {
  const entry = pending.get(accountId);
  if (!entry || entry.step !== '2fa') throw new Error('No pending 2FA for this account');

  // Dynamic import to avoid issues with module resolution
  const { computeCheck } = await import('telegram/Password');
  const passwordInfo = await entry.client.invoke(new Api.account.GetPassword());
  const passwordSrp = await computeCheck(passwordInfo, password);
  await entry.client.invoke(new Api.auth.CheckPassword({ password: passwordSrp }));

  const session = entry.client.session.save() as unknown as string;
  await entry.client.disconnect();
  pending.delete(accountId);
  return session;
}
