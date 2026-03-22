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
import { getDb, getSqliteSync } from './database.js'
import { DATA_DIR } from '../paths.js'
import { insertOrIgnoreInto, useMysql } from './sqlDialect.js'

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

export async function seedBuiltins() {
  if (!existsSync(SEEDS_DIR)) return

  let files
  try { files = readdirSync(SEEDS_DIR) } catch { return }

  if (useMysql()) {
    const db = getDb()
    await db.prepare(`
      ${insertOrIgnoreInto()} media_folders (id, name, parent_id)
      VALUES ('builtin', 'Ressources intégrées', 'root')
    `).run()

    const stmt = db.prepare(`
      ${insertOrIgnoreInto()} media (id, filename, original_name, mime_type, folder_id)
      VALUES (?, ?, ?, ?, 'builtin')
    `)

    for (const file of files) {
      const ext = extname(file).toLowerCase()
      const mime = MIME_MAP[ext]
      if (!mime) continue

      const destFile = `builtin-${file}`
      const id = destFile

      const destPath = join(UPLOADS_DIR, destFile)
      if (!existsSync(destPath)) {
        copyFileSync(join(SEEDS_DIR, file), destPath)
      }

      await stmt.run(id, destFile, file, mime)
    }
    return
  }

  const db = getSqliteSync()
  db.prepare(`
    INSERT OR IGNORE INTO media_folders (id, name, parent_id)
    VALUES ('builtin', 'Ressources intégrées', 'root')
  `).run()

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO media (id, filename, original_name, mime_type, folder_id)
    VALUES (?, ?, ?, ?, 'builtin')
  `)

  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const mime = MIME_MAP[ext]
    if (!mime) continue

    const destFile = `builtin-${file}`
    const id = destFile

    const destPath = join(UPLOADS_DIR, destFile)
    if (!existsSync(destPath)) {
      copyFileSync(join(SEEDS_DIR, file), destPath)
    }

    stmt.run(id, destFile, file, mime)
  }
}
