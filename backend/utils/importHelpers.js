/**
 * Pure helpers for CSV card import (mapping, overwrite/prune, CSV serialize).
 */

export function parseBool(value, defaultVal) {
  if (value === undefined || value === null || value === '') return defaultVal
  if (typeof value === 'boolean') return value
  const s = String(value).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'on' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'off' || s === 'no') return false
  return defaultVal
}

export function mapRowToBindingData(row, layoutMapping) {
  const data = {}
  for (const [csvCol, bindPath] of Object.entries(layoutMapping || {})) {
    if (bindPath && row[csvCol] !== undefined && row[csvCol] !== '') {
      data[bindPath] = row[csvCol]
    }
  }
  return data
}

export function decideImportAction(existing, overwrite) {
  if (!existing) return 'create'
  return overwrite ? 'update' : 'skip'
}

export function importRowKey(layoutId, idValue) {
  return `${layoutId}\t${idValue}`
}

export function cardsMissingFromCsv(existingCards, seenKeys) {
  return (existingCards || []).filter(
    (c) => !seenKeys.has(importRowKey(c.layout_id, c.name)),
  )
}

export function escapeCsvField(value) {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function serializeCsv(headers, rows) {
  const lines = [headers.map(escapeCsvField).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h])).join(','))
  }
  return lines.join('\n')
}
