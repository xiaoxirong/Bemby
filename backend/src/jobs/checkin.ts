import { TelegramClient, Api, Logger } from 'telegram';
import { LogLevel } from 'telegram/extensions/Logger';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent, Raw } from 'telegram/events';

export type CheckinAttemptLog = {
  attempt: number;
  commandSent: string;
  hasMedia: boolean;
  commandResponseHtml: string;
  commandResponseImage?: string;
  availableButtons: string[][];
  buttonClicked?: string;
  callbackAnswer?: string;
  // Bot's follow-up message after the button click
  buttonResponseHtml?: string;
  buttonResponseHasMedia?: boolean;
  buttonResponseImage?: string;
  buttonResponseButtons?: string[][];
  error?: string;
};

export class CheckinError extends Error {
  constructor(message: string, public readonly log: CheckinAttemptLog) {
    super(message);
    this.name = 'CheckinError';
  }
}

// Carries partial messages when timeout fires before a buttons-message arrives
class BotReplyTimeoutError extends Error {
  constructor(ms: number, public readonly partial: Api.Message[]) {
    super(`Timed out after ${ms}ms waiting for bot reply`);
    this.name = 'BotReplyTimeoutError';
  }
}

// ── Command template expansion ────────────────────────────────────────────────

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const ALNUM = LOWER + UPPER + DIGITS;

function pick(chars: string, len: number): string {
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Expands template placeholders before sending a command.
 * Syntax: {type} or {type:length}
 * Types: word (lowercase), WORD (uppercase), num (digits), alpha (mixed alnum), uuid
 */
export function expandCommand(template: string): string {
  return template.replace(/\{(\w+)(?::(\d+))?\}/g, (match, type: string, lenStr?: string) => {
    const len = lenStr ? parseInt(lenStr, 10) : 0;
    switch (type) {
      case 'word':  return pick(LOWER, len || 6);
      case 'WORD':  return pick(UPPER, len || 6);
      case 'num':   return pick(DIGITS, len || 6);
      case 'alpha': return pick(ALNUM, len || 8);
      case 'uuid': {
        // RFC 4122 v4
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      }
      default: return match; // unknown placeholder — leave as-is
    }
  });
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function messageToHtml(text: string, entities?: Api.TypeMessageEntity[]): string {
  if (!entities?.length) return escapeHtml(text).replace(/\n/g, '<br>');

  type Ins = { pos: number; html: string; isClose: boolean };
  const ins: Ins[] = [];

  for (const e of entities) {
    const end = e.offset + e.length;
    if (e instanceof Api.MessageEntityBold) {
      ins.push({ pos: e.offset, html: '<strong>', isClose: false });
      ins.push({ pos: end, html: '</strong>', isClose: true });
    } else if (e instanceof Api.MessageEntityItalic) {
      ins.push({ pos: e.offset, html: '<em>', isClose: false });
      ins.push({ pos: end, html: '</em>', isClose: true });
    } else if (e instanceof Api.MessageEntityCode) {
      ins.push({ pos: e.offset, html: '<code>', isClose: false });
      ins.push({ pos: end, html: '</code>', isClose: true });
    } else if (e instanceof Api.MessageEntityPre) {
      ins.push({ pos: e.offset, html: '<pre>', isClose: false });
      ins.push({ pos: end, html: '</pre>', isClose: true });
    } else if (e instanceof Api.MessageEntityUnderline) {
      ins.push({ pos: e.offset, html: '<u>', isClose: false });
      ins.push({ pos: end, html: '</u>', isClose: true });
    } else if (e instanceof Api.MessageEntityStrike) {
      ins.push({ pos: e.offset, html: '<s>', isClose: false });
      ins.push({ pos: end, html: '</s>', isClose: true });
    } else if (e instanceof Api.MessageEntityUrl) {
      const url = escapeHtml(text.slice(e.offset, end));
      ins.push({ pos: e.offset, html: `<a href="${url}" target="_blank" rel="noopener">`, isClose: false });
      ins.push({ pos: end, html: '</a>', isClose: true });
    } else if (e instanceof Api.MessageEntityTextUrl) {
      const url = escapeHtml((e as Api.MessageEntityTextUrl).url ?? '');
      ins.push({ pos: e.offset, html: `<a href="${url}" target="_blank" rel="noopener">`, isClose: false });
      ins.push({ pos: end, html: '</a>', isClose: true });
    } else if (e instanceof Api.MessageEntityBotCommand) {
      ins.push({ pos: e.offset, html: '<span style="color:#2563eb">', isClose: false });
      ins.push({ pos: end, html: '</span>', isClose: true });
    }
  }

  // Sort: by position; close tags before open tags at same position (correct nesting)
  ins.sort((a, b) => a.pos - b.pos || (a.isClose ? -1 : 1) - (b.isClose ? -1 : 1));

  let result = '';
  let pos = 0;
  for (const { pos: iPos, html } of ins) {
    if (iPos > pos) result += escapeHtml(text.slice(pos, iPos));
    result += html;
    pos = iPos;
  }
  result += escapeHtml(text.slice(pos));
  return result.replace(/\n/g, '<br>');
}

// Renders a Telegram web page preview as inline HTML (inline styles required for v-html)
function webpageToHtml(wp: Api.WebPage): string {
  const site = escapeHtml(wp.siteName || wp.displayUrl || '');
  const title = escapeHtml(wp.title ?? '');
  const desc = escapeHtml(wp.description ?? '');
  let html = '<div style="border-left:3px solid #4a9eff;padding:3px 0 3px 8px;margin-top:6px;font-size:12px;line-height:1.4">';
  if (site) html += `<div style="color:#4a9eff;font-weight:500">${site}</div>`;
  if (title) html += `<div style="font-weight:600;color:#111">${title}</div>`;
  if (desc) html += `<div style="color:#555;margin-top:1px">${desc}</div>`;
  html += '</div>';
  return html;
}

type ParsedMessages = {
  html: string;
  hasMedia: boolean;
  image?: string;
  buttons: string[][];
};

// Extracts display data from a set of bot messages
async function parseMessages(
  messages: Api.Message[],
  client: TelegramClient,
  signal?: AbortSignal,
): Promise<ParsedMessages> {
  const hasMedia = messages.some(
    m => m.media instanceof Api.MessageMediaPhoto || m.media instanceof Api.MessageMediaDocument,
  );

  const htmlParts: string[] = [];
  for (const m of messages) {
    const textHtml = messageToHtml(m.message, m.entities as Api.TypeMessageEntity[] | undefined);
    let msgHtml = textHtml;
    if (m.media instanceof Api.MessageMediaWebPage && m.media.webpage instanceof Api.WebPage) {
      msgHtml += webpageToHtml(m.media.webpage);
    }
    if (msgHtml.trim()) htmlParts.push(msgHtml);
  }
  const html = htmlParts.join('<hr style="margin:8px 0;border:none;border-top:1px solid #d0d0d0">');

  const buttons: string[][] = [];
  const buttonsMsg = [...messages].reverse().find(m => m.buttons);
  if (buttonsMsg) {
    for (const row of (buttonsMsg as any).buttons ?? []) {
      const rowTexts = (row as any[]).map((btn: any) => btn.text as string);
      if (rowTexts.length) buttons.push(rowTexts);
    }
  }

  let image: string | undefined;
  const mediaMsg = messages.find(m => m.media instanceof Api.MessageMediaPhoto);
  if (mediaMsg?.media instanceof Api.MessageMediaPhoto && !signal?.aborted) {
    try {
      const photo = mediaMsg.media.photo;
      if (photo instanceof Api.Photo) {
        const mSize = photo.sizes.find(
          (s): s is Api.PhotoSize => s instanceof Api.PhotoSize && s.type === 'm'
        ) ?? photo.sizes[1] ?? photo.sizes[0];
        if (mSize) {
          const bytes = await client.downloadMedia(mediaMsg, { thumb: mSize }) as Buffer | undefined;
          if (bytes) image = `data:image/jpeg;base64,${bytes.toString('base64')}`;
        }
      }
    } catch { /* skip image on error */ }
  }

  return { html, hasMedia, image, buttons };
}

// Collects ALL bot messages; resolves when one has buttons, times out otherwise
function waitForBotReply(
  client: TelegramClient,
  botUsername: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Api.Message[]> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Job cancelled')); return; }

    const collected: Api.Message[] = [];

    const cleanup = () => {
      clearTimeout(timer);
      client.removeEventHandler(handler, new NewMessage({}));
      signal?.removeEventListener('abort', onAbort);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new BotReplyTimeoutError(timeoutMs, collected));
    }, timeoutMs);

    const onAbort = () => { cleanup(); reject(new Error('Job cancelled')); };
    signal?.addEventListener('abort', onAbort, { once: true });

    const handler = async (event: NewMessageEvent) => {
      const msg = event.message as Api.Message;
      collected.push(msg);
      if (msg.buttons) { cleanup(); resolve(collected); }
    };

    client.addEventHandler(handler, new NewMessage({ fromUsers: [botUsername] }));
  });
}

// Watches for an in-place edit of a specific message (bot edits the original reply).
// Uses raw Telegram updates since GramJS has no dedicated EditedMessage event.
// Never rejects -- resolves null on timeout or abort.
function waitForBotMessageEdit(
  client: TelegramClient,
  originalMsgId: number,
  maxMs: number,
  signal?: AbortSignal,
): Promise<Api.Message | null> {
  return new Promise((resolve) => {
    if (signal?.aborted) { resolve(null); return; }

    const finish = (msg: Api.Message | null) => {
      clearTimeout(timer);
      client.removeEventHandler(handler, new Raw({}));
      signal?.removeEventListener('abort', onAbort);
      resolve(msg);
    };

    const timer = setTimeout(() => finish(null), maxMs);
    const onAbort = () => finish(null);
    signal?.addEventListener('abort', onAbort, { once: true });

    const handler = async (update: any) => {
      const isEdit =
        update.className === 'UpdateEditMessage' ||
        update.className === 'UpdateEditChannelMessage';
      if (isEdit && (update.message as Api.Message)?.id === originalMsgId) {
        finish(update.message as Api.Message);
      }
    };

    client.addEventHandler(handler, new Raw({}));
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
  attempt = 1,
  signal?: AbortSignal,
): Promise<CheckinAttemptLog> {
  const log: CheckinAttemptLog = {
    attempt, commandSent: startCommand, hasMedia: false,
    commandResponseHtml: '', availableButtons: [] as string[][],
  };

  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
    autoReconnect: false,
    baseLogger: new Logger(LogLevel.NONE),
  });

  await client.connect();

  try {
    if (signal?.aborted) throw new Error('Job cancelled');
    const expandedCommand = expandCommand(startCommand);
    log.commandSent = expandedCommand; // record what was actually sent, not the template
    const replyPromise = waitForBotReply(client, botUsername, replyTimeoutMs, signal);
    await client.sendMessage(botUsername, { message: expandedCommand });

    let messages: Api.Message[];
    try {
      messages = await replyPromise;
    } catch (err) {
      if (err instanceof BotReplyTimeoutError && err.partial.length > 0) {
        const parsed = await parseMessages(err.partial, client, signal);
        log.hasMedia = parsed.hasMedia;
        log.commandResponseHtml = parsed.html;
        log.commandResponseImage = parsed.image;
        log.availableButtons = parsed.buttons;
      }
      throw err;
    }

    const parsed = await parseMessages(messages, client, signal);
    log.hasMedia = parsed.hasMedia;
    log.commandResponseHtml = parsed.html;
    log.commandResponseImage = parsed.image;
    log.availableButtons = parsed.buttons;

    const buttonsMsg = [...messages].reverse().find(m => m.buttons);
    if (!buttonsMsg) throw new Error('No message with buttons received');

    if (signal?.aborted) throw new Error('Job cancelled');
    const peer = await client.getInputEntity(botUsername);
    let clicked = false;

    for (const row of (buttonsMsg as any).buttons ?? []) {
      for (const btn of row) {
        if (btn.text.includes(checkinButton)) {
          // Start watching for an edit BEFORE invoking to avoid a race condition
          const editPromise = waitForBotMessageEdit(client, buttonsMsg.id, 10_000, signal);

          const callbackData = (btn.button as Api.KeyboardButtonCallback).data;
          const answer = await client.invoke(new Api.messages.GetBotCallbackAnswer({
            peer,
            msgId: buttonsMsg.id,
            data: callbackData,
          })) as Api.messages.BotCallbackAnswer;
          log.buttonClicked = btn.text;
          if (answer.message) log.callbackAnswer = answer.message;
          clicked = true;

          // Wait for the bot to edit the original message in place
          const editedMsg = await editPromise;
          if (editedMsg && !signal?.aborted) {
            const bp = await parseMessages([editedMsg], client, signal);
            if (bp.html || bp.hasMedia) {
              log.buttonResponseHtml = bp.html || undefined;
              log.buttonResponseHasMedia = bp.hasMedia || undefined;
              log.buttonResponseImage = bp.image;
              log.buttonResponseButtons = bp.buttons.length ? bp.buttons : undefined;
            }
          }
          break;
        }
      }
      if (clicked) break;
    }

    if (!clicked) throw new Error(`Button "${checkinButton}" not found in bot reply`);

    return log;
  } catch (err: any) {
    log.error = err?.message ?? String(err);
    throw new CheckinError(log.error!, log);
  } finally {
    // GramJS throws TIMEOUT when the update loop stops on disconnect; always swallow here
    try { await client.disconnect(); } catch { /* ignore */ }
  }
}
