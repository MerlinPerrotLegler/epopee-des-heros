import { join, dirname, isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import './loadEnv.js'

/**
 * Dossier racine des données locales (fichier SQLite en dev sans MySQL).
 *
 * - Par défaut : `<backend>/data`
 * - Variable **`DATA_DIR`** : chemin absolu, ou relatif au dossier `backend/`.
 *   Exemples : `DATA_DIR=data` ou `DATA_DIR=/var/lib/card-designer/data`
 *
 * Les médias ne sont **pas** stockés sur disque : uniquement en BLOB (`media.content`).
 */
const backendRoot = dirname(fileURLToPath(import.meta.url))

function resolveDataDir() {
  const raw = process.env.DATA_DIR?.trim()
  if (!raw) return join(backendRoot, 'data')
  const normalizedRaw = raw.replace(/^\.?\/*backend\//, '')
  return isAbsolute(raw) ? raw : join(backendRoot, normalizedRaw)
}

export const DATA_DIR = resolveDataDir()
