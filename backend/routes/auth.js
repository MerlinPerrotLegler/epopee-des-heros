import express from 'express'
import bcrypt from 'bcryptjs'
import { getDb } from '../db/database.js'

const router = express.Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body || {}

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Identifiants invalides' })
  }

  const db = getDb()
  const row = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username.trim())
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' })
  }

  req.session.user = {
    id: row.id,
    username: row.username,
    role: row.role,
  }
  return req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Erreur session' })
    return res.json({
      ok: true,
      user: { id: row.id, username: row.username, role: row.role },
    })
  })
})

const SESSION_COOKIE_NAME = 'cardDesigner.sid'

router.post('/logout', (req, res) => {
  const sid = req.sessionID
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Erreur déconnexion' })
    try {
      const db = getDb()
      db.prepare('DELETE FROM layout_locks WHERE session_id = ?').run(sid)
    } catch {
      /* table peut être absente en théorie */
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    return res.json({ ok: true })
  })
})

router.get('/me', (req, res) => {
  if (req.session?.user?.id) {
    return res.json({
      authenticated: true,
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        role: req.session.user.role,
      },
    })
  }
  return res.status(401).json({ authenticated: false, error: 'Non authentifié' })
})

export default router
