import express from 'express'
import { getDb } from '../db/database.js'
import { parseJsonColumn, useMysql } from '../db/sqlDialect.js'

const router = express.Router()

// GET /api/config → flat design_config object
router.get('/', async (req, res) => {
  const db = getDb()
  const row = await db.prepare('SELECT design_config FROM settings WHERE id = 1').get()
  if (!row) return res.json({})
  const raw = row.design_config
  const config = parseJsonColumn(raw)
  res.json(typeof config === 'object' && config !== null ? config : {})
})

// PUT /api/config → replace flat design_config object
router.put('/', async (req, res) => {
  const db = getDb()
  const payload = JSON.stringify(req.body)
  if (useMysql()) {
    await db.prepare(`INSERT INTO settings (id, design_config) VALUES (1, ?)
      ON DUPLICATE KEY UPDATE design_config = VALUES(design_config)`).run(payload)
  } else {
    await db.prepare('INSERT OR REPLACE INTO settings (id, design_config) VALUES (1, ?)').run(payload)
  }
  res.json(req.body)
})

// GET /api/config/ai → AI generation config (api_key never returned in clear)
router.get('/ai', async (req, res) => {
  const db = getDb()
  const row = await db.prepare("SELECT * FROM ai_generation_config WHERE id = 'singleton'").get()
  if (!row) return res.json({ provider: 'openai', api_key_set: false, global_prompt: '', media_type_presets: [] })
  const presets = parseJsonColumn(row.media_type_presets)
  res.json({
    provider: row.provider,
    api_key_set: !!(row.api_key),
    global_prompt: row.global_prompt,
    media_type_presets: Array.isArray(presets) ? presets : JSON.parse(row.media_type_presets || '[]'),
  })
})

// PUT /api/config/ai → save AI config (only updates api_key if non-empty provided)
router.put('/ai', async (req, res) => {
  const db = getDb()
  const { provider, api_key, global_prompt, media_type_presets } = req.body
  if (!Array.isArray(media_type_presets)) return res.status(400).json({ error: 'media_type_presets must be an array' })
  if (api_key !== undefined && api_key !== '') {
    await db.prepare(`UPDATE ai_generation_config SET provider=?, api_key=?, global_prompt=?, media_type_presets=?, updated_at=CURRENT_TIMESTAMP WHERE id='singleton'`)
      .run(provider || 'openai', api_key, global_prompt || '', JSON.stringify(media_type_presets))
  } else {
    await db.prepare(`UPDATE ai_generation_config SET provider=?, global_prompt=?, media_type_presets=?, updated_at=CURRENT_TIMESTAMP WHERE id='singleton'`)
      .run(provider || 'openai', global_prompt || '', JSON.stringify(media_type_presets))
  }
  res.json({ ok: true })
})

export default router
