import { Router } from 'express';
import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';

const router = Router();

function requireLayoutEditLock(req, res, next) {
  const db = getDb();
  const layoutId = req.params.id;
  const row = db.prepare('SELECT * FROM layout_locks WHERE layout_id = ?').get(layoutId);
  const now = Date.now();
  if (!row) {
    return res.status(423).json({
      error: 'Édition non verrouillée pour votre session — ouvrez l’éditeur pour prendre le verrou.',
    });
  }
  if (row.expires_at < now) {
    db.prepare('DELETE FROM layout_locks WHERE layout_id = ?').run(layoutId);
    return res.status(423).json({ error: 'Verrou expiré — rechargez la page.' });
  }
  if (row.user_id !== req.session.user.id || row.session_id !== req.sessionID) {
    return res.status(423).json({ error: `Édition verrouillée par ${row.holder_username}` });
  }
  next();
}

// List all layouts
router.get('/', (req, res) => {
  const db = getDb();
  const { type } = req.query;
  let rows;
  if (type) {
    rows = db.prepare('SELECT id, name, card_type, width_mm, height_mm, is_back, back_layout_id, shape, thumbnail, created_at, updated_at FROM layouts WHERE card_type = ? ORDER BY name').all(type);
  } else {
    rows = db.prepare('SELECT id, name, card_type, width_mm, height_mm, is_back, back_layout_id, shape, thumbnail, created_at, updated_at FROM layouts ORDER BY name').all();
  }
  res.json(rows);
});

// Get single layout with full definition
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM layouts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = JSON.parse(row.definition);
  res.json(row);
});

// Create layout
router.post('/', (req, res) => {
  const db = getDb();
  const { name, card_type, width_mm, height_mm, back_layout_id, is_back, shape } = req.body;
  if (!name || !card_type || !width_mm || !height_mm) {
    return res.status(400).json({ error: 'Missing required fields: name, card_type, width_mm, height_mm' });
  }
  const id = randomUUID();
  const layoutShape = shape === 'hexagon' ? 'hexagon' : 'rectangle';
  const definition = {
    layers: [{ id: randomUUID(), name: 'Fond', locked: false, visible: true, elements: [] }],
    dataSchema: {}
  };
  db.prepare('INSERT INTO layouts (id, name, card_type, width_mm, height_mm, is_back, back_layout_id, shape, definition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, name, card_type, width_mm, height_mm, is_back ? 1 : 0, back_layout_id || null, layoutShape, JSON.stringify(definition)
  );
  const row = db.prepare('SELECT * FROM layouts WHERE id = ?').get(id);
  row.definition = JSON.parse(row.definition);
  res.status(201).json(row);
});

// Update layout metadata
router.patch('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM layouts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, card_type, width_mm, height_mm, back_layout_id, is_back, shape } = req.body;
  const newShape = shape !== undefined ? (shape === 'hexagon' ? 'hexagon' : 'rectangle') : null;
  db.prepare(`UPDATE layouts SET
    name = COALESCE(?, name),
    card_type = COALESCE(?, card_type),
    width_mm = COALESCE(?, width_mm),
    height_mm = COALESCE(?, height_mm),
    is_back = COALESCE(?, is_back),
    back_layout_id = ?,
    shape = COALESCE(?, shape),
    updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, card_type, width_mm, height_mm, is_back != null ? (is_back ? 1 : 0) : null, back_layout_id !== undefined ? (back_layout_id || null) : existing.back_layout_id, newShape, req.params.id);
  
  const row = db.prepare('SELECT * FROM layouts WHERE id = ?').get(req.params.id);
  row.definition = JSON.parse(row.definition);
  res.json(row);
});

// Update layout definition (the visual structure) + optional thumbnail
router.put('/:id/definition', requireLayoutEditLock, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM layouts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  // Body peut être { definition, thumbnail } ou directement la définition (legacy)
  const hasWrapper = req.body && typeof req.body === 'object' && ('definition' in req.body || 'thumbnail' in req.body)
  const definition = hasWrapper ? req.body.definition : req.body
  const thumbnail  = hasWrapper ? (req.body.thumbnail || null) : null

  if (thumbnail !== null) {
    db.prepare("UPDATE layouts SET definition = ?, thumbnail = ?, updated_at = datetime('now') WHERE id = ?").run(
      JSON.stringify(definition), thumbnail, req.params.id
    );
  } else {
    db.prepare("UPDATE layouts SET definition = ?, updated_at = datetime('now') WHERE id = ?").run(
      JSON.stringify(definition), req.params.id
    );
  }
  res.json({ ok: true });
});

// Duplicate layout
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const original = db.prepare('SELECT * FROM layouts WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Not found' });

  const id = randomUUID();
  const name = req.body.name || `${original.name} (copie)`;
  db.prepare('INSERT INTO layouts (id, name, card_type, width_mm, height_mm, back_layout_id, shape, definition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, name, original.card_type, original.width_mm, original.height_mm, original.back_layout_id, original.shape || 'rectangle', original.definition
  );
  
  // Also duplicate card instances if requested
  if (req.body.with_instances) {
    const instances = db.prepare('SELECT * FROM card_instances WHERE layout_id = ?').all(original.id);
    const stmt = db.prepare('INSERT INTO card_instances (id, layout_id, name, data, sort_order) VALUES (?, ?, ?, ?, ?)');
    for (const inst of instances) {
      stmt.run(randomUUID(), id, inst.name, inst.data, inst.sort_order);
    }
  }

  const row = db.prepare('SELECT * FROM layouts WHERE id = ?').get(id);
  row.definition = JSON.parse(row.definition);
  res.status(201).json(row);
});

// Delete layout
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM layouts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
