import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM card_types ORDER BY label').all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { code, label } = req.body;
  if (!code || !label) return res.status(400).json({ error: 'code and label required' });
  db.prepare('INSERT OR IGNORE INTO card_types (code, label) VALUES (?, ?)').run(code, label);
  res.status(201).json({ code, label });
});

router.delete('/:code', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM card_types WHERE code = ?').run(req.params.code);
  res.json({ ok: true });
});

export default router;
