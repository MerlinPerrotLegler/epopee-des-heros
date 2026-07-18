import { Router } from 'express'
import multer from 'multer'
import { createHash, randomUUID } from 'crypto'
import { extname } from 'path'
import { getDb } from '../db/database.js'
import { MEDIA_LIST_COLUMNS } from '../services/mediaStorage.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

const router = Router()

const REF_RE = /^[a-zA-Z0-9_-]+$/

function sendError(res, err) {
  res.status(err.status || 500).json({ error: err.message })
}

function isUniqueConstraintError(err) {
  const msg = String(err?.message || '')
  return err?.code === 'SQLITE_CONSTRAINT'
    || err?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || msg.includes('UNIQUE constraint failed')
    || msg.includes('Duplicate entry')
}

function assertRef(ref) {
  const r = String(ref || '').trim()
  if (!r || !REF_RE.test(r)) {
    const err = new Error('Invalid picto_ref')
    err.status = 400
    throw err
  }
  return r
}

async function assertUniqueRef(db, ref, excludeId = null) {
  let row
  if (excludeId) {
    row = await db.prepare(
      "SELECT id FROM media WHERE kind = 'picto' AND picto_ref = ? AND id != ?",
    ).get(ref, excludeId)
  } else {
    row = await db.prepare(
      "SELECT id FROM media WHERE kind = 'picto' AND picto_ref = ?",
    ).get(ref)
  }
  if (row) {
    const err = new Error('picto_ref already exists')
    err.status = 409
    throw err
  }
}

function parseTagIds(raw) {
  if (raw == null || raw === '') return []
  let ids = raw
  if (typeof raw === 'string') {
    try {
      ids = JSON.parse(raw)
    } catch {
      ids = [raw]
    }
  }
  if (!Array.isArray(ids)) return []
  return ids.map((id) => String(id).trim()).filter(Boolean)
}

async function assertValidTagIds(db, tagIds) {
  if (!tagIds.length) return
  const placeholders = tagIds.map(() => '?').join(', ')
  const rows = await db.prepare(
    `SELECT id FROM picto_tags WHERE id IN (${placeholders})`,
  ).all(...tagIds)
  if (rows.length !== tagIds.length) {
    const err = new Error('Invalid tag id')
    err.status = 400
    throw err
  }
}

async function syncPictoTags(db, mediaId, tagIds) {
  await assertValidTagIds(db, tagIds)
  await db.prepare('DELETE FROM media_picto_tags WHERE media_id = ?').run(mediaId)
  if (!tagIds.length) return
  const insert = db.prepare('INSERT INTO media_picto_tags (media_id, tag_id) VALUES (?, ?)')
  for (const tagId of tagIds) {
    await insert.run(mediaId, tagId)
  }
}

async function resolveUploadMediaId(db, file) {
  const sha1 = createHash('sha1').update(file.buffer).digest('hex')
  const ext = extname(file.originalname).toLowerCase()
  const sha1Id = `${sha1}${ext}`

  const existing = await db.prepare('SELECT id, kind FROM media WHERE id = ?').get(sha1Id)
  if (!existing) {
    return { id: sha1Id, filename: sha1Id }
  }
  if (existing.kind === 'picto') {
    const err = new Error('Picto with same content already exists')
    err.status = 409
    throw err
  }

  const id = `picto-${randomUUID()}${ext}`
  return { id, filename: id }
}

async function fetchTagsForMediaIds(db, mediaIds) {
  if (!mediaIds.length) return new Map()
  const placeholders = mediaIds.map(() => '?').join(', ')
  const rows = await db.prepare(`
    SELECT mpt.media_id, pt.id, pt.name, pt.color
    FROM media_picto_tags mpt
    JOIN picto_tags pt ON pt.id = mpt.tag_id
    WHERE mpt.media_id IN (${placeholders})
    ORDER BY pt.name
  `).all(...mediaIds)
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.media_id)) map.set(row.media_id, [])
    map.get(row.media_id).push({ id: row.id, name: row.name, color: row.color })
  }
  return map
}

function pictoRowToJson(row, tags = []) {
  return {
    id: row.id,
    filename: row.filename,
    picto_ref: row.picto_ref,
    picto_label: row.picto_label,
    source_media_id: row.source_media_id,
    kind: row.kind,
    tags,
  }
}

async function getPictoById(db, id) {
  const row = await db.prepare(
    `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ? AND kind = 'picto'`,
  ).get(id)
  if (!row) return null
  const tagMap = await fetchTagsForMediaIds(db, [id])
  return pictoRowToJson(row, tagMap.get(id) || [])
}

router.get('/', async (req, res) => {
  try {
  const db = getDb()
  const rawTag = req.query.tag
  const tagIds = rawTag == null
    ? []
    : (Array.isArray(rawTag) ? rawTag : [rawTag]).map((t) => String(t).trim()).filter(Boolean)

  let rows
  if (tagIds.length) {
    const placeholders = tagIds.map(() => '?').join(', ')
    rows = await db.prepare(`
      SELECT DISTINCT ${MEDIA_LIST_COLUMNS}
      FROM media
      WHERE kind = 'picto'
        AND id IN (
          SELECT DISTINCT media_id FROM media_picto_tags WHERE tag_id IN (${placeholders})
        )
      ORDER BY picto_ref
    `).all(...tagIds)
  } else {
    rows = await db.prepare(
      `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE kind = 'picto' ORDER BY picto_ref`,
    ).all()
  }

  const tagMap = await fetchTagsForMediaIds(db, rows.map((r) => r.id))
  res.json(rows.map((row) => pictoRowToJson(row, tagMap.get(row.id) || [])))
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return sendError(res, Object.assign(new Error('picto_ref already exists'), { status: 409 }))
    }
    sendError(res, err)
  }
})

router.post('/', upload.array('files', 20), async (req, res) => {
  try {
  const db = getDb()
  const isMultipart = req.is('multipart/form-data')

  if (isMultipart) {
    const pictoRef = assertRef(req.body.picto_ref)
    const pictoLabel = String(req.body.picto_label || '').trim()
    const tagIds = parseTagIds(req.body.tagIds)
    await assertUniqueRef(db, pictoRef)

    const files = req.files || []
    if (!files.length) return res.status(400).json({ error: 'files required' })
    if (files.length > 1) return res.status(400).json({ error: 'One file per upload' })

    const file = files[0]
    const { id, filename } = await resolveUploadMediaId(db, file)

    await db.prepare(`
      INSERT INTO media (id, filename, original_name, mime_type, width_px, height_px, folder_id, content, kind, picto_ref, picto_label, source_media_id)
      VALUES (?, ?, ?, ?, NULL, NULL, 'default', ?, 'picto', ?, ?, NULL)
    `).run(id, filename, file.originalname, file.mimetype, file.buffer, pictoRef, pictoLabel)

    await syncPictoTags(db, id, tagIds)
    return res.status(201).json(await getPictoById(db, id))
  }

  const { source_media_id, picto_ref, picto_label, tagIds: rawTagIds } = req.body || {}
  if (!source_media_id) return res.status(400).json({ error: 'source_media_id required' })

  const pictoRef = assertRef(picto_ref)
  const pictoLabel = String(picto_label || '').trim()
  const tagIds = parseTagIds(rawTagIds)
  await assertUniqueRef(db, pictoRef)

  const source = await db.prepare(
    `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ?`,
  ).get(source_media_id)
  if (!source) return res.status(404).json({ error: 'Source media not found' })
  if (source.kind && source.kind !== 'media') {
    return res.status(400).json({ error: 'Source must be kind media' })
  }

  const ext = extname(source.filename || source.original_name || '').toLowerCase()
  const id = `picto-${randomUUID()}${ext}`
  const filename = id

  await db.prepare(`
    INSERT INTO media (id, filename, original_name, mime_type, width_px, height_px, folder_id, content, kind, picto_ref, picto_label, source_media_id)
    VALUES (?, ?, ?, ?, NULL, NULL, 'default', NULL, 'picto', ?, ?, ?)
  `).run(id, filename, source.original_name, source.mime_type, pictoRef, pictoLabel, source_media_id)

  await syncPictoTags(db, id, tagIds)
  res.status(201).json(await getPictoById(db, id))
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return sendError(res, Object.assign(new Error('picto_ref already exists'), { status: 409 }))
    }
    sendError(res, err)
  }
})

router.patch('/:id', async (req, res) => {
  try {
  const db = getDb()
  const existing = await db.prepare(
    `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ? AND kind = 'picto'`,
  ).get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const { picto_ref, picto_label, tagIds: rawTagIds, source_media_id } = req.body || {}

  let nextRef = existing.picto_ref
  if (picto_ref !== undefined) {
    nextRef = assertRef(picto_ref)
    if (nextRef !== existing.picto_ref) {
      await assertUniqueRef(db, nextRef, req.params.id)
    }
  }

  let nextLabel = existing.picto_label
  if (picto_label !== undefined) {
    nextLabel = String(picto_label || '').trim()
  }

  let nextSourceId = existing.source_media_id
  if (source_media_id !== undefined) {
    if (source_media_id === null || source_media_id === '') {
      nextSourceId = null
    } else {
      const source = await db.prepare(
        `SELECT id, kind FROM media WHERE id = ?`,
      ).get(source_media_id)
      if (!source) return res.status(404).json({ error: 'Source media not found' })
      if (source.kind && source.kind !== 'media') {
        return res.status(400).json({ error: 'Source must be kind media' })
      }
      nextSourceId = source_media_id
    }
  }

  await db.prepare(`
    UPDATE media SET picto_ref = ?, picto_label = ?, source_media_id = ? WHERE id = ? AND kind = 'picto'
  `).run(nextRef, nextLabel, nextSourceId, req.params.id)

  if (rawTagIds !== undefined) {
    await syncPictoTags(db, req.params.id, parseTagIds(rawTagIds))
  }

  res.json(await getPictoById(db, req.params.id))
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return sendError(res, Object.assign(new Error('picto_ref already exists'), { status: 409 }))
    }
    sendError(res, err)
  }
})

router.put('/:id/content', upload.array('files', 1), async (req, res) => {
  try {
    const db = getDb()
    const existing = await db.prepare(
      `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ? AND kind = 'picto'`,
    ).get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })

    const files = req.files || []
    if (!files.length) return res.status(400).json({ error: 'files required' })
    if (files.length > 1) return res.status(400).json({ error: 'One file required' })

    const file = files[0]
    const mime = file.mimetype || 'image/png'
    const originalName = file.originalname || existing.original_name || 'picto.png'

    await db.prepare(`
      UPDATE media
      SET content = ?, mime_type = ?, original_name = ?, source_media_id = NULL
      WHERE id = ? AND kind = 'picto'
    `).run(file.buffer, mime, originalName, req.params.id)

    res.json(await getPictoById(db, req.params.id))
  } catch (err) {
    sendError(res, err)
  }
})

router.delete('/:id', async (req, res) => {
  try {
  const db = getDb()
  const result = await db.prepare("DELETE FROM media WHERE id = ? AND kind = 'picto'").run(req.params.id)
  if (!result.changes) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
  } catch (err) {
    sendError(res, err)
  }
})

export default router

