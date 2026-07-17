/**
 * seedBuiltins.js
 * ───────────────
 * Seede les assets visuels par défaut dans la médiathèque au démarrage.
 *
 * Convention :
 *  - Les fichiers sources vivent dans  <DATA_DIR>/seeds/
 *  - Le contenu est stocké en BLOB dans la table `media` (source de vérité)
 *  - Un cache disque optionnel est écrit dans <DATA_DIR>/uploads/
 *  - Un enregistrement est créé dans la table `media` avec l'ID fixe "builtin-<nomSansExt>"
 *  - Un dossier spécial "Ressources intégrées" (id='builtin') regroupe ces assets
 *
 * Pour ajouter un nouvel asset par défaut, déposez simplement le fichier dans data/seeds/.
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'
import { getDb, getSqliteSync } from './database.js'
import { DATA_DIR } from '../paths.js'
import { insertOrIgnoreInto, useMysql } from './sqlDialect.js'
import { insertMediaRecord } from '../services/mediaStorage.js'

const SEEDS_DIR = join(DATA_DIR, 'seeds')

const MIME_MAP = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.gif':  'image/gif',
}

async function seedFile(db, file) {
  const ext = extname(file).toLowerCase()
  const mime = MIME_MAP[ext]
  if (!mime) return

  const destFile = `builtin-${file}`
  const id = destFile
  const buffer = readFileSync(join(SEEDS_DIR, file))

  const existing = await db.prepare('SELECT id FROM media WHERE id = ?').get(id)
  if (existing) return

  await insertMediaRecord(db, {
    id,
    filename: destFile,
    original_name: file,
    mime_type: mime,
    folder_id: 'builtin',
    buffer,
  })
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

    for (const file of files) {
      await seedFile(db, file)
    }
    return
  }

  const db = getDb()
  await db.prepare(`
    ${insertOrIgnoreInto()} media_folders (id, name, parent_id)
    VALUES ('builtin', 'Ressources intégrées', 'root')
  `).run()

  for (const file of files) {
    await seedFile(db, file)
  }
}
