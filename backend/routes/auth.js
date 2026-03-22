import express from 'express'
import { getAdminCredentials } from '../middleware/sessionAuth.js'

const router = express.Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  const { user, pass } = getAdminCredentials()

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Identifiants invalides' })
  }

  if (username === user && password === pass) {
    req.session.user = { name: user }
    // Garantit l’écriture du cookie avant la réponse (évite course avec le 1er GET /api/*)
    return req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Erreur session' })
      return res.json({ ok: true, user: { name: user } })
    })
  }

  return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' })
})

const SESSION_COOKIE_NAME = 'cardDesigner.sid'

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Erreur déconnexion' })
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    return res.json({ ok: true })
  })
})

router.get('/me', (req, res) => {
  if (req.session?.user) {
    return res.json({ authenticated: true, user: req.session.user })
  }
  return res.status(401).json({ authenticated: false, error: 'Non authentifié' })
})

export default router
