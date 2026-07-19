import { Router } from 'express'
import { getDb } from '../db/database.js'
import { MEDIA_LIST_COLUMNS } from '../services/mediaStorage.js'

const router = Router()

export async function allocateTrackId(db) {
  const rows = await db.prepare(
    `SELECT track_meta FROM media WHERE kind = 'track' AND track_meta IS NOT NULL`,
  ).all()
  const used = new Set()
  for (const row of rows) {
    try {
      const meta = typeof row.track_meta === 'string' ? JSON.parse(row.track_meta) : row.track_meta
      if (meta && Number.isInteger(meta.id) && meta.id >= 0) used.add(meta.id)
    } catch {
      // Ignore invalid legacy metadata when allocating an id.
    }
  }
  let id = 0
  while (used.has(id)) id++
  return id
}

export function defaultTrackMeta(id) {
  return {
    id,
    label: null,
    type: 'droit',
    alignment: 'both',
    voisins: [],
    margins: { left: 0, right: 0, top: 0, bottom: 0 },
  }
}

function parseTrackMeta(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
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
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))]
}

async function assertValidTagIds(db, tagIds) {
  if (!tagIds.length) return
  const placeholders = tagIds.map(() => '?').join(', ')
  const rows = await db.prepare(
    `SELECT id FROM track_tags WHERE id IN (${placeholders})`,
  ).all(...tagIds)
  if (rows.length !== tagIds.length) {
    const error = new Error('Invalid tag id')
    error.status = 400
    throw error
  }
}

async function syncTrackTags(db, mediaId, tagIds) {
  await assertValidTagIds(db, tagIds)
  await db.prepare('DELETE FROM media_track_tags WHERE media_id = ?').run(mediaId)
  const insert = db.prepare('INSERT INTO media_track_tags (media_id, tag_id) VALUES (?, ?)')
  for (const tagId of tagIds) {
    await insert.run(mediaId, tagId)
  }
}

async function fetchTagsForMediaIds(db, mediaIds) {
  if (!mediaIds.length) return new Map()
  const placeholders = mediaIds.map(() => '?').join(', ')
  const rows = await db.prepare(`
    SELECT mtt.media_id, tt.id, tt.name, tt.color
    FROM media_track_tags mtt
    JOIN track_tags tt ON tt.id = mtt.tag_id
    WHERE mtt.media_id IN (${placeholders})
    ORDER BY tt.name
  `).all(...mediaIds)
  const tagsByMedia = new Map()
  for (const row of rows) {
    if (!tagsByMedia.has(row.media_id)) tagsByMedia.set(row.media_id, [])
    tagsByMedia.get(row.media_id).push({ id: row.id, name: row.name, color: row.color })
  }
  return tagsByMedia
}

function trackRowToJson(row, tags = []) {
  return {
    ...row,
    track_meta: parseTrackMeta(row.track_meta),
    tags,
  }
}

async function getTrackById(db, mediaId) {
  const row = await db.prepare(
    `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ? AND kind = 'track'`,
  ).get(mediaId)
  if (!row) return null
  const tagsByMedia = await fetchTagsForMediaIds(db, [mediaId])
  return trackRowToJson(row, tagsByMedia.get(mediaId) || [])
}

router.get('/', async (req, res) => {
  const db = getDb()
  const rawTags = req.query.tag
  const tagIds = rawTags == null
    ? []
    : (Array.isArray(rawTags) ? rawTags : [rawTags]).map((tag) => String(tag).trim()).filter(Boolean)

  let rows
  if (tagIds.length) {
    const placeholders = tagIds.map(() => '?').join(', ')
    rows = await db.prepare(`
      SELECT DISTINCT ${MEDIA_LIST_COLUMNS}
      FROM media
      WHERE kind = 'track'
        AND id IN (
          SELECT DISTINCT media_id FROM media_track_tags WHERE tag_id IN (${placeholders})
        )
      ORDER BY original_name
    `).all(...tagIds)
  } else {
    rows = await db.prepare(
      `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE kind = 'track' ORDER BY original_name`,
    ).all()
  }

  const type = req.query.type == null ? '' : String(req.query.type).trim()
  if (type) {
    rows = rows.filter((row) => parseTrackMeta(row.track_meta)?.type === type)
  }
  const tagsByMedia = await fetchTagsForMediaIds(db, rows.map((row) => row.id))
  res.json(rows.map((row) => trackRowToJson(row, tagsByMedia.get(row.id) || [])))
})

router.patch('/:mediaId', async (req, res) => {
  const db = getDb()
  const existing = await db.prepare(
    `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ? AND kind = 'track'`,
  ).get(req.params.mediaId)
  if (!existing) return res.status(404).json({ error: 'Not found' })

  if (req.body?.track_meta !== undefined) {
    const patch = req.body.track_meta
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return res.status(400).json({ error: 'track_meta must be an object' })
    }
    const current = parseTrackMeta(existing.track_meta)
    const id = patch.id ?? current?.id ?? await allocateTrackId(db)
    const base = current || defaultTrackMeta(id)
    const next = {
      ...base,
      ...patch,
      id,
      margins: {
        ...base.margins,
        ...(patch.margins || {}),
      },
    }
    await db.prepare('UPDATE media SET track_meta = ? WHERE id = ? AND kind = ?')
      .run(JSON.stringify(next), req.params.mediaId, 'track')
  }

  if (req.body?.tagIds !== undefined) {
    await syncTrackTags(db, req.params.mediaId, parseTagIds(req.body.tagIds))
  }

  res.json(await getTrackById(db, req.params.mediaId))
})

export default router
