import express from 'express'
import { getDb } from '../db/database.js'

const router = express.Router()

// GET /api/config → flat design_config object
router.get('/', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT design_config FROM settings WHERE id = 1').get()
  const config = row ? JSON.parse(row.design_config) : {}
  res.json(config)
})

// PUT /api/config → replace flat design_config object
router.put('/', (req, res) => {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO settings (id, design_config) VALUES (1, ?)').run(JSON.stringify(req.body))
  res.json(req.body)
})

export default router
