import { join, extname } from 'path'
import { insertOrIgnoreInto } from '../db/sqlDialect.js'

/** Colonnes exposées par l'API (sans le BLOB) */
export const MEDIA_LIST_COLUMNS =
  'id, filename, original_name, mime_type, width_px, height_px, folder_id, kind, picto_ref, picto_label, source_media_id, created_at'

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
}

export function guessMimeFromFilename(filename) {
  return MIME_BY_EXT[extname(filename).toLowerCase()] || 'application/octet-stream'
}

function toBuffer(content) {
  if (!content) return null
  return Buffer.isBuffer(content) ? content : Buffer.from(content)
}

/** Persiste un média : BLOB en base uniquement (aucun fichier disque). */
export async function insertMediaRecord(db, {
  id,
  filename,
  original_name,
  mime_type,
  folder_id,
  buffer,
  width_px = null,
  height_px = null,
  kind = 'media',
  picto_ref = null,
  picto_label = null,
  source_media_id = null,
}) {
  const sql = `${insertOrIgnoreInto()} media (id, filename, original_name, mime_type, width_px, height_px, folder_id, content, kind, picto_ref, picto_label, source_media_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  await db.prepare(sql).run(id, filename, original_name, mime_type, width_px, height_px, folder_id, buffer, kind, picto_ref, picto_label, source_media_id)
}

/** Sert un fichier depuis le BLOB en base. */
export async function getMediaForServe(db, filename) {
  const row = await db.prepare(
    'SELECT id, content, mime_type, source_media_id FROM media WHERE id = ? OR filename = ?',
  ).get(filename, filename)
  if (!row) return null
  let buf = toBuffer(row.content)
  let mime = row.mime_type
  if (!buf && row.source_media_id) {
    const src = await db.prepare(
      'SELECT content, mime_type FROM media WHERE id = ?',
    ).get(row.source_media_id)
    buf = toBuffer(src?.content)
    mime = src?.mime_type || mime
  }
  if (!buf) return null
  return { buffer: buf, mime_type: mime || guessMimeFromFilename(filename) }
}
