import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH ?? path.resolve(process.cwd(), 'data/bemby.db');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tg_accounts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    phone_number TEXT   NOT NULL,
    api_id      INTEGER NOT NULL,
    api_hash    TEXT    NOT NULL,
    session_string TEXT,
    auth_status TEXT    NOT NULL DEFAULT 'unauthenticated',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT    NOT NULL,
    account_id            INTEGER NOT NULL REFERENCES tg_accounts(id) ON DELETE CASCADE,
    job_type              TEXT    NOT NULL DEFAULT 'checkin',
    bot_username          TEXT    NOT NULL,
    schedule_window_start INTEGER NOT NULL DEFAULT 1400,
    schedule_window_end   INTEGER NOT NULL DEFAULT 1600,
    timezone              TEXT    NOT NULL DEFAULT 'Australia/Sydney',
    reply_timeout_ms      INTEGER NOT NULL DEFAULT 40000,
    retry_max             INTEGER NOT NULL DEFAULT 5,
    enabled               INTEGER NOT NULL DEFAULT 1,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS job_logs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id  INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    ran_at  TEXT    NOT NULL,
    status  TEXT    NOT NULL,
    message TEXT,
    source  TEXT    NOT NULL DEFAULT 'scheduler'
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('default_timezone',     'Australia/Sydney'),
    ('default_max_retry',    '5'),
    ('check_daily_run',      'true'),
    ('default_ua',           'SenPlayer/6.1.0 CFNetwork/1490.0.4 Darwin/23.2.0'),
    ('default_play_duration','300'),
    ('default_device_name',  'Mac');
`);

// Migrations for columns added after initial schema
try { db.exec("ALTER TABLE job_logs ADD COLUMN source TEXT NOT NULL DEFAULT 'scheduler'"); } catch {}
try { db.exec('ALTER TABLE jobs ADD COLUMN config TEXT'); } catch {}
try { db.exec("UPDATE settings SET value = 'Yamby' WHERE key = 'default_device_name' AND value = 'tg-runner'"); } catch {}
try { db.exec("UPDATE settings SET value = 'Mac' WHERE key = 'default_device_name' AND value = 'Yamby'"); } catch {}
try { db.exec("UPDATE settings SET value = 'SenPlayer/6.1.0 CFNetwork/1490.0.4 Darwin/23.2.0' WHERE key = 'default_ua' AND value = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'"); } catch {}
try { db.exec("ALTER TABLE jobs ADD COLUMN start_command TEXT NOT NULL DEFAULT '/start'"); } catch {}
try { db.exec("ALTER TABLE jobs ADD COLUMN checkin_button TEXT NOT NULL DEFAULT '签到'"); } catch {}

// Make account_id nullable so embywatch jobs don't require a Telegram account
try {
  const cols = db.prepare('PRAGMA table_info(jobs)').all() as Array<{ name: string; notnull: number }>;
  if (cols.find(c => c.name === 'account_id')?.notnull === 1) {
    db.exec(`
      CREATE TABLE jobs_v2 (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        name                  TEXT    NOT NULL,
        account_id            INTEGER REFERENCES tg_accounts(id) ON DELETE SET NULL,
        job_type              TEXT    NOT NULL DEFAULT 'checkin',
        bot_username          TEXT    NOT NULL,
        schedule_window_start INTEGER NOT NULL DEFAULT 1400,
        schedule_window_end   INTEGER NOT NULL DEFAULT 1600,
        timezone              TEXT    NOT NULL DEFAULT 'Australia/Sydney',
        reply_timeout_ms      INTEGER NOT NULL DEFAULT 40000,
        retry_max             INTEGER NOT NULL DEFAULT 5,
        enabled               INTEGER NOT NULL DEFAULT 1,
        created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
        config                TEXT
      );
      INSERT INTO jobs_v2 SELECT * FROM jobs;
      DROP TABLE jobs;
      ALTER TABLE jobs_v2 RENAME TO jobs;
    `);
    console.log('[db] Migrated jobs.account_id to nullable');
  }
} catch (e) { console.error('[db] account_id migration failed:', e); }
