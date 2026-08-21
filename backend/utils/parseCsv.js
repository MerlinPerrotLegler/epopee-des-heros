/**
 * RFC 4180 CSV helpers for card import (URL + fichier local).
 */

function parseCsvRows(text) {
  const rows = []
  let row = []
  let field = ''
  let i = 0
  let inQuotes = false

  if (text.charCodeAt(0) === 0xFEFF) i = 1

  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\r') {
      i++
      continue
    }
    if (c === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i++
      continue
    }
    field += c
    i++
  }

  if (inQuotes || field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function rowHasContent(values) {
  return values.some((v) => String(v ?? '').trim() !== '')
}

/**
 * Parse CSV text into objects keyed by the first row (headers).
 */
export function parseCsvText(text) {
  if (!text || !String(text).trim()) return []
  const rows = parseCsvRows(String(text).replace(/^\uFEFF/, ''))
  if (rows.length < 2) return []

  const headers = rows[0].map((h) => String(h ?? '').trim())
  return rows.slice(1)
    .filter(rowHasContent)
    .map((values) => {
      const obj = {}
      headers.forEach((h, i) => {
        if (!h) return
        obj[h] = String(values[i] ?? '').trim()
      })
      return obj
    })
}

/**
 * Dry-run preview: headers + first 5 rows.
 * @throws {Error} if the CSV has no data rows
 */
export function previewCsvText(text) {
  const rows = parseCsvText(text)
  if (!rows.length) {
    const err = new Error('CSV vide ou sans données')
    err.status = 422
    throw err
  }
  return {
    headers: Object.keys(rows[0]),
    preview: rows.slice(0, 5),
    totalRows: rows.length,
  }
}

/** Import jobs can re-fetch only when the source is a public HTTP(S) URL. */
export function isSyncableImportSource(sourceUrl) {
  return /^https?:\/\//i.test(String(sourceUrl || '').trim())
}

/**
 * Normalize Google Sheets URL to published CSV format.
 */
export function normalizeGoogleSheetsUrl(url) {
  if (!url) return url
  if (url.includes('docs.google.com/spreadsheets')) {
    const gidMatch = url.match(/[?&]gid=(\d+)/)
    const gid = gidMatch ? `&gid=${gidMatch[1]}` : ''
    const base = url.replace(/\/edit.*$/, '').replace(/\/pub.*$/, '')
    return `${base}/pub?output=csv${gid}`
  }
  return url
}
