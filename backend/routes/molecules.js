import { Router } from 'express';
import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM molecules ORDER BY name').all();
  rows.forEach(r => r.definition = JSON.parse(r.definition));
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM molecules WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = JSON.parse(row.definition);
  res.json(row);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, definition } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = randomUUID();
  db.prepare('INSERT INTO molecules (id, name, description, definition) VALUES (?, ?, ?, ?)').run(
    id, name, description || null, JSON.stringify(definition || { width_mm: 20, height_mm: 10, atoms: [] })
  );
  const row = db.prepare('SELECT * FROM molecules WHERE id = ?').get(id);
  row.definition = JSON.parse(row.definition);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, description, definition } = req.body;
  db.prepare(`UPDATE molecules SET 
    name = COALESCE(?, name), description = COALESCE(?, description),
    definition = COALESCE(?, definition), updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, description, definition ? JSON.stringify(definition) : null, req.params.id);
  const row = db.prepare('SELECT * FROM molecules WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = JSON.parse(row.definition);
  res.json(row);
});

router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const orig = db.prepare('SELECT * FROM molecules WHERE id = ?').get(req.params.id);
  if (!orig) return res.status(404).json({ error: 'Not found' });
  const id = randomUUID();
  db.prepare('INSERT INTO molecules (id, name, description, definition) VALUES (?, ?, ?, ?)').run(
    id, req.body.name || `${orig.name} (copie)`, orig.description, orig.definition
  );
  const row = db.prepare('SELECT * FROM molecules WHERE id = ?').get(id);
  row.definition = JSON.parse(row.definition);
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM molecules WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
