import { Router } from 'express';
import { db } from '../db/database';
import { refreshScheduler } from '../scheduler';
import type { JobTemplate } from '../types';

const router = Router();

type TemplateRow = {
  id: number;
  name: string;
  job_type: string;
  bot_username: string;
  timezone: string;
  reply_timeout_ms: number;
  retry_max: number;
  enabled: number;
  config: string | null;
  start_command: string;
  checkin_button: string;
  created_at: string;
};

function rowToTemplate(row: TemplateRow): JobTemplate {
  return {
    id: row.id,
    name: row.name,
    jobType: row.job_type as JobTemplate['jobType'],
    botUsername: row.bot_username,
    timezone: row.timezone,
    replyTimeoutMs: row.reply_timeout_ms,
    retryMax: row.retry_max,
    enabled: Boolean(row.enabled),
    config: row.config ?? null,
    startCommand: row.start_command || '/start',
    checkinButton: row.checkin_button || '签到',
    createdAt: row.created_at,
  };
}

// Sync template fields to all linked jobs (enabled is job-specific, not synced)
function syncLinkedJobs(templateId: number, t: TemplateRow) {
  db.prepare(`
    UPDATE jobs SET
      job_type = ?,
      bot_username = ?,
      timezone = ?,
      reply_timeout_ms = ?,
      retry_max = ?,
      config = ?,
      start_command = ?,
      checkin_button = ?
    WHERE template_id = ?
  `).run(
    t.job_type,
    t.bot_username,
    t.timezone,
    t.reply_timeout_ms,
    t.retry_max,
    t.config,
    t.start_command,
    t.checkin_button,
    templateId,
  );
  refreshScheduler();
}

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT t.*, COUNT(j.id) AS linked_job_count
    FROM job_templates t
    LEFT JOIN jobs j ON j.template_id = t.id
    GROUP BY t.id
    ORDER BY t.name COLLATE NOCASE
  `).all() as (TemplateRow & { linked_job_count: number })[];
  res.json(rows.map(r => ({ ...rowToTemplate(r), linkedJobCount: r.linked_job_count })));
});

router.post('/', (req, res) => {
  const {
    name,
    jobType,
    botUsername,
    timezone,
    replyTimeoutMs,
    retryMax,
    config,
    startCommand,
    checkinButton,
  } = req.body as Record<string, any>;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO job_templates
      (name, job_type, bot_username, timezone, reply_timeout_ms, retry_max, config, start_command, checkin_button)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    jobType ?? 'checkin',
    (botUsername as string | undefined)?.replace(/^@+/, '') ?? '',
    timezone ?? 'Australia/Sydney',
    Number(replyTimeoutMs ?? 40000),
    Number(retryMax ?? 5),
    config != null ? JSON.stringify(config) : null,
    (startCommand as string | undefined)?.trim() || '/start',
    (checkinButton as string | undefined)?.trim() || '签到',
  );

  const row = db.prepare('SELECT * FROM job_templates WHERE id = ?').get(result.lastInsertRowid) as TemplateRow;
  res.status(201).json(rowToTemplate(row));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM job_templates WHERE id = ?').get(req.params.id) as TemplateRow | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const {
    name,
    jobType,
    botUsername,
    timezone,
    replyTimeoutMs,
    retryMax,
    enabled,
    config,
    startCommand,
    checkinButton,
  } = req.body as Record<string, any>;

  const updated: TemplateRow = {
    ...existing,
    name: name ?? existing.name,
    job_type: jobType ?? existing.job_type,
    bot_username: (botUsername as string | undefined)?.replace(/^@+/, '') ?? existing.bot_username,
    timezone: timezone ?? existing.timezone,
    reply_timeout_ms: Number(replyTimeoutMs ?? existing.reply_timeout_ms),
    retry_max: Number(retryMax ?? existing.retry_max),
    enabled: enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
    config: config !== undefined
      ? (config != null ? JSON.stringify(config) : null)
      : existing.config,
    start_command: startCommand !== undefined
      ? ((startCommand as string).trim() || '/start')
      : existing.start_command,
    checkin_button: checkinButton !== undefined
      ? ((checkinButton as string).trim() || '签到')
      : existing.checkin_button,
  };

  db.prepare(`
    UPDATE job_templates SET
      name = ?, job_type = ?, bot_username = ?, timezone = ?,
      reply_timeout_ms = ?, retry_max = ?, enabled = ?,
      config = ?, start_command = ?, checkin_button = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.job_type,
    updated.bot_username,
    updated.timezone,
    updated.reply_timeout_ms,
    updated.retry_max,
    updated.enabled,
    updated.config,
    updated.start_command,
    updated.checkin_button,
    req.params.id,
  );

  syncLinkedJobs(Number(req.params.id), updated);

  const row = db.prepare('SELECT * FROM job_templates WHERE id = ?').get(req.params.id) as TemplateRow;
  res.json(rowToTemplate(row));
});

router.delete('/:id', (req, res) => {
  // ON DELETE SET NULL handles unlinking jobs
  db.prepare('DELETE FROM job_templates WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
