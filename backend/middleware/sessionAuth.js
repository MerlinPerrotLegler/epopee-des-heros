/**
 * Session-based auth (remplace l’ancien HTTP Basic).
 * Identifiants : ADMIN_USER / ADMIN_PASSWORD (fallback AUTH_USER / AUTH_PASS pour compat).
 */
export function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next()
  }
  return res.status(401).json({ error: 'Non authentifié' })
}

export function getAdminCredentials() {
  const user = process.env.ADMIN_USER || process.env.AUTH_USER || 'admin'
  const pass = process.env.ADMIN_PASSWORD || process.env.AUTH_PASS || 'changeme'
  return { user, pass }
}
