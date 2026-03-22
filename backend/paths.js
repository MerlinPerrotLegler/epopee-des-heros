import { join, dirname, isAbsolute } from 'path'
import { fileURLToPath } from 'url'

/**
 * Dossier racine des données (SQLite, sous-dossier uploads/, seeds/).
 *
 * - Par défaut : `<backend>/data`
 * - Variable **`DATA_DIR`** : chemin absolu, ou **relatif au dossier `backend/`** (pas au cwd).
 *   ⚠️ Ne pas pointer vers `.../uploads` : le serveur sert les fichiers depuis `DATA_DIR/uploads/`.
 *   Exemple correct : `DATA_DIR=data` ou `DATA_DIR=/var/lib/card-designer/data`
 *
 * En production sur hébergeur à disque éphémère : définir DATA_DIR vers un volume monté.
 */
const backendRoot = dirname(fileURLToPath(import.meta.url))

function resolveDataDir() {
  const raw = process.env.DATA_DIR?.trim()
  if (!raw) return join(backendRoot, 'data')
  if (isAbsolute(raw)) return raw
  return join(backendRoot, raw)
}

export const DATA_DIR = resolveDataDir()

/** Fichiers uploadés (images média) — toujours `DATA_DIR/uploads` */
export const UPLOADS_DIR = join(DATA_DIR, 'uploads')
