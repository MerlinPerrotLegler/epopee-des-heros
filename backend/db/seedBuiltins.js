/**
 * seedBuiltins.js
 * ───────────────
 * Seede les assets visuels par défaut dans la médiathèque au démarrage.
 *
 * Convention :
 *  - Les fichiers sources vivent dans  <DATA_DIR>/seeds/
 *  - Ils sont copiés dans               <DATA_DIR>/uploads/  avec un nom fixe "builtin-<fichier>"
 *  - Un enregistrement est créé dans la table `media` avec l'ID fixe "builtin-<nomSansExt>"
 *  - Un dossier spécial "Ressources intégrées" (id='builtin') regroupe ces assets
 *
 * Pour ajouter un nouvel asset par défaut, déposez simplement le fichier dans data/seeds/.
 */

import { existsSync, copyFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'
import { getDb } from './database.js'
import { DATA_DIR } from '../paths.js'

const SEEDS_DIR = join(DATA_DIR, 'seeds')
const UPLOADS_DIR = join(DATA_DIR, 'uploads')

const MIME_MAP = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.gif':  'image/gif',
}

export function seedBuiltins() {
  if (!existsSync(SEEDS_DIR)) return

  const db = getDb()

  // ── Créer le dossier "Ressources intégrées" s'il n'existe pas ─────────────
  db.prepare(`
    INSERT OR IGNORE INTO media_folders (id, name, parent_id)
    VALUES ('builtin', 'Ressources intégrées', 'root')
  `).run()

  // ── Scanner les fichiers du dossier seeds ─────────────────────────────────
  let files
  try { files = readdirSync(SEEDS_DIR) } catch { return }

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO media (id, filename, original_name, mime_type, folder_id)
    VALUES (?, ?, ?, ?, 'builtin')
  `)

  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const mime = MIME_MAP[ext]
    if (!mime) continue                          // ignorer les fichiers non-image

    const destFile = `builtin-${file}`                   // nom fixe dans uploads/
    const id       = destFile                            // ex: builtin-texture-parchemin.png

    // Copier vers uploads/ si absent
    const destPath = join(UPLOADS_DIR, destFile)
    if (!existsSync(destPath)) {
      copyFileSync(join(SEEDS_DIR, file), destPath)
    }

    // Insérer dans la DB si absent (INSERT OR IGNORE)
    stmt.run(id, destFile, file, mime)
  }
}
