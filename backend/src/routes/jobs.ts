import { Router } from 'express';
import { db } from '../db/database';
import { runJob } from '../jobs/runner';
import { refreshScheduler } from '../scheduler';
import type { Job, TgAccount } from '../types';

const router = Router();

type JobRow = {
  id: number;
  name: string;
  account_id: number | null;
  job_type: string;
  bot_username: string;
  schedule_window_start: number;
  schedule_window_end: number;
  timezone: string;
  reply_timeout_ms: number;
  retry_max: number;
  enabled: number;
  created_at: string;
  config: string | null;
  start_command: string;
  checkin_button: string;
  account_name?: string;
};

type AccountRow = {
  id: number;
  name: string;
  phone_number: string;
  api_id: number;
  api_hash: string;
  session_string: string | null;
  auth_status: string;
  created_at: string;
};

function rowToJob(row: JobRow): Job & { accountName?: string } {
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id ?? null,
    accountName: row.account_name,
    jobType: row.job_type as Job['jobType'],
    botUsername: row.bot_username,
    scheduleWindowStart: row.schedule_window_start,
    scheduleWindowEnd: row.schedule_window_end,
    timezone: row.timezone,
    replyTimeoutMs: row.reply_timeout_ms,
    retryMax: row.retry_max,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    config: row.config ?? null,
    startCommand: row.start_command || '/start',
    checkinButton: row.checkin_button || '签到',
  };
}

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT j.*, a.name AS account_name
    FROM jobs j
    LEFT JOIN tg_accounts a ON j.account_id = a.id
    ORDER BY j.id
  `).all() as JobRow[];
  res.json(rows.map(rowToJob));
});

router.post('/', (req, res) => {
  const {
    name, accountId, jobType, botUsername,
    scheduleWindowStart, scheduleWindowEnd, timezone,
    replyTimeoutMs, retryMax, enabled, config,
    startCommand, checkinButton,
  } = req.body as Record<string, any>;

  const resolvedType = jobType ?? 'checkin';
  if (!name || (resolvedType === 'checkin' && !accountId) || !botUsername) {
    res.status(400).json({ error: 'name and botUsername are required; accountId is required for checkin jobs' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO jobs
      (name, account_id, job_type, bot_username, schedule_window_start, schedule_window_end,
       timezone, reply_timeout_ms, retry_max, enabled, config, start_command, checkin_button)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, resolvedType === 'embywatch' ? null : Number(accountId), resolvedType, botUsername,
    Number(scheduleWindowStart ?? 1400), Number(scheduleWindowEnd ?? 1600),
    timezone ?? 'Australia/Sydney',
    Number(replyTimeoutMs ?? 40000), Number(retryMax ?? 5),
    enabled !== false ? 1 : 0,
    config != null ? JSON.stringify(config) : null,
    (startCommand as string | undefined)?.trim() || '/start',
    (checkinButton as string | undefined)?.trim() || '签到',
  );

  const row = db.prepare('SELECT j.*, a.name AS account_name FROM jobs j LEFT JOIN tg_accounts a ON j.account_id = a.id WHERE j.id = ?').get(result.lastInsertRowid) as JobRow;
  refreshScheduler();
  res.status(201).json(rowToJob(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id) as JobRow | undefined;
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const {
    name, accountId, jobType, botUsername,
    scheduleWindowStart, scheduleWindowEnd, timezone,
    replyTimeoutMs, retryMax, enabled, config,
    startCommand, checkinButton,
  } = req.body as Record<string, any>;

  const updatedType = jobType ?? existing.job_type;
  db.prepare(`
    UPDATE jobs SET
      name = ?, account_id = ?, job_type = ?, bot_username = ?,
      schedule_window_start = ?, schedule_window_end = ?, timezone = ?,
      reply_timeout_ms = ?, retry_max = ?, enabled = ?, config = ?,
      start_command = ?, checkin_button = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    updatedType === 'embywatch' ? null : Number(accountId ?? existing.account_id),
    updatedType,
    botUsername ?? existing.bot_username,
    Number(scheduleWindowStart ?? existing.schedule_window_start),
    Number(scheduleWindowEnd ?? existing.schedule_window_end),
    timezone ?? existing.timezone,
    Number(replyTimeoutMs ?? existing.reply_timeout_ms),
    Number(retryMax ?? existing.retry_max),
    enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
    config !== undefined ? (config != null ? JSON.stringify(config) : null) : existing.config,
    (startCommand as string | undefined)?.trim() || '/start',
    (checkinButton as string | undefined)?.trim() || '签到',
    req.params.id,
  );

  const row = db.prepare('SELECT j.*, a.name AS account_name FROM jobs j LEFT JOIN tg_accounts a ON j.account_id = a.id WHERE j.id = ?').get(req.params.id) as JobRow;
  refreshScheduler();
  res.json(rowToJob(row));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  refreshScheduler();
  res.status(204).send();
});

// Manual trigger
router.post('/:id/run', async (req, res) => {
  const jobRow = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id) as JobRow | undefined;
  if (!jobRow) { res.status(404).json({ error: 'Not found' }); return; }

  const job = rowToJob(jobRow);
  let account: TgAccount | null = null;

  if (job.jobType === 'checkin') {
    const accountRow = db.prepare('SELECT * FROM tg_accounts WHERE id = ?').get(jobRow.account_id) as AccountRow | undefined;
    if (!accountRow?.session_string) {
      res.status(400).json({ error: 'Account is not authenticated' });
      return;
    }
    account = {
      id: accountRow.id,
      name: accountRow.name,
      phoneNumber: accountRow.phone_number,
      apiId: accountRow.api_id,
      apiHash: accountRow.api_hash,
      sessionString: accountRow.session_string,
      authStatus: accountRow.auth_status as TgAccount['authStatus'],
      createdAt: accountRow.created_at,
    };
  }

  const ranAt = new Date().toISOString();
  const logResult = db.prepare(
    "INSERT INTO job_logs (job_id, ran_at, status, message, source) VALUES (?, ?, 'running', 'Manual run', 'manual')"
  ).run(job.id, ranAt);
  const logId = logResult.lastInsertRowid;

  res.json({ message: 'Job triggered', logId });

  runJob(job, account)
    .then(() => {
      db.prepare("UPDATE job_logs SET status = 'success', message = 'Completed' WHERE id = ?").run(logId);
    })
    .catch((err: Error) => {
      db.prepare("UPDATE job_logs SET status = 'failed', message = ? WHERE id = ?").run(err.message, logId);
    });
});

export default router;
