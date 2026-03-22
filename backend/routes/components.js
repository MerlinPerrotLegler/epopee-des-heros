import { Router } from 'express';
import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';
import { parseJsonColumn } from '../db/sqlDialect.js';

const router = Router();

// List all components
router.get('/', async (req, res) => {
  const db = getDb();
  const rows = await db.prepare('SELECT * FROM components ORDER BY name').all();
  rows.forEach((r) => { r.definition = parseJsonColumn(r.definition); });
  res.json(rows);
});

// Get single component
router.get('/:id', async (req, res) => {
  const db = getDb();
  const row = await db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = parseJsonColumn(row.definition);
  res.json(row);
});

// Create component
router.post('/', async (req, res) => {
  const db = getDb();
  const { name, description, width_mm, height_mm, definition } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = randomUUID();
  const def = definition || { elements: [] };
  await db.prepare('INSERT INTO components (id, name, description, width_mm, height_mm, definition) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, name, description || null, width_mm || null, height_mm || null, JSON.stringify(def),
  );
  const row = await db.prepare('SELECT * FROM components WHERE id = ?').get(id);
  row.definition = parseJsonColumn(row.definition);
  res.status(201).json(row);
});

// Update component
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { name, description, width_mm, height_mm, definition, thumbnail } = req.body;
  await db.prepare(`UPDATE components SET
    name = COALESCE(?, name),
    description = COALESCE(?, description),
    width_mm = COALESCE(?, width_mm),
    height_mm = COALESCE(?, height_mm),
    definition = COALESCE(?, definition),
    thumbnail = COALESCE(?, thumbnail),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
  ).run(name, description, width_mm, height_mm, definition ? JSON.stringify(definition) : null, thumbnail ?? null, req.params.id);

  const row = await db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = parseJsonColumn(row.definition);
  res.json(row);
});

// Rename component (PATCH — metadata only)
router.patch('/:id', async (req, res) => {
  const db = getDb();
  const { name } = req.body;
  await db.prepare('UPDATE components SET name = COALESCE(?, name), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, req.params.id);
  const row = await db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = parseJsonColumn(row.definition);
  res.json(row);
});

// Duplicate component
router.post('/:id/duplicate', async (req, res) => {
  const db = getDb();
  const original = await db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Not found' });

  const id = randomUUID();
  const name = req.body.name || `${original.name} (copie)`;
  const defStr = typeof original.definition === 'string' ? original.definition : JSON.stringify(original.definition);
  await db.prepare('INSERT INTO components (id, name, description, width_mm, height_mm, definition) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, name, original.description, original.width_mm, original.height_mm, defStr,
  );
  const row = await db.prepare('SELECT * FROM components WHERE id = ?').get(id);
  row.definition = parseJsonColumn(row.definition);
  res.status(201).json(row);
});

// Delete component
router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM components WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
