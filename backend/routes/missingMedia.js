import { Router } from 'express'
import { getDb } from '../db/database.js'
import { buildPrompt, generateOne } from '../services/aiGeneration.js'

const router = Router()

// ── Helper: compute prompt_configured for an entry ──────────────────────────
function isPromptConfigured(entry, db) {
  try {
    const instance = db.prepare('SELECT layout_id FROM card_instances WHERE id = ?').get(entry.card_instance_id)
    if (!instance) return false
    const layout = db.prepare('SELECT definition FROM layouts WHERE id = ?').get(instance.layout_id)
    if (!layout) return false
    const def = JSON.parse(layout.definition || '{}')
    const nameInLayout = entry.binding_path.split('.')[0]
    function find(items) {
      for (const item of items || []) {
        if (item.kind === 'group') { const r = find(item.children); if (r) return r }
        else if (item.nameInLayout === nameInLayout && item.type === 'atom' && item.atomType === 'image') return item
      }
      return null
    }
    const el = find(def.layers || [])
    return !!(el?.params?.ai_prompt_template)
  } catch { return false }
}

// ── GET /api/missing-media ───────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb()
  const { status, instance_id } = req.query

  let sql = `
    SELECT mm.*,
      ci.name AS card_instance_name,
      ci.layout_id,
      l.name AS layout_name
    FROM missing_media mm
    LEFT JOIN card_instances ci ON ci.id = mm.card_instance_id
    LEFT JOIN layouts l ON l.id = ci.layout_id
    WHERE 1=1
  `
  const params = []
  if (status) { sql += ' AND mm.status = ?'; params.push(status) }
  if (instance_id) { sql += ' AND mm.card_instance_id = ?'; params.push(instance_id) }
  sql += ' ORDER BY mm.detected_at DESC'

  const rows = db.prepare(sql).all(...params)

  // Augment with prompt_configured
  const result = rows.map(row => ({
    ...row,
    prompt_configured: isPromptConfigured(row, db),
  }))

  res.json(result)
})

// ── PATCH /api/missing-media/:id ─────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const db = getDb()
  const { status, media_type, resolved_media_id } = req.body
  const entry = db.prepare('SELECT * FROM missing_media WHERE id = ?').get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Not found' })

  const fields = []
  const params = []
  if (status) { fields.push('status = ?'); params.push(status) }
  if (media_type !== undefined) { fields.push('media_type = ?'); params.push(media_type) }
  if (resolved_media_id !== undefined) { fields.push('resolved_media_id = ?'); params.push(resolved_media_id) }
  if (status === 'resolved') { fields.push("resolved_at = datetime('now')") }

  if (fields.length === 0) return res.json(entry)
  params.push(req.params.id)
  db.prepare(`UPDATE missing_media SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  const updated = db.prepare('SELECT * FROM missing_media WHERE id = ?').get(req.params.id)
  res.json({ ...updated, prompt_configured: isPromptConfigured(updated, db) })
})

// ── POST /api/missing-media/generate-all ── (must be before /:id routes) ────
router.post('/generate-all', async (req, res) => {
  const db = getDb()
  const { media_type } = req.body || {}

  let sql = "SELECT id FROM missing_media WHERE status = 'pending'"
  const params = []
  if (media_type) { sql += ' AND media_type = ?'; params.push(media_type) }

  const entries = db.prepare(sql).all(...params)

  // Only queue entries that have a configured prompt
  const queued = []
  for (const { id } of entries) {
    const entry = db.prepare('SELECT * FROM missing_media WHERE id = ?').get(id)
    if (isPromptConfigured(entry, db)) queued.push(id)
  }

  // Fire-and-forget generation (non-blocking response)
  res.json({ queued: queued.length })

  for (const id of queued) {
    try { await generateOne(id, db) } catch { /* errors stored in DB */ }
  }
})

// ── POST /api/missing-media/:id/preview-prompt ───────────────────────────────
router.post('/:id/preview-prompt', (req, res) => {
  const db = getDb()
  const entry = db.prepare('SELECT * FROM missing_media WHERE id = ?').get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Not found' })

  try {
    const { prompt, hasTemplate } = buildPrompt(entry, db)
    if (!hasTemplate) {
      return res.status(422).json({ error: 'ai_prompt_template absent sur l\'élément image dans le layout' })
    }
    res.json({ prompt })
  } catch (e) {
    res.status(422).json({ error: e.message })
  }
})

// ── POST /api/missing-media/:id/generate ─────────────────────────────────────
router.post('/:id/generate', async (req, res) => {
  const db = getDb()
  const entry = db.prepare('SELECT * FROM missing_media WHERE id = ?').get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Not found' })
  if (entry.status === 'generating') return res.status(409).json({ error: 'Already generating' })

  // Respond immediately, run async
  res.json({ ok: true, status: 'generating' })

  try { await generateOne(entry.id, db) } catch { /* errors stored in DB */ }
})

export default router
