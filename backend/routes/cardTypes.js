import { Router } from 'express'
import { getDb } from '../db/database.js'
import {
  assertCanDeleteType,
  isUniqueConstraintError,
  normalizeNewType,
} from '../utils/typeCode.js'

const router = Router()

const TYPE_LIST_SQL = `
  SELECT t.code, t.label, t.created_at,
    (SELECT COUNT(*) FROM layouts l WHERE l.card_type = t.code) AS usage_count
  FROM card_types t
  ORDER BY t.label
`

function withUsage(row) {
  if (!row) return null
  return { ...row, usage_count: Number(row.usage_count) || 0 }
}

async function getTypeRow(db, code) {
  const row = await db.prepare(`
    SELECT t.code, t.label, t.created_at,
      (SELECT COUNT(*) FROM layouts l WHERE l.card_type = t.code) AS usage_count
    FROM card_types t
    WHERE t.code = ?
  `).get(code)
  return withUsage(row)
}

router.get('/', async (_req, res) => {
  const db = getDb()
  const rows = await db.prepare(TYPE_LIST_SQL).all()
  res.json(rows.map(withUsage))
})

router.post('/', async (req, res) => {
  const parsed = normalizeNewType(req.body || {})
  if (!parsed.ok) return res.status(parsed.status).json({ error: parsed.error })
  const db = getDb()
  try {
    await db.prepare('INSERT INTO card_types (code, label) VALUES (?, ?)').run(parsed.code, parsed.label)
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: 'Ce code existe déjà' })
    }
    throw err
  }
  res.status(201).json(await getTypeRow(db, parsed.code))
})

router.patch('/:code', async (req, res) => {
  const db = getDb()
  const existing = await db.prepare('SELECT code FROM card_types WHERE code = ?').get(req.params.code)
  if (!existing) return res.status(404).json({ error: 'Type introuvable' })
  const label = String(req.body?.label ?? '').trim()
  if (!label) return res.status(400).json({ error: 'Le libellé est requis' })
  await db.prepare('UPDATE card_types SET label = ? WHERE code = ?').run(label, req.params.code)
  res.json(await getTypeRow(db, req.params.code))
})

router.delete('/:code', async (req, res) => {
  const guard = assertCanDeleteType(req.params.code)
  if (!guard.ok) return res.status(guard.status).json({ error: guard.error })
  const db = getDb()
  const existing = await db.prepare('SELECT code FROM card_types WHERE code = ?').get(req.params.code)
  if (!existing) return res.status(404).json({ error: 'Type introuvable' })
  await db.prepare('DELETE FROM card_types WHERE code = ?').run(req.params.code)
  res.json({ ok: true })
})

export default router
