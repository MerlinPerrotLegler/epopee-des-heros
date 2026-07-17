/**
 * seedBuiltins.js
 * ───────────────
 * Seede les assets visuels par défaut dans la médiathèque au démarrage.
 *
 * Les fichiers sources sont lus une fois depuis `backend/seeds/` (versionnés dans le repo),
 * puis stockés en BLOB dans `media.content`. Aucune écriture dans data/uploads/.
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getDb } from './database.js'
import { insertOrIgnoreInto } from './sqlDialect.js'
import { insertMediaRecord } from '../services/mediaStorage.js'

const SEEDS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'seeds')

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

  const db = getDb()
  await db.prepare(`
    ${insertOrIgnoreInto()} media_folders (id, name, parent_id)
    VALUES ('builtin', 'Ressources intégrées', 'root')
  `).run()

  for (const file of files) {
    await seedFile(db, file)
  }
}
