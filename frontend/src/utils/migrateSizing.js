// frontend/src/utils/migrateSizing.js
export const REF_HEIGHT_MM = 88
export const PCT_SIZE_PARAMS = ['fontSize', 'maxFontSize']

function pctToMm(value, heightMm) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return (n / 100) * heightMm
}

function convertParams(params, heightMm) {
  if (!params || typeof params !== 'object') return { params, changed: false }
  let changed = false
  const next = { ...params }

  for (const key of PCT_SIZE_PARAMS) {
    if (next[key] == null || next[key] === '') continue
    const converted = pctToMm(next[key], heightMm)
    if (converted !== next[key]) {
      next[key] = converted
      changed = true
    }
  }

  if (Array.isArray(next.rows)) {
    next.rows = next.rows.map((row) => {
      if (!row || row.fontSize == null || row.fontSize === '') return row
      const converted = pctToMm(row.fontSize, heightMm)
      if (converted === row.fontSize) return row
      changed = true
      return { ...row, fontSize: converted }
    })
  }

  return { params: next, changed }
}

function walkLayers(layers, heightMm) {
  let changed = false
  const out = (layers || []).map((item) => {
    if (!item) return item
    if (item.kind === 'group') {
      const childrenResult = walkLayers(item.children || [], heightMm)
      if (childrenResult.changed) changed = true
      return { ...item, children: childrenResult.layers }
    }
    const { params, changed: pChanged } = convertParams(item.params, heightMm)
    if (pChanged) changed = true
    return pChanged ? { ...item, params } : item
  })
  return { layers: out, changed }
}

/**
 * @param {object|null|undefined} definition
 * @param {number} heightMm
 * @returns {{ definition: object, changed: boolean }}
 */
export function migrateDefinitionSizing(definition, heightMm) {
  const def = definition && typeof definition === 'object'
    ? definition
    : { layers: [], dataSchema: {} }

  if (def.sizing === 'mm') {
    return { definition: def, changed: false }
  }

  const h = Number(heightMm)
  const height = Number.isFinite(h) && h > 0 ? h : REF_HEIGHT_MM
  const { layers } = walkLayers(def.layers || [], height)

  return {
    definition: { ...def, layers, sizing: 'mm' },
    changed: true, // stamp always applied when missing
  }
}
