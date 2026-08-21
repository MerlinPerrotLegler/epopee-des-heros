import { Router } from 'express'
import { getDb } from '../db/database.js'
import { randomUUID } from 'crypto'
import { parseJsonColumn } from '../db/sqlDialect.js'

const router = Router()

function withDims(row) {
  if (!row) return row
  row.definition = parseJsonColumn(row.definition)
  const def = row.definition || {}
  row.width_mm = def.width_mm ?? 20
  row.height_mm = def.height_mm ?? 10
  return row
}

router.get('/', async (req, res) => {
  const db = getDb()
  const rows = await db.prepare('SELECT * FROM molecules ORDER BY name').all()
  res.json(rows.map(withDims))
})

router.get('/:id', async (req, res) => {
  const db = getDb()
  const row = await db.prepare('SELECT * FROM molecules WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(withDims(row))
})

router.post('/', async (req, res) => {
  const db = getDb()
  const { name, description, definition, width_mm, height_mm } = req.body
  if (!name) return res.status(400).json({ error: 'Name required' })

  const id = randomUUID()
  const def = {
    width_mm: width_mm ?? 20,
    height_mm: height_mm ?? 10,
    layers: [],
    dataSchema: {},
    ...(definition || {}),
  }
  if (width_mm != null) def.width_mm = width_mm
  if (height_mm != null) def.height_mm = height_mm

  await db.prepare(
    'INSERT INTO molecules (id, name, description, definition) VALUES (?, ?, ?, ?)',
  ).run(id, name, description || null, JSON.stringify(def))
  const row = await db.prepare('SELECT * FROM molecules WHERE id = ?').get(id)
  res.status(201).json(withDims(row))
})

router.put('/:id', async (req, res) => {
  const db = getDb()
  const { name, description, definition, width_mm, height_mm } = req.body
  let def = definition
  if (def != null) {
    def = { ...def }
    if (width_mm != null) def.width_mm = width_mm
    if (height_mm != null) def.height_mm = height_mm
  }
  await db.prepare(`UPDATE molecules SET
    name = COALESCE(?, name),
    description = COALESCE(?, description),
    definition = COALESCE(?, definition),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`).run(
    name ?? null,
    description ?? null,
    def != null ? JSON.stringify(def) : null,
    req.params.id,
  )
  const row = await db.prepare('SELECT * FROM molecules WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(withDims(row))
})

router.patch('/:id', async (req, res) => {
  const db = getDb()
  const { name } = req.body
  await db.prepare(
    'UPDATE molecules SET name = COALESCE(?, name), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
  ).run(name ?? null, req.params.id)
  const row = await db.prepare('SELECT * FROM molecules WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(withDims(row))
})

router.post('/:id/duplicate', async (req, res) => {
  const db = getDb()
  const original = await db.prepare('SELECT * FROM molecules WHERE id = ?').get(req.params.id)
  if (!original) return res.status(404).json({ error: 'Not found' })
  const id = randomUUID()
  const name = req.body.name || `${original.name} (copie)`
  const defStr = typeof original.definition === 'string'
    ? original.definition
    : JSON.stringify(original.definition)
  await db.prepare(
    'INSERT INTO molecules (id, name, description, definition) VALUES (?, ?, ?, ?)',
  ).run(id, name, original.description, defStr)
  const row = await db.prepare('SELECT * FROM molecules WHERE id = ?').get(id)
  res.status(201).json(withDims(row))
})

router.delete('/:id', async (req, res) => {
  const db = getDb()
  await db.prepare('DELETE FROM molecules WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
