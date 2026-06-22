import { Router } from "express";
import { db } from "../db/database";
import { refreshScheduler } from "../scheduler";

const router = Router();

type SettingRow = { key: string; value: string };

export const ALLOWED_KEYS = [
  "default_timezone",
  "default_max_retry",
  "check_daily_run",
  "default_ua",
  "default_play_duration",
  "default_device_name",
  "ai_model",
  "notify_tg_username",
  "notify_tg_events",
  "ua_presets",
  "proxies",
];

router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT key, value FROM settings")
    .all() as SettingRow[];
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

router.put("/", (req, res) => {
  const updates = req.body as Record<string, string>;
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
  );

  db.transaction(() => {
    for (const key of ALLOWED_KEYS) {
      if (key in updates) stmt.run(key, String(updates[key]));
    }
  })();

  // Reschedule if daily-run check toggled
  if ("check_daily_run" in updates) refreshScheduler();

  const rows = db
    .prepare("SELECT key, value FROM settings")
    .all() as SettingRow[];
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

export default router;
