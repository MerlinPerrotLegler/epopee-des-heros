import { Router } from 'express'
import { getDb } from '../db/database.js'

const router = Router()

/** Durée de vie du verrou si pas de heartbeat (ms) */
export const LOCK_TTL_MS = 60_000

function cleanExpired(db) {
  db.prepare('DELETE FROM layout_locks WHERE expires_at < ?').run(Date.now())
}

/**
 * GET /api/locks/layouts/:layoutId
 * État du verrou (lecture pour tous les utilisateurs connectés)
 */
router.get('/layouts/:layoutId', (req, res) => {
  const db = getDb()
  cleanExpired(db)
  const row = db.prepare(`
    SELECT layout_id, user_id, holder_username, expires_at, session_id
    FROM layout_locks WHERE layout_id = ?
  `).get(req.params.layoutId)
  if (!row) {
    return res.json({ locked: false, holder: null, expiresAt: null, ownSession: false })
  }
  const ownSession = row.session_id === req.sessionID
  return res.json({
    locked: true,
    holder: { username: row.holder_username, userId: row.user_id },
    expiresAt: row.expires_at,
    ownSession,
  })
})

/**
 * POST /api/locks/layouts/:layoutId/acquire
 * Tente d’obtenir le verrou d’édition exclusif
 */
router.post('/layouts/:layoutId/acquire', (req, res) => {
  const db = getDb()
  cleanExpired(db)
  const layoutId = req.params.layoutId
  const layout = db.prepare('SELECT id FROM layouts WHERE id = ?').get(layoutId)
  if (!layout) return res.status(404).json({ error: 'Layout introuvable' })

  const user = req.session.user
  const now = Date.now()
  const exp = now + LOCK_TTL_MS

  const existing = db.prepare('SELECT * FROM layout_locks WHERE layout_id = ?').get(layoutId)
  if (existing) {
    if (existing.expires_at < now) {
      db.prepare('DELETE FROM layout_locks WHERE layout_id = ?').run(layoutId)
    } else if (existing.session_id === req.sessionID && existing.user_id === user.id) {
      db.prepare(`
        UPDATE layout_locks SET expires_at = ? WHERE layout_id = ?
      `).run(exp, layoutId)
      return res.json({ acquired: true, holder: { username: user.username } })
    } else {
      return res.status(409).json({
        acquired: false,
        lockedBy: { username: existing.holder_username, userId: existing.user_id },
      })
    }
  }

  db.prepare(`
    INSERT INTO layout_locks (layout_id, user_id, session_id, holder_username, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(layoutId, user.id, req.sessionID, user.username, exp)

  return res.json({ acquired: true, holder: { username: user.username } })
})

/**
 * POST /api/locks/layouts/:layoutId/heartbeat
 */
router.post('/layouts/:layoutId/heartbeat', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM layout_locks WHERE layout_id = ?').get(req.params.layoutId)
  if (!row) return res.status(404).json({ error: 'Pas de verrou actif' })
  if (row.session_id !== req.sessionID || row.user_id !== req.session.user.id) {
    return res.status(403).json({ error: 'Ce verrou n’est pas le vôtre' })
  }
  const exp = Date.now() + LOCK_TTL_MS
  db.prepare('UPDATE layout_locks SET expires_at = ? WHERE layout_id = ?').run(exp, req.params.layoutId)
  res.json({ ok: true, expiresAt: exp })
})

/**
 * DELETE /api/locks/layouts/:layoutId
 */
router.delete('/layouts/:layoutId', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM layout_locks WHERE layout_id = ?').get(req.params.layoutId)
  if (!row) return res.json({ ok: true })
  if (row.session_id !== req.sessionID || row.user_id !== req.session.user.id) {
    return res.status(403).json({ error: 'Ce verrou n’est pas le vôtre' })
  }
  db.prepare('DELETE FROM layout_locks WHERE layout_id = ?').run(req.params.layoutId)
  res.json({ ok: true })
})

export default router
