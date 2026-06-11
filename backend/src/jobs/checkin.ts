import { TelegramClient, Api, Logger } from 'telegram';
import { LogLevel } from 'telegram/extensions/Logger';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';

function waitForBotReply(client: TelegramClient, botUsername: string, timeoutMs: number): Promise<Api.Message> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.removeEventHandler(handler, new NewMessage({}));
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for bot reply`));
    }, timeoutMs);

    const handler = async (event: NewMessageEvent) => {
      if (!event.message.buttons) return;
      clearTimeout(timer);
      client.removeEventHandler(handler, new NewMessage({}));
      resolve(event.message as Api.Message);
    };

    client.addEventHandler(handler, new NewMessage({ fromUsers: [botUsername] }));
  });
}

export async function runCheckin(
  apiId: number,
  apiHash: string,
  sessionString: string,
  botUsername: string,
  replyTimeoutMs = 40_000,
  startCommand = '/start',
  checkinButton = '签到',
): Promise<void> {
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
    autoReconnect: false,
    baseLogger: new Logger(LogLevel.NONE),
  });

  await client.connect();

  const replyPromise = waitForBotReply(client, botUsername, replyTimeoutMs);
  await client.sendMessage(botUsername, { message: startCommand });
  const msg = await replyPromise;

  const peer = await client.getInputEntity(botUsername);
  let clicked = false;

  for (const row of (msg as any).buttons ?? []) {
    for (const btn of row) {
      if (btn.text.includes(checkinButton)) {
        const callbackData = (btn.button as Api.KeyboardButtonCallback).data;
        await client.invoke(new Api.messages.GetBotCallbackAnswer({
          peer,
          msgId: msg.id,
          data: callbackData,
        }));
        clicked = true;
        break;
      }
    }
    if (clicked) break;
  }

  // GramJS throws TIMEOUT when the update loop stops on disconnect; safe to ignore
  try { await client.disconnect(); } catch (err: any) {
    if (err?.message !== 'TIMEOUT') throw err;
  }

  if (!clicked) {
    throw new Error(`Button "${checkinButton}" not found in bot reply`);
  }
}
