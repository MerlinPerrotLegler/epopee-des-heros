import { Router } from 'express';
import { getDb } from '../db/database.js';
import { insertOrIgnoreInto } from '../db/sqlDialect.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = getDb();
  res.json(await db.prepare('SELECT * FROM card_types ORDER BY label').all());
});

router.post('/', async (req, res) => {
  const db = getDb();
  const { code, label } = req.body;
  if (!code || !label) return res.status(400).json({ error: 'code and label required' });
  await db.prepare(`${insertOrIgnoreInto()} card_types (code, label) VALUES (?, ?)`).run(code, label);
  res.status(201).json({ code, label });
});

router.delete('/:code', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM card_types WHERE code = ?').run(req.params.code);
  res.json({ ok: true });
});

export default router;
