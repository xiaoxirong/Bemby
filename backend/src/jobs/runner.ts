import type { Job, TgAccount, EmbywatchConfig } from '../types';
import { runCheckin } from './checkin';
import { runEmbywatch } from './embywatch';

const RETRY_DELAY_MS = 5_000;

export async function runJob(job: Job, account: TgAccount | null): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= job.retryMax; attempt++) {
    try {
      switch (job.jobType) {
        case 'checkin': {
          if (!account) throw new Error('No account linked to this job');
          if (!account.sessionString) throw new Error('Account has no session -- authenticate first');
          await runCheckin(account.apiId, account.apiHash, account.sessionString, job.botUsername, job.replyTimeoutMs, job.startCommand, job.checkinButton);
          break;
        }
        case 'embywatch': {
          let config: EmbywatchConfig = JSON.parse(job.config ?? '{}');
          // Migrate legacy double-encoded records
          if (typeof config === 'string') config = JSON.parse(config) as EmbywatchConfig;
          if (!config.username || !config.password) throw new Error('Emby username and password are required');
          // botUsername holds the server URL for embywatch jobs
          await runEmbywatch(job.botUsername, config);
          break;
        }
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }
      return;
    } catch (err) {
      lastError = err;
      console.error(`[runner] Job "${job.name}" attempt ${attempt}/${job.retryMax} failed:`, err);
      if (attempt < job.retryMax) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError;
}
