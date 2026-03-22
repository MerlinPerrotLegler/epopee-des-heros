import { Router } from 'express';
import { getDb, getSqliteSync } from '../db/database.js';
import { insertOrIgnoreInto, useMysql } from '../db/sqlDialect.js';
import { randomUUID } from 'crypto';

const router = Router();

// ============================================================
// Shared utilities (exported for importJobs.js reuse)
// ============================================================

/**
 * Normalize Google Sheets URL to published CSV format.
 */
export function normalizeGoogleSheetsUrl(url) {
  if (url.includes('docs.google.com/spreadsheets')) {
    // Extract gid param if present
    const gidMatch = url.match(/[?&]gid=(\d+)/)
    const gid = gidMatch ? `&gid=${gidMatch[1]}` : ''
    const base = url.replace(/\/edit.*$/, '').replace(/\/pub.*$/, '')
    return `${base}/pub?output=csv${gid}`
  }
  return url
}

/**
 * RFC 4180-compliant CSV parser (handles quoted fields, embedded commas, CRLF).
 * Returns array of objects using first row as headers.
 */
export function parseCsvText(text) {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!text) return []

  const parseRow = (line) => {
    const fields = []
    let i = 0
    while (i <= line.length) {
      if (i === line.length) { fields.push(''); break }
      if (line[i] === '"') {
        i++ // skip opening quote
        let field = ''
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
          else if (line[i] === '"') { i++; break }
          else { field += line[i++] }
        }
        fields.push(field)
        if (line[i] === ',') i++
        else break
      } else {
        const end = line.indexOf(',', i)
        if (end === -1) { fields.push(line.slice(i).trim()); break }
        fields.push(line.slice(i, end).trim())
        i = end + 1
      }
    }
    return fields
  }

  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const values = parseRow(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })
}

/**
 * Detect mediaId bindings that reference non-existent media, and record in missing_media.
 * Non-blocking: errors are swallowed.
 */
function detectMissingMedia(instanceId, data, db) {
  try {
    for (const [path, value] of Object.entries(data)) {
      if (!path.endsWith('.mediaId') || !value) continue
      const exists = db.prepare('SELECT id FROM media WHERE id = ?').get(value)
      if (!exists) {
        db.prepare(`INSERT OR IGNORE INTO missing_media
          (id, card_instance_id, binding_path, media_id_ref, status)
          VALUES (?, ?, ?, ?, 'pending')`)
          .run(randomUUID(), instanceId, path, value)
      }
    }
  } catch { /* non-blocking */ }
}

async function detectMissingMediaAsync(instanceId, data, db) {
  try {
    const insertSql = `${insertOrIgnoreInto()} missing_media
      (id, card_instance_id, binding_path, media_id_ref, status)
      VALUES (?, ?, ?, ?, 'pending')`
    for (const [path, value] of Object.entries(data)) {
      if (!path.endsWith('.mediaId') || !value) continue
      const exists = await db.prepare('SELECT id FROM media WHERE id = ?').get(value)
      if (!exists) {
        await db.prepare(insertSql).run(randomUUID(), instanceId, path, value)
      }
    }
  } catch { /* non-blocking */ }
}

/**
 * Core upsert pipeline. Returns { created, updated, skipped, errors[] }.
 * Can be called from cards.js (new import) or importJobs.js (sync).
 */
export function runImportPipeline(db, { rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId }) {
  let created = 0, updated = 0, skipped = 0
  const errors = []

  // Resolve layout name → id map for multi mode
  const layoutsByName = {}
  if (mode === 'multi') {
    const layouts = db.prepare('SELECT id, name FROM layouts').all()
    layouts.forEach(l => { layoutsByName[l.name.toLowerCase()] = l.id })
  }

  const upsert = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Resolve layout
      let resolvedLayoutId = layoutId
      if (mode === 'multi') {
        const layoutName = row[layoutColumn]
        if (!layoutName) { errors.push(`Ligne ${i + 2}: colonne "${layoutColumn}" vide`); skipped++; continue }
        resolvedLayoutId = layoutsByName[layoutName.toLowerCase()]
        if (!resolvedLayoutId) { errors.push(`Ligne ${i + 2}: layout "${layoutName}" introuvable`); skipped++; continue }
      }

      // Check idColumn value
      const idValue = row[idColumn]
      if (!idValue) { errors.push(`Ligne ${i + 2}: identifiant "${idColumn}" vide`); skipped++; continue }

      // Apply mapping: { csvCol: bindingPath }
      const layoutMapping = mappings[resolvedLayoutId] || mappings['*'] || {}
      const data = {}
      for (const [csvCol, bindPath] of Object.entries(layoutMapping)) {
        if (bindPath && row[csvCol] !== undefined && row[csvCol] !== '') {
          data[bindPath] = row[csvCol]
        }
      }

      // Upsert: match by name + layout_id + import_job_id
      const existing = db.prepare(
        'SELECT id FROM card_instances WHERE name = ? AND layout_id = ? AND import_job_id = ?'
      ).get(idValue, resolvedLayoutId, jobId)

      if (existing) {
        db.prepare(`UPDATE card_instances SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), existing.id)
        detectMissingMedia(existing.id, data, db)
        updated++
      } else {
        const newId = randomUUID()
        const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM card_instances WHERE layout_id = ?').get(resolvedLayoutId)
        db.prepare('INSERT INTO card_instances (id, layout_id, name, data, import_job_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
          .run(newId, resolvedLayoutId, idValue, JSON.stringify(data), jobId, (maxOrder?.m || 0) + 1)
        detectMissingMedia(newId, data, db)
        created++
      }
    }
  })

  upsert()
  return { created, updated, skipped, errors }
}

/**
 * Même logique que runImportPipeline mais async (pool MySQL / adaptateur).
 */
export async function runImportPipelineAsync(db, { rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId }) {
  let created = 0
  let updated = 0
  let skipped = 0
  const errors = []

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

      const layoutMapping = mappings[resolvedLayoutId] || mappings['*'] || {}
      const data = {}
      for (const [csvCol, bindPath] of Object.entries(layoutMapping)) {
        if (bindPath && row[csvCol] !== undefined && row[csvCol] !== '') {
          data[bindPath] = row[csvCol]
        }
      }

      const existing = await tx.prepare(
        'SELECT id FROM card_instances WHERE name = ? AND layout_id = ? AND import_job_id = ?',
      ).get(idValue, resolvedLayoutId, jobId)

      if (existing) {
        await tx.prepare(`UPDATE card_instances SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), existing.id)
        await detectMissingMediaAsync(existing.id, data, tx)
        updated++
      } else {
        const newId = randomUUID()
        const maxOrder = await tx.prepare('SELECT MAX(sort_order) as m FROM card_instances WHERE layout_id = ?').get(resolvedLayoutId)
        const m = maxOrder?.m ?? maxOrder?.['MAX(sort_order)']
        await tx.prepare('INSERT INTO card_instances (id, layout_id, name, data, import_job_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
          .run(newId, resolvedLayoutId, idValue, JSON.stringify(data), jobId, (Number(m) || 0) + 1)
        await detectMissingMediaAsync(newId, data, tx)
        created++
      }
    }
  })()

  return { created, updated, skipped, errors }
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
    const rows = parseCsvText(csvText)
    if (!rows.length) return res.status(422).json({ error: 'CSV vide ou sans données' })
    const headers = Object.keys(rows[0])
    res.json({ headers, preview: rows.slice(0, 5), totalRows: rows.length })
  } catch (err) {
    res.status(422).json({ error: err.message })
  }
})

// Full import from URL (creates ImportJob + upserts instances)
router.post('/import-url', async (req, res) => {
  const db = getDb()
  const { sourceUrl, mode = 'single', layoutId, layoutColumn, idColumn, mappings = {}, label } = req.body

  if (!sourceUrl) return res.status(400).json({ error: 'sourceUrl required' })
  if (!idColumn) return res.status(400).json({ error: 'idColumn required' })
  if (mode === 'single' && !layoutId) return res.status(400).json({ error: 'layoutId required for single mode' })
  if (mode === 'multi' && !layoutColumn) return res.status(400).json({ error: 'layoutColumn required for multi mode' })

  try {
    const url = normalizeGoogleSheetsUrl(sourceUrl.trim())
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status} lors de la récupération de l'URL`)
    const csvText = await response.text()
    const rows = parseCsvText(csvText)
    if (!rows.length) return res.status(422).json({ error: 'CSV vide ou sans données' })

    const headers = Object.keys(rows[0])
    if (!headers.includes(idColumn)) {
      return res.status(422).json({ error: `Colonne identifiant "${idColumn}" absente du CSV` })
    }

    // Create ImportJob
    const jobId = randomUUID()
    await db.prepare(`INSERT INTO import_jobs (id, label, source_url, mode, layout_id, layout_column, id_column, mappings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(jobId, label || `Import ${new Date().toLocaleDateString('fr-FR')}`, sourceUrl, mode,
        layoutId || null, layoutColumn || null, idColumn, JSON.stringify(mappings))

    const stats = useMysql()
      ? await runImportPipelineAsync(db, { rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId })
      : runImportPipeline(getSqliteSync(), { rows, mode, layoutId, layoutColumn, idColumn, mappings, jobId })

    await db.prepare(`UPDATE import_jobs SET last_synced_at = CURRENT_TIMESTAMP, last_sync_stats = ? WHERE id = ?`)
      .run(JSON.stringify(stats), jobId)

    res.status(201).json({ ok: true, jobId, ...stats })
  } catch (err) {
    res.status(500).json({ error: err.message })
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

  const csvLines = [headers.join(',')]
  for (const card of cards) {
    const data = typeof card.data === 'string' ? JSON.parse(card.data) : card.data
    const row = headers.map(h => {
      const val = h === 'name' ? card.name : (data[h] ?? '')
      return val.toString().includes(',') ? `"${val.toString().replace(/"/g, '""')}"` : val
    })
    csvLines.push(row.join(','))
  }

  const layout = await db.prepare('SELECT name FROM layouts WHERE id = ?').get(layout_id)
  const filename = `cartes-${layout?.name || layout_id}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csvLines.join('\n'))
})

// Bulk import from pre-parsed JSON array (legacy, kept for compatibility)
router.post('/import', async (req, res) => {
  const db = getDb()
  const { layout_id, rows: csvRows, mapping } = req.body
  if (!layout_id || !csvRows || !mapping) {
    return res.status(400).json({ error: 'layout_id, rows, and mapping required' })
  }

  const jobId = randomUUID()
  await db.prepare(`INSERT INTO import_jobs (id, label, source_url, mode, layout_id, id_column, mappings)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(jobId, `Import manuel ${new Date().toLocaleDateString('fr-FR')}`, 'manual', 'single',
      layout_id, Object.keys(mapping)[0] || 'name', JSON.stringify({ [layout_id]: mapping }))

  const stats = useMysql()
    ? await runImportPipelineAsync(db, {
      rows: csvRows, mode: 'single', layoutId: layout_id,
      idColumn: Object.keys(mapping)[0] || 'name',
      mappings: { [layout_id]: mapping }, jobId,
    })
    : runImportPipeline(getSqliteSync(), {
      rows: csvRows, mode: 'single', layoutId: layout_id,
      idColumn: Object.keys(mapping)[0] || 'name',
      mappings: { [layout_id]: mapping }, jobId,
    })

  await db.prepare(`UPDATE import_jobs SET last_synced_at = CURRENT_TIMESTAMP, last_sync_stats = ? WHERE id = ?`)
    .run(JSON.stringify(stats), jobId)

  res.status(201).json({ imported: stats.created, ...stats })
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
    .run(name, data ? JSON.stringify(data) : null, sort_order, req.params.id)
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
