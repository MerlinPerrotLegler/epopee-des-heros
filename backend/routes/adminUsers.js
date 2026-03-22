import { Router } from 'express'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { getDb } from '../db/database.js'

const router = Router()
const ROUNDS = 10

function rowToPublic(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function countValue(row) {
  if (!row) return 0
  const c = row.c ?? row['COUNT(*)']
  return typeof c === 'bigint' ? Number(c) : Number(c)
}

router.get('/users', async (req, res) => {
  const db = getDb()
  const rows = await db.prepare('SELECT id, username, role, created_at, updated_at FROM users ORDER BY username').all()
  res.json(rows)
})

router.post('/users', async (req, res) => {
  const { username, password, role = 'user' } = req.body || {}
  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Nom d’utilisateur requis' })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe : au moins 6 caractères' })
  }
  if (role !== 'admin' && role !== 'user') {
    return res.status(400).json({ error: 'Rôle invalide' })
  }
  const db = getDb()
  try {
    const id = randomUUID()
    const hash = bcrypt.hashSync(password, ROUNDS)
    await db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
      id, username.trim(), hash, role,
    )
    const row = await db.prepare('SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?').get(id)
    res.status(201).json(row)
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ce nom d’utilisateur existe déjà' })
    }
    throw e
  }
})

router.patch('/users/:id', async (req, res) => {
  const { username, password, role } = req.body || {}
  if (username === undefined && password === undefined && role === undefined) {
    return res.status(400).json({ error: 'Rien à modifier' })
  }
  const db = getDb()
  const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' })

  if (username !== undefined) {
    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }
    const trimmed = username.trim()
    if (trimmed !== existing.username) {
      try {
        await db.prepare('UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(trimmed, req.params.id)
      } catch (e) {
        if (String(e.message).includes('UNIQUE')) {
          return res.status(409).json({ error: 'Ce nom d’utilisateur existe déjà' })
        }
        throw e
      }
    }
  }

  if (role !== undefined) {
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Rôle invalide' })
    }
    if (existing.role === 'admin' && role === 'user') {
      const admins = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get()
      if (countValue(admins) <= 1) {
        return res.status(400).json({ error: 'Impossible de retirer le dernier administrateur' })
      }
    }
  }

  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe : au moins 6 caractères' })
    }
    const hash = bcrypt.hashSync(password, ROUNDS)
    await db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.params.id)
  }

  if (role !== undefined) {
    await db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, req.params.id)
  }

  const row = await db.prepare('SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?').get(req.params.id)
  res.json(rowToPublic(row))
})

router.delete('/users/:id', async (req, res) => {
  const db = getDb()
  const existing = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' })
  if (existing.id === req.session.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' })
  }
  if (existing.role === 'admin') {
    const admins = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get()
    if (countValue(admins) <= 1) {
      return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' })
    }
  }
  await db.prepare('DELETE FROM layout_locks WHERE user_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
