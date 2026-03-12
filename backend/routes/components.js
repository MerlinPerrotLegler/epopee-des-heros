import { Router } from 'express';
import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';

const router = Router();

// List all components
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM components ORDER BY name').all();
  rows.forEach(r => r.definition = JSON.parse(r.definition));
  res.json(rows);
});

// Get single component
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = JSON.parse(row.definition);
  res.json(row);
});

// Create component
router.post('/', (req, res) => {
  const db = getDb();
  const { name, description, width_mm, height_mm, definition } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  
  const id = randomUUID();
  const def = definition || { elements: [] };
  db.prepare('INSERT INTO components (id, name, description, width_mm, height_mm, definition) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, name, description || null, width_mm || null, height_mm || null, JSON.stringify(def)
  );
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(id);
  row.definition = JSON.parse(row.definition);
  res.status(201).json(row);
});

// Update component
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, description, width_mm, height_mm, definition, thumbnail } = req.body;
  db.prepare(`UPDATE components SET
    name = COALESCE(?, name),
    description = COALESCE(?, description),
    width_mm = COALESCE(?, width_mm),
    height_mm = COALESCE(?, height_mm),
    definition = COALESCE(?, definition),
    thumbnail = COALESCE(?, thumbnail),
    updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, description, width_mm, height_mm, definition ? JSON.stringify(definition) : null, thumbnail ?? null, req.params.id);
  
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = JSON.parse(row.definition);
  res.json(row);
});

// Rename component (PATCH — metadata only)
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  db.prepare("UPDATE components SET name = COALESCE(?, name), updated_at = datetime('now') WHERE id = ?").run(name, req.params.id);
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = JSON.parse(row.definition);
  res.json(row);
});

// Duplicate component
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const original = db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Not found' });

  const id = randomUUID();
  const name = req.body.name || `${original.name} (copie)`;
  db.prepare('INSERT INTO components (id, name, description, width_mm, height_mm, definition) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, name, original.description, original.width_mm, original.height_mm, original.definition
  );
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(id);
  row.definition = JSON.parse(row.definition);
  res.status(201).json(row);
});

// Delete component
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM components WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
