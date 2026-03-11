import express from 'express'
import { getDb } from '../db/database.js'

const router = express.Router()

// GET /api/fonts
router.get('/', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM fonts ORDER BY family').all()
  res.json(rows)
})

// POST /api/fonts  { family, url? }
router.post('/', (req, res) => {
  const { family, url } = req.body
  if (!family) return res.status(400).json({ error: 'family is required' })

  const db = getDb()
  const id = crypto.randomUUID()
  const fontUrl = url || `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:ital,wght@0,400;0,600;0,700;1,400&display=swap`

  try {
    db.prepare('INSERT INTO fonts (id, family, url) VALUES (?, ?, ?)').run(id, family, fontUrl)
    res.status(201).json({ id, family, url: fontUrl })
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Font already added' })
    throw e
  }
})

// DELETE /api/fonts/:id
router.delete('/:id', (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM fonts WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
