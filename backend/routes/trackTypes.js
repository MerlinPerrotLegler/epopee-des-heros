import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', async (_req, res) => {
  const db = getDb()
  const rows = await db.prepare('SELECT id, name, color, created_at FROM track_types ORDER BY name').all()
  res.json(rows)
})

router.post('/', async (req, res) => {
  const db = getDb()
  const name = String(req.body?.name || '').trim()
  const color = String(req.body?.color || '#888888').trim()
  if (!name) return res.status(400).json({ error: 'name required' })
  const id = randomUUID()
  try {
    await db.prepare('INSERT INTO track_types (id, name, color) VALUES (?, ?, ?)').run(id, name, color)
  } catch {
    return res.status(409).json({ error: 'Type name already exists' })
  }
  const row = await db.prepare('SELECT id, name, color, created_at FROM track_types WHERE id = ?').get(id)
  res.status(201).json(row)
})

router.patch('/:id', async (req, res) => {
  const db = getDb()
  const existing = await db.prepare('SELECT * FROM track_types WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name
  const color = req.body.color !== undefined ? String(req.body.color).trim() : existing.color
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    await db.prepare('UPDATE track_types SET name = ?, color = ? WHERE id = ?').run(name, color, req.params.id)
  } catch {
    return res.status(409).json({ error: 'Type name already exists' })
  }
  res.json(await db.prepare('SELECT id, name, color, created_at FROM track_types WHERE id = ?').get(req.params.id))
})

router.delete('/:id', async (req, res) => {
  const db = getDb()
  await db.prepare('DELETE FROM track_types WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
