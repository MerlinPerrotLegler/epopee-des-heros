/**
 * Session-based auth — `req.session.user` = { id, username, role }
 */
export function requireAuth(req, res, next) {
  if (req.session?.user?.id) {
    return next()
  }
  return res.status(401).json({ error: 'Non authentifié' })
}

export function requireAdmin(req, res, next) {
  if (req.session?.user?.role === 'admin') {
    return next()
  }
  return res.status(403).json({ error: 'Accès administrateur requis' })
}
