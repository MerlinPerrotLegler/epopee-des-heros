import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { UPLOADS_DIR } from '../paths.js'
import { insertOrIgnoreInto } from '../db/sqlDialect.js'

/** Colonnes exposées par l'API (sans le BLOB) */
export const MEDIA_LIST_COLUMNS = 'id, filename, original_name, mime_type, width_px, height_px, folder_id, created_at'

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

function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })
}

export function writeDiskCache(filename, buffer) {
  ensureUploadsDir()
  const filepath = join(UPLOADS_DIR, filename)
  if (!existsSync(filepath)) {
    writeFileSync(filepath, buffer)
  }
}

export function readDiskCache(filename) {
  const filepath = join(UPLOADS_DIR, filename)
  if (!existsSync(filepath)) return null
  return readFileSync(filepath)
}

export function deleteDiskCache(filename) {
  const filepath = join(UPLOADS_DIR, filename)
  if (existsSync(filepath)) unlinkSync(filepath)
}

/**
 * Persiste un média : BLOB en base (source de vérité) + cache disque optionnel.
 */
export async function insertMediaRecord(db, {
  id,
  filename,
  original_name,
  mime_type,
  folder_id,
  buffer,
  width_px = null,
  height_px = null,
}) {
  writeDiskCache(filename, buffer)
  const sql = `${insertOrIgnoreInto()} media (id, filename, original_name, mime_type, width_px, height_px, folder_id, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  await db.prepare(sql).run(id, filename, original_name, mime_type, width_px, height_px, folder_id, buffer)
}

/**
 * Sert un fichier : cache disque d'abord, sinon BLOB en base.
 */
export async function getMediaForServe(db, filename) {
  const row = await db.prepare('SELECT content, mime_type, filename FROM media WHERE id = ? OR filename = ?').get(filename, filename)
  const disk = readDiskCache(filename)
  if (disk) {
    return {
      buffer: disk,
      mime_type: row?.mime_type || guessMimeFromFilename(filename),
    }
  }
  if (row?.content) {
    const buf = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content)
    return { buffer: buf, mime_type: row.mime_type || guessMimeFromFilename(filename) }
  }
  return null
}

/**
 * Migration douce : remplit content depuis le disque pour les lignes existantes.
 */
export async function backfillBlobsFromDisk(db) {
  const rows = await db.prepare('SELECT id, filename FROM media WHERE content IS NULL').all()
  let filled = 0
  for (const row of rows) {
    const buf = readDiskCache(row.filename || row.id)
    if (!buf) continue
    await db.prepare('UPDATE media SET content = ? WHERE id = ?').run(buf, row.id)
    filled += 1
  }
  if (filled > 0) {
    console.log(`[media] backfill: ${filled} fichier(s) migré(s) disque → base`)
  }
}
