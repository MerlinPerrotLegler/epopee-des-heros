import { Router } from 'express';
import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';

const router = Router();

// List card instances (optionally by layout)
router.get('/', (req, res) => {
  const db = getDb();
  const { layout_id } = req.query;
  let rows;
  if (layout_id) {
    rows = db.prepare('SELECT * FROM card_instances WHERE layout_id = ? ORDER BY sort_order, name').all(layout_id);
  } else {
    rows = db.prepare('SELECT * FROM card_instances ORDER BY layout_id, sort_order, name').all();
  }
  rows.forEach(r => r.data = JSON.parse(r.data));
  res.json(rows);
});

// Get single card instance
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM card_instances WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.data = JSON.parse(row.data);
  res.json(row);
});

// Create card instance
router.post('/', (req, res) => {
  const db = getDb();
  const { layout_id, name, data } = req.body;
  if (!layout_id || !name) return res.status(400).json({ error: 'layout_id and name required' });
  
  const id = randomUUID();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM card_instances WHERE layout_id = ?').get(layout_id);
  db.prepare('INSERT INTO card_instances (id, layout_id, name, data, sort_order) VALUES (?, ?, ?, ?, ?)').run(
    id, layout_id, name, JSON.stringify(data || {}), (maxOrder?.m || 0) + 1
  );
  const row = db.prepare('SELECT * FROM card_instances WHERE id = ?').get(id);
  row.data = JSON.parse(row.data);
  res.status(201).json(row);
});

// Update card instance
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, data, sort_order } = req.body;
  db.prepare(`UPDATE card_instances SET 
    name = COALESCE(?, name), data = COALESCE(?, data),
    sort_order = COALESCE(?, sort_order), updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, data ? JSON.stringify(data) : null, sort_order, req.params.id);
  const row = db.prepare('SELECT * FROM card_instances WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.data = JSON.parse(row.data);
  res.json(row);
});

// Bulk import from CSV data (JSON array)
router.post('/import', (req, res) => {
  const db = getDb();
  const { layout_id, rows: csvRows, mapping } = req.body;
  // mapping: { csvColumnName: "bindingPath" }
  if (!layout_id || !csvRows || !mapping) {
    return res.status(400).json({ error: 'layout_id, rows, and mapping required' });
  }

  const created = [];
  const insert = db.prepare('INSERT INTO card_instances (id, layout_id, name, data, sort_order) VALUES (?, ?, ?, ?, ?)');
  
  const bulkInsert = db.transaction(() => {
    csvRows.forEach((csvRow, idx) => {
      const data = {};
      for (const [csvCol, bindPath] of Object.entries(mapping)) {
        if (csvRow[csvCol] !== undefined && csvRow[csvCol] !== '') {
          data[bindPath] = csvRow[csvCol];
        }
      }
      // Use first mapped field as name, or row index
      const nameField = Object.keys(mapping)[0];
      const name = csvRow[nameField] || `Import #${idx + 1}`;
      const id = randomUUID();
      insert.run(id, layout_id, name, JSON.stringify(data), idx);
      created.push(id);
    });
  });

  bulkInsert();
  res.status(201).json({ imported: created.length, ids: created });
});

// Save import mapping
router.post('/import-mapping', (req, res) => {
  const db = getDb();
  const { layout_id, name, mapping } = req.body;
  const id = randomUUID();
  db.prepare('INSERT INTO import_mappings (id, layout_id, name, mapping) VALUES (?, ?, ?, ?)').run(
    id, layout_id, name, JSON.stringify(mapping)
  );
  res.status(201).json({ id, layout_id, name, mapping });
});

// Get import mappings for a layout
router.get('/import-mapping/:layout_id', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM import_mappings WHERE layout_id = ?').all(req.params.layout_id);
  rows.forEach(r => r.mapping = JSON.parse(r.mapping));
  res.json(rows);
});

// Delete card instance
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM card_instances WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Bulk delete by layout
router.delete('/by-layout/:layout_id', (req, res) => {
  const db = getDb();
  const info = db.prepare('DELETE FROM card_instances WHERE layout_id = ?').run(req.params.layout_id);
  res.json({ deleted: info.changes });
});

export default router;
