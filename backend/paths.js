import { join, dirname, isAbsolute, basename } from 'path'
import { fileURLToPath } from 'url'
import { config as loadEnv } from 'dotenv'

/**
 * Dossier racine des données (SQLite, sous-dossier uploads/, seeds/).
 *
 * - Par défaut : `<backend>/data`
 * - Variable **`DATA_DIR`** : chemin absolu, ou **relatif au dossier `backend/`** (pas au cwd).
 *   Tu peux indiquer soit la racine `data`, soit par erreur `data/uploads` : dans ce cas on
 *   remonte d’un niveau pour éviter `.../uploads/uploads/`.
 *   Exemples : `DATA_DIR=data` ou `DATA_DIR=/var/lib/card-designer/data`
 *
 * En production sur hébergeur à disque éphémère : définir DATA_DIR vers un volume monté.
 */
const backendRoot = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: join(backendRoot, '..', '.env') })
loadEnv()

/**
 * Si le chemin finit par un segment `uploads`, on le retire : les fichiers média vivent
 * dans `<racine>/uploads/`, pas dans `<racine>/uploads/uploads/`.
 */
function stripTrailingUploadsSegment(resolved) {
  let p = resolved.replace(/[/\\]+$/, '')
  if (basename(p) === 'uploads') {
    return dirname(p)
  }
  return p
}

function resolveDataDir() {
  const raw = process.env.DATA_DIR?.trim()
  if (!raw) return join(backendRoot, 'data')
  const normalizedRaw = raw.replace(/^\.?\/*backend\//, '')
  const merged = isAbsolute(raw) ? raw : join(backendRoot, normalizedRaw)
  return stripTrailingUploadsSegment(merged)
}

export const DATA_DIR = resolveDataDir()

/** Fichiers uploadés (images média) */
export const UPLOADS_DIR = join(DATA_DIR, 'uploads')
