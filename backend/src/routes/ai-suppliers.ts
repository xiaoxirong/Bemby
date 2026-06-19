import { Router } from 'express';
import { db } from '../db/database';

const router = Router();

type SupplierRow = { id: number; name: string; base_url: string; api_key: string; timeout_ms: number };
type ModelRow    = { id: number; supplier_id: number; model_id: string; label: string | null };

function listAll() {
  const suppliers = db.prepare('SELECT * FROM ai_suppliers ORDER BY id').all() as SupplierRow[];
  const models    = db.prepare('SELECT * FROM ai_models ORDER BY id').all() as ModelRow[];
  return suppliers.map(s => ({ ...s, models: models.filter(m => m.supplier_id === s.id) }));
}

router.get('/', (_req, res) => {
  res.json(listAll());
});

router.post('/', (req, res) => {
  const { name, base_url, api_key = '', timeout_ms = 25000 } = req.body as Partial<SupplierRow>;
  if (!name?.trim() || !base_url?.trim()) {
    res.status(400).json({ error: 'name and base_url are required' });
    return;
  }
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO ai_suppliers (name, base_url, api_key, timeout_ms) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), base_url.trim(), (api_key ?? '').trim(), Number(timeout_ms));
  res.json(db.prepare('SELECT * FROM ai_suppliers WHERE id = ?').get(lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM ai_suppliers WHERE id = ?').get(id) as SupplierRow | undefined;
  if (!existing) { res.status(404).json({ error: 'Supplier not found' }); return; }

  const { name, base_url, api_key, timeout_ms } = req.body as Partial<SupplierRow>;
  db.prepare('UPDATE ai_suppliers SET name = ?, base_url = ?, api_key = ?, timeout_ms = ? WHERE id = ?').run(
    name?.trim()    ?? existing.name,
    base_url?.trim() ?? existing.base_url,
    api_key !== undefined ? api_key.trim() : existing.api_key,
    timeout_ms !== undefined ? Number(timeout_ms) : existing.timeout_ms,
    id,
  );
  res.json(db.prepare('SELECT * FROM ai_suppliers WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ai_suppliers WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.post('/:id/models', (req, res) => {
  const supplierId = Number(req.params.id);
  const { model_id, label } = req.body as { model_id?: string; label?: string };
  if (!model_id?.trim()) { res.status(400).json({ error: 'model_id is required' }); return; }
  if (!db.prepare('SELECT id FROM ai_suppliers WHERE id = ?').get(supplierId)) {
    res.status(404).json({ error: 'Supplier not found' }); return;
  }
  const { lastInsertRowid } = db.prepare(
    'INSERT INTO ai_models (supplier_id, model_id, label) VALUES (?, ?, ?)'
  ).run(supplierId, model_id.trim(), label?.trim() || null);
  res.json(db.prepare('SELECT * FROM ai_models WHERE id = ?').get(lastInsertRowid));
});

router.delete('/:id/models/:modelId', (req, res) => {
  db.prepare('DELETE FROM ai_models WHERE id = ?').run(Number(req.params.modelId));
  res.json({ ok: true });
});

export default router;
