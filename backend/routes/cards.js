import { Router } from 'express';
import multer from 'multer';
import { getDb, getSqliteSync } from '../db/database.js';
import { insertOrIgnoreInto, useMysql, parseJsonColumn } from '../db/sqlDialect.js';
import { unresolvedMediaBindings, mediaTypeForBinding } from '../utils/missingMediaDetect.js';
import { randomUUID } from 'crypto';
import {
  parseCsvText,
  previewCsvText,
  normalizeGoogleSheetsUrl,
  isSyncableImportSource,
} from '../utils/parseCsv.js';
import {
  parseBool,
  mapRowToBindingData,
  decideImportAction,
  importRowKey,
  cardsMissingFromCsv,
  serializeCsv,
} from '../utils/importHelpers.js';

export { parseCsvText, normalizeGoogleSheetsUrl, previewCsvText };

const router = Router();
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Detect mediaId bindings that reference non-existent media, and record in missing_media.
 * Non-blocking: errors are swallowed.
 */
function layersForLayout(db, layoutId, cache) {
  if (!layoutId) return []
  if (!cache[layoutId]) {
    try {
      const layout = db.prepare('SELECT definition FROM layouts WHERE id = ?').get(layoutId)
      cache[layoutId] = parseJsonColumn(layout?.definition || '{}')?.layers || []
    } catch {
      cache[layoutId] = []
    }
  }
  return cache[layoutId]
}

function detectMissingMedia(instanceId, data, db, layoutId, layoutCache = {}) {
  try {
    for (const { binding_path, media_id_ref } of unresolvedMediaBindings(data)) {
      const exists = db.prepare('SELECT id FROM media WHERE id = ?').get(media_id_ref)
      if (!exists) {
        const mediaType = mediaTypeForBinding(layersForLayout(db, layoutId, layoutCache), binding_path)
        db.prepare(`INSERT OR IGNORE INTO missing_media
          (id, card_instance_id, binding_path, media_id_ref, media_type, status)
          VALUES (?, ?, ?, ?, ?, 'pending')`)
          .run(randomUUID(), instanceId, binding_path, media_id_ref, mediaType)
      }
    }
  } catch { /* non-blocking */ }
}

async function detectMissingMediaAsync(instanceId, data, db, layoutId, layoutCache = {}) {
  try {
    const insertSql = `${insertOrIgnoreInto()} missing_media
      (id, card_instance_id, binding_path, media_id_ref, media_type, status)
      VALUES (?, ?, ?, ?, ?, 'pending')`
    for (const { binding_path, media_id_ref } of unresolvedMediaBindings(data)) {
      const exists = await db.prepare('SELECT id FROM media WHERE id = ?').get(media_id_ref)
      if (!exists) {
        if (layoutId && !layoutCache[layoutId]) {
          const layout = await db.prepare('SELECT definition FROM layouts WHERE id = ?').get(layoutId)
          layoutCache[layoutId] = parseJsonColumn(layout?.definition || '{}')?.layers || []
        }
        const mediaType = mediaTypeForBinding(layoutCache[layoutId] || [], binding_path)
        await db.prepare(insertSql).run(randomUUID(), instanceId, binding_path, media_id_ref, mediaType)
      }
    }
  } catch { /* non-blocking */ }
}

/**
 * Core upsert pipeline. Returns { created, updated, skipped, deleted, errors[] }.
 */
export function runImportPipeline(db, {
  rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId,
  overwrite = true, pruneMissing = false,
}) {
  let created = 0, updated = 0, skipped = 0, deleted = 0
  const errors = []
  const seen = new Set()
  const layoutCache = {}

  const layoutsByName = {}
  if (mode === 'multi') {
    const layouts = db.prepare('SELECT id, name FROM layouts').all()
    layouts.forEach(l => { layoutsByName[l.name.toLowerCase()] = l.id })
  }

  const upsert = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      let resolvedLayoutId = layoutId
      if (mode === 'multi') {
        const layoutName = row[layoutColumn]
        if (!layoutName) { errors.push(`Ligne ${i + 2}: colonne "${layoutColumn}" vide`); skipped++; continue }
        resolvedLayoutId = layoutsByName[layoutName.toLowerCase()]
        if (!resolvedLayoutId) { errors.push(`Ligne ${i + 2}: layout "${layoutName}" introuvable`); skipped++; continue }
      }

      const idValue = row[idColumn]
      if (!idValue) { errors.push(`Ligne ${i + 2}: identifiant "${idColumn}" vide`); skipped++; continue }

      seen.add(importRowKey(resolvedLayoutId, idValue))
      const layoutMapping = mappings[resolvedLayoutId] || mappings['*'] || {}
      const data = mapRowToBindingData(row, layoutMapping)

      const existing = db.prepare(
        'SELECT id FROM card_instances WHERE name = ? AND layout_id = ? AND import_job_id = ?'
      ).get(idValue, resolvedLayoutId, jobId)

      const action = decideImportAction(existing, overwrite)
      if (action === 'skip') {
        errors.push(`Ligne ${i + 2}: « ${idValue} » existe déjà (non écrasée)`)
        skipped++
        continue
      }
      if (action === 'update') {
        db.prepare(`UPDATE card_instances SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), existing.id)
        detectMissingMedia(existing.id, data, db, resolvedLayoutId, layoutCache)
        updated++
      } else {
        const newId = randomUUID()
        const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM card_instances WHERE layout_id = ?').get(resolvedLayoutId)
        db.prepare('INSERT INTO card_instances (id, layout_id, name, data, import_job_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
          .run(newId, resolvedLayoutId, idValue, JSON.stringify(data), jobId, (maxOrder?.m || 0) + 1)
        detectMissingMedia(newId, data, db, resolvedLayoutId, layoutCache)
        created++
      }
    }

    if (pruneMissing) {
      const existingCards = db.prepare('SELECT id, layout_id, name FROM card_instances WHERE import_job_id = ?').all(jobId)
      for (const card of cardsMissingFromCsv(existingCards, seen)) {
        db.prepare('DELETE FROM card_instances WHERE id = ?').run(card.id)
        deleted++
      }
    }
  })

  upsert()
  return { created, updated, skipped, deleted, errors }
}

/**
 * Même logique que runImportPipeline mais async (pool MySQL / adaptateur).
 */
export async function runImportPipelineAsync(db, {
  rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId,
  overwrite = true, pruneMissing = false,
}) {
  let created = 0
  let updated = 0
  let skipped = 0
  let deleted = 0
  const errors = []
  const seen = new Set()
  const layoutCache = {}

  const layoutsByName = {}
  if (mode === 'multi') {
    const layouts = await db.prepare('SELECT id, name FROM layouts').all()
    layouts.forEach((l) => { layoutsByName[l.name.toLowerCase()] = l.id })
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      let resolvedLayoutId = layoutId
      if (mode === 'multi') {
        const layoutName = row[layoutColumn]
        if (!layoutName) { errors.push(`Ligne ${i + 2}: colonne "${layoutColumn}" vide`); skipped++; continue }
        resolvedLayoutId = layoutsByName[layoutName.toLowerCase()]
        if (!resolvedLayoutId) { errors.push(`Ligne ${i + 2}: layout "${layoutName}" introuvable`); skipped++; continue }
      }

      const idValue = row[idColumn]
      if (!idValue) { errors.push(`Ligne ${i + 2}: identifiant "${idColumn}" vide`); skipped++; continue }

      seen.add(importRowKey(resolvedLayoutId, idValue))
      const layoutMapping = mappings[resolvedLayoutId] || mappings['*'] || {}
      const data = mapRowToBindingData(row, layoutMapping)

      const existing = await tx.prepare(
        'SELECT id FROM card_instances WHERE name = ? AND layout_id = ? AND import_job_id = ?',
      ).get(idValue, resolvedLayoutId, jobId)

      const action = decideImportAction(existing, overwrite)
      if (action === 'skip') {
        errors.push(`Ligne ${i + 2}: « ${idValue} » existe déjà (non écrasée)`)
        skipped++
        continue
      }
      if (action === 'update') {
        await tx.prepare(`UPDATE card_instances SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), existing.id)
        await detectMissingMediaAsync(existing.id, data, tx, resolvedLayoutId, layoutCache)
        updated++
      } else {
        const newId = randomUUID()
        const maxOrder = await tx.prepare('SELECT MAX(sort_order) as m FROM card_instances WHERE layout_id = ?').get(resolvedLayoutId)
        const m = maxOrder?.m ?? maxOrder?.['MAX(sort_order)']
        await tx.prepare('INSERT INTO card_instances (id, layout_id, name, data, import_job_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
          .run(newId, resolvedLayoutId, idValue, JSON.stringify(data), jobId, (Number(m) || 0) + 1)
        await detectMissingMediaAsync(newId, data, tx, resolvedLayoutId, layoutCache)
        created++
      }
    }

    if (pruneMissing) {
      const existingCards = await tx.prepare('SELECT id, layout_id, name FROM card_instances WHERE import_job_id = ?').all(jobId)
      for (const card of cardsMissingFromCsv(existingCards, seen)) {
        await tx.prepare('DELETE FROM card_instances WHERE id = ?').run(card.id)
        deleted++
      }
    }
  })()

  return { created, updated, skipped, deleted, errors }
}

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

async function persistCsvImport({
  rows, sourceUrl, mode = 'single', layoutId, layoutColumn, idColumn, mappings = {}, label,
  overwrite = true, pruneMissing = false,
}) {
  if (!idColumn) {
    const err = new Error('idColumn required')
    err.status = 400
    throw err
  }
  if (mode === 'single' && !layoutId) {
    const err = new Error('layoutId required for single mode')
    err.status = 400
    throw err
  }
  if (mode === 'multi' && !layoutColumn) {
    const err = new Error('layoutColumn required for multi mode')
    err.status = 400
    throw err
  }
  if (!rows?.length) {
    const err = new Error('CSV vide ou sans données')
    err.status = 422
    throw err
  }
  const headers = Object.keys(rows[0])
  if (!headers.includes(idColumn)) {
    const err = new Error(`Colonne identifiant "${idColumn}" absente du CSV`)
    err.status = 422
    throw err
  }

  const db = getDb()
  const jobId = randomUUID()
  await db.prepare(`INSERT INTO import_jobs (id, label, source_url, mode, layout_id, layout_column, id_column, mappings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      jobId,
      label || `Import ${new Date().toLocaleDateString('fr-FR')}`,
      sourceUrl,
      mode,
      layoutId || null,
      layoutColumn || null,
      idColumn,
      JSON.stringify(mappings || {}),
    )

  const stats = useMysql()
    ? await runImportPipelineAsync(db, {
      rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId, overwrite, pruneMissing,
    })
    : runImportPipeline(getSqliteSync(), {
      rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId, overwrite, pruneMissing,
    })

  await db.prepare(`UPDATE import_jobs SET last_synced_at = CURRENT_TIMESTAMP, last_sync_stats = ? WHERE id = ?`)
    .run(JSON.stringify(stats), jobId)

  if (mode === 'single' && layoutId && isSyncableImportSource(sourceUrl)) {
    try {
      await db.prepare('UPDATE layouts SET sheets_url = ? WHERE id = ?').run(sourceUrl, layoutId)
    } catch { /* colonne optionnelle */ }
  }

  return { ok: true, jobId, ...stats }
}

function sendImportError(res, err) {
  const status = err.status || (err.message?.includes('required') ? 400 : 500)
  res.status(status).json({ error: err.message })
}

// ============================================================
// Routes — specific paths MUST come before /:id
// ============================================================

// Preview CSV from URL (returns headers + first 5 rows, no import)
router.post('/preview-url', async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })
  try {
    const normalized = normalizeGoogleSheetsUrl(url.trim())
    const response = await fetch(normalized)
    if (!response.ok) throw new Error(`HTTP ${response.status} lors de la récupération de l'URL`)
    const csvText = await response.text()
    res.json(previewCsvText(csvText))
  } catch (err) {
    res.status(err.status || 422).json({ error: err.message })
  }
})

// Preview CSV from pasted text or uploaded file
router.post('/preview', csvUpload.single('file'), async (req, res) => {
  try {
    const csvText = req.file
      ? req.file.buffer.toString('utf8')
      : (req.body?.csvText || '')
    if (!String(csvText).trim()) return res.status(400).json({ error: 'csvText or file required' })
    res.json(previewCsvText(csvText))
  } catch (err) {
    res.status(err.status || 422).json({ error: err.message })
  }
})

// Full import from URL (creates ImportJob + upserts instances)
router.post('/import-url', async (req, res) => {
  const { sourceUrl, mode = 'single', layoutId, layoutColumn, idColumn, mappings = {}, label } = req.body

  if (!sourceUrl) return res.status(400).json({ error: 'sourceUrl required' })

  try {
    const url = normalizeGoogleSheetsUrl(sourceUrl.trim())
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status} lors de la récupération de l'URL`)
    const csvText = await response.text()
    const rows = parseCsvText(csvText)
    const result = await persistCsvImport({
      rows, sourceUrl, mode, layoutId, layoutColumn, idColumn, mappings, label,
      overwrite: parseBool(req.body.overwrite, true),
      pruneMissing: parseBool(req.body.pruneMissing, false),
    })
    res.status(201).json(result)
  } catch (err) {
    sendImportError(res, err)
  }
})

// Export cards as CSV
router.get('/export', async (req, res) => {
  const db = getDb()
  const { layout_id } = req.query
  if (!layout_id) return res.status(400).json({ error: 'layout_id required' })

  const cards = await db.prepare('SELECT * FROM card_instances WHERE layout_id = ? ORDER BY sort_order, name').all(layout_id)
  if (!cards.length) return res.status(404).json({ error: 'Aucune carte pour ce layout' })

  // Collect all binding path keys
  const allKeys = new Set(['name'])
  cards.forEach(c => {
    const data = typeof c.data === 'string' ? JSON.parse(c.data) : c.data
    Object.keys(data).forEach(k => allKeys.add(k))
  })
  const headers = [...allKeys]

  const csvRows = cards.map((card) => {
    const data = typeof card.data === 'string' ? JSON.parse(card.data) : card.data
    const row = { name: card.name }
    headers.forEach((h) => {
      if (h === 'name') return
      row[h] = data[h] ?? ''
    })
    return row
  })
  const csv = serializeCsv(headers, csvRows)

  const layout = await db.prepare('SELECT name FROM layouts WHERE id = ?').get(layout_id)
  const filename = `cartes-${layout?.name || layout_id}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
})

// Import CSV file (multipart) or csvText/rows JSON — same pipeline as import-url
router.post('/import', csvUpload.single('file'), async (req, res) => {
  try {
    const body = req.body || {}
    const mappings = parseJsonField(body.mappings, {})
    const mapping = parseJsonField(body.mapping, null)
    let rows = parseJsonField(body.rows, null)

    const csvText = req.file
      ? req.file.buffer.toString('utf8')
      : (body.csvText || '')
    if (!rows && csvText) rows = parseCsvText(csvText)

    // Legacy JSON: { layout_id, rows, mapping }
    if (body.layout_id && rows && mapping) {
      const layoutId = body.layout_id
      const idColumn = body.idColumn || Object.keys(mapping)[0] || 'name'
      const result = await persistCsvImport({
        rows,
        sourceUrl: `file:${body.filename || req.file?.originalname || 'manuel.csv'}`,
        mode: 'single',
        layoutId,
        idColumn,
        mappings: { [layoutId]: mapping },
        label: body.label || `Import manuel ${new Date().toLocaleDateString('fr-FR')}`,
      })
      return res.status(201).json({ imported: result.created, ...result })
    }

    const mode = body.mode || 'single'
    const layoutId = body.layoutId || null
    const layoutColumn = body.layoutColumn || null
    const idColumn = body.idColumn
    const filename = body.filename || req.file?.originalname || 'import.csv'
    const sourceUrl = body.sourceUrl || `file:${filename}`

    const result = await persistCsvImport({
      rows,
      sourceUrl,
      mode,
      layoutId,
      layoutColumn,
      idColumn,
      mappings,
      label: body.label,
      overwrite: parseBool(body.overwrite, true),
      pruneMissing: parseBool(body.pruneMissing, false),
    })
    res.status(201).json(result)
  } catch (err) {
    sendImportError(res, err)
  }
})

// Save import mapping template
router.post('/import-mapping', async (req, res) => {
  const db = getDb()
  const { layout_id, name, mapping } = req.body
  const id = randomUUID()
  await db.prepare('INSERT INTO import_mappings (id, layout_id, name, mapping) VALUES (?, ?, ?, ?)').run(
    id, layout_id, name, JSON.stringify(mapping),
  )
  res.status(201).json({ id, layout_id, name, mapping })
})

// Get import mapping templates for a layout
router.get('/import-mapping/:layout_id', async (req, res) => {
  const db = getDb()
  const rows = await db.prepare('SELECT * FROM import_mappings WHERE layout_id = ?').all(req.params.layout_id)
  rows.forEach((r) => { r.mapping = typeof r.mapping === 'string' ? JSON.parse(r.mapping) : r.mapping })
  res.json(rows)
})

// Delete by layout (bulk)
router.delete('/by-layout/:layout_id', async (req, res) => {
  const db = getDb()
  const info = await db.prepare('DELETE FROM card_instances WHERE layout_id = ?').run(req.params.layout_id)
  res.json({ deleted: info.changes })
})

// ── Generic /:id routes LAST ────────────────────────────────

// List card instances
router.get('/', async (req, res) => {
  const db = getDb()
  const { layout_id } = req.query
  let rows
  if (layout_id) {
    rows = await db.prepare('SELECT * FROM card_instances WHERE layout_id = ? ORDER BY sort_order, name').all(layout_id)
  } else {
    rows = await db.prepare('SELECT * FROM card_instances ORDER BY layout_id, sort_order, name').all()
  }
  rows.forEach((r) => { r.data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data })
  res.json(rows)
})

// Get single card instance
router.get('/:id', async (req, res) => {
  const db = getDb()
  const row = await db.prepare('SELECT * FROM card_instances WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  row.data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  res.json(row)
})

// Create card instance
router.post('/', async (req, res) => {
  const db = getDb()
  const { layout_id, name, data } = req.body
  if (!layout_id || !name) return res.status(400).json({ error: 'layout_id and name required' })

  const id = randomUUID()
  const maxOrder = await db.prepare('SELECT MAX(sort_order) as m FROM card_instances WHERE layout_id = ?').get(layout_id)
  const m = maxOrder?.m ?? maxOrder?.['MAX(sort_order)']
  await db.prepare('INSERT INTO card_instances (id, layout_id, name, data, sort_order) VALUES (?, ?, ?, ?, ?)').run(
    id, layout_id, name, JSON.stringify(data || {}), (Number(m) || 0) + 1,
  )
  const row = await db.prepare('SELECT * FROM card_instances WHERE id = ?').get(id)
  row.data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  res.status(201).json(row)
})

// Update card instance
router.put('/:id', async (req, res) => {
  const db = getDb()
  const { name, data, sort_order } = req.body
  await db.prepare(`UPDATE card_instances SET
    name = COALESCE(?, name), data = COALESCE(?, data),
    sort_order = COALESCE(?, sort_order), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(name ?? null, data != null ? JSON.stringify(data) : null, sort_order ?? null, req.params.id)
  const row = await db.prepare('SELECT * FROM card_instances WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  row.data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data
  res.json(row)
})

// Delete card instance
router.delete('/:id', async (req, res) => {
  const db = getDb()
  await db.prepare('DELETE FROM card_instances WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router;
