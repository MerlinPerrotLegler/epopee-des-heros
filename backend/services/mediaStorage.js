import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { UPLOADS_DIR } from '../paths.js'
import { insertOrIgnoreInto, useMysql } from '../db/sqlDialect.js'

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

/** En MySQL : la base distante est la seule source de vérité (pas de cache disque local). */
export function usesRemoteMediaStorage() {
  return useMysql()
}

export function guessMimeFromFilename(filename) {
  return MIME_BY_EXT[extname(filename).toLowerCase()] || 'application/octet-stream'
}

function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })
}

export function writeDiskCache(filename, buffer) {
  if (usesRemoteMediaStorage()) return
  ensureUploadsDir()
  const filepath = join(UPLOADS_DIR, filename)
  if (!existsSync(filepath)) {
    writeFileSync(filepath, buffer)
  }
}

export function readDiskCache(filename) {
  if (usesRemoteMediaStorage()) return null
  const filepath = join(UPLOADS_DIR, filename)
  if (!existsSync(filepath)) return null
  return readFileSync(filepath)
}

export function deleteDiskCache(filename) {
  if (usesRemoteMediaStorage()) return
  const filepath = join(UPLOADS_DIR, filename)
  if (existsSync(filepath)) unlinkSync(filepath)
}

/**
 * Persiste un média : BLOB en base (source de vérité).
 * Cache disque uniquement en mode SQLite local.
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
 * Sert un fichier.
 * MySQL : BLOB en base uniquement (indépendant de la machine qui a lancé le serveur).
 * SQLite : cache disque puis BLOB.
 */
export async function getMediaForServe(db, filename) {
  const row = await db.prepare('SELECT content, mime_type, filename FROM media WHERE id = ? OR filename = ?').get(filename, filename)

  if (usesRemoteMediaStorage()) {
    if (!row?.content) return null
    const buf = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content)
    return { buffer: buf, mime_type: row.mime_type || guessMimeFromFilename(filename) }
  }

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
 * Migration : remplit content depuis le disque local (mode SQLite ou one-shot après changement de config).
 */
export async function backfillBlobsFromDisk(db) {
  const rows = await db.prepare('SELECT id, filename FROM media WHERE content IS NULL').all()
  let filled = 0
  for (const row of rows) {
    const filepath = join(UPLOADS_DIR, row.filename || row.id)
    if (!existsSync(filepath)) continue
    const buf = readFileSync(filepath)
    await db.prepare('UPDATE media SET content = ? WHERE id = ?').run(buf, row.id)
    filled += 1
  }
  if (filled > 0) {
    console.log(`[media] backfill: ${filled} fichier(s) migré(s) disque → base`)
  }
}
