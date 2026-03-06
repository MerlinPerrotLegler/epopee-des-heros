import { Router } from 'express';
import { getDb, createSnapshot, restoreSnapshot } from '../db/database.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Read code version from package.json
const pkgPath = join(__dirname, '..', 'package.json');
const CODE_VERSION = JSON.parse(readFileSync(pkgPath, 'utf-8')).version;

// === Snapshots ===
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, label, code_version, created_at FROM snapshots ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { label } = req.body;
  const snapshot = createSnapshot(label || null, CODE_VERSION);
  res.status(201).json(snapshot);
});

router.post('/:id/restore', (req, res) => {
  try {
    const result = restoreSnapshot(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM snapshots WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
