/**
 * Ajustements SQL SQLite vs MySQL (Hostinger / DATABASE_URL).
 */
export function useMysql() {
  if (process.env.DATABASE_URL?.trim()) return true
  const { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env
  return Boolean(MYSQL_HOST && MYSQL_USER && MYSQL_PASSWORD && MYSQL_DATABASE)
}

/** Préfixe INSERT … pour ignorer les doublons */
export function insertOrIgnoreInto() {
  return useMysql() ? 'INSERT IGNORE INTO' : 'INSERT OR IGNORE INTO'
}

/** Timestamp côté serveur SQL (les deux moteurs) */
export function sqlNow() {
  return 'CURRENT_TIMESTAMP'
}

/** Colonne JSON : MySQL renvoie souvent un objet, SQLite une chaîne */
export function parseJsonColumn(val) {
  if (val == null) return null
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return val
  }
}
