// ============================================
// Data Binding Utility
// Resolves {{bindingPath}} expressions using card instance data
// ============================================
import Papa from 'papaparse'
import { flattenComponentElements } from './componentDefinition.js'

/**
 * Resolve a binding expression against card data.
 * Binding paths: "nameInLayout.paramName" or just "paramName"
 *
 * Card data structure: {
 *   "card_name.text": "Épée en fer",
 *   "stats.force.value": "3",
 *   "price.or": "6"
 * }
 */
export function resolveBinding(template, data) {
  if (!template || !data) return template
  if (typeof template !== 'string') return template

  // Replace {{path}} patterns
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmed = path.trim()
    if (trimmed in data) return data[trimmed]
    return match // keep unresolved bindings visible
  })
}

/**
 * Resolve all params of an element against card data.
 * Uses the element's nameInLayout as prefix.
 * prefixOverride: used for atoms nested inside components, e.g. "stats.attack"
 */
export function resolveElementParams(element, data, prefixOverride = null) {
  if (!data) return element.params || {}

  const prefix = prefixOverride ?? element.nameInLayout
  if (!prefix) return element.params || {}

  const resolved = {}
  for (const [key, value] of Object.entries(element.params || {})) {
    const bindPath = `${prefix}.${key}`
    if (bindPath in data) {
      resolved[key] = data[bindPath]
    } else if (typeof value === 'string' && value.includes('{{')) {
      resolved[key] = resolveBinding(value, data)
    } else {
      resolved[key] = value
    }
  }

  return resolved
}

/**
 * Options de checklist pour iconMap / badge (valeur → label affiché).
 * Clé = row.value, ou row.label si value vide.
 */
export function getMapValueOptionsFromRows(rows) {
  const seen = new Set()
  const opts = []
  for (const row of rows || []) {
    const key = String(row?.value ?? '').trim() || String(row?.label ?? '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const label = String(row?.label ?? '').trim() || key
    opts.push({ value: key, label })
  }
  return opts
}

/**
 * Résout les rows checklist : priorité à la config atome (Config > Atomes),
 * sinon les rows de l’élément placé sur le layout.
 *
 * @param {string} atomType
 * @param {object|null} elementParams
 * @param {object|null} atomParamRules - config.atomParamRules
 */
export function resolveMapRows(atomType, elementParams = null, atomParamRules = null) {
  const rule = atomParamRules?.[atomType]?.rows
  const atomRows = rule?.fixedValue
  if (Array.isArray(atomRows) && atomRows.length > 0) {
    return atomRows
  }
  if (Array.isArray(elementParams?.rows) && elementParams.rows.length > 0) {
    return elementParams.rows
  }
  if (Array.isArray(atomRows)) return atomRows
  if (Array.isArray(elementParams?.rows)) return elementParams.rows
  return []
}

/**
 * True si la checklist est définie au niveau atome (Config > Atomes).
 */
export function hasAtomLevelMapRows(atomType, atomParamRules = null) {
  const rule = atomParamRules?.[atomType]?.rows
  return Array.isArray(rule?.fixedValue) && rule.fixedValue.length > 0
}

/**
 * Options checklist pour un élément atom iconMap/badge, ou null.
 */
export function getMapValueOptionsForElement(el, atomParamRules = null) {
  if (!el || el.type !== 'atom') return null
  if (el.atomType !== 'badge' && el.atomType !== 'iconMap') return null
  return getMapValueOptionsFromRows(resolveMapRows(el.atomType, el.params, atomParamRules))
}

/**
 * Get all bindable paths from a layout definition (direct atoms only, no component traversal).
 * Returns array of { path, label, type, elementId, nameInLayout, options? }
 * @param {object} definition
 * @param {object|null} atomParamRules - config.atomParamRules (pour options badge/iconMap)
 */
export function getBindablePaths(definition, atomParamRules = null) {
  const paths = []

  function walkItems(items) {
    for (const item of items) {
      if (item.kind === 'group') { walkItems(item.children || []); continue }
      const el = item
      if (!el.nameInLayout) continue
      for (const [paramKey, paramValue] of Object.entries(el.params || {})) {
        const isMapValue = paramKey === 'value'
          && (el.atomType === 'badge' || el.atomType === 'iconMap')
        const rows = isMapValue
          ? resolveMapRows(el.atomType, el.params, atomParamRules)
          : null
        paths.push({
          path: `${el.nameInLayout}.${paramKey}`,
          label: `${el.nameInLayout} → ${paramKey}`,
          type: typeof paramValue,
          elementId: el.id,
          nameInLayout: el.nameInLayout,
          options: isMapValue ? getMapValueOptionsFromRows(rows) : null,
        })
      }
    }
  }
  walkItems(definition.layers || [])

  return paths
}

/**
 * Extract all bindable paths from a layout, including atoms nested inside components.
 * componentRegistry: { componentId: componentDefinition }
 * Returns array of { path, nameInLayout, paramName, atomType, elementId }
 */
export function extractBindingPaths(layoutDefinition, componentRegistry = {}) {
  const paths = []

  function walkItems(items, prefixParts = []) {
    for (const item of items) {
      if (item.kind === 'group') {
        walkItems(item.children || [], prefixParts)
        continue
      }
      const el = item
      if (!el.nameInLayout) continue

      const currentParts = [...prefixParts, el.nameInLayout]

      if (el.type === 'component' && el.componentId) {
        const comp = componentRegistry[el.componentId]
        if (comp?.definition) {
          const compItems = flattenComponentElements(comp.definition)
          // Re-wrap as walkable items (elements already flat)
          walkItems(compItems.map((el) => ({ ...el, kind: el.kind || 'element' })), currentParts)
        }
      } else {
        for (const paramKey of Object.keys(el.params || {})) {
          paths.push({
            path: [...currentParts, paramKey].join('.'),
            nameInLayout: currentParts.join('.'),
            paramName: paramKey,
            atomType: el.atomType || el.type,
            elementId: el.id,
          })
        }
      }
    }
  }

  for (const layer of layoutDefinition.layers || []) {
    walkItems(layer.children || layer.elements || [])
  }

  return paths
}

/**
 * Auto-map CSV headers to binding paths. Does not overwrite keys already in `existing`.
 */
export function autoMapColumns(headers, bindingPaths, existing = {}) {
  const mapped = { ...existing }
  for (const col of headers) {
    if (mapped[col]) continue
    const match = (bindingPaths || []).find((p) => {
      if (p.paramName === col || p.path === col || p.nameInLayout === col) return true
      if (p.path.endsWith(`.${col}`)) return true
      const layoutTail = String(p.nameInLayout || '').split('.').pop()
      return layoutTail === col
    })
    if (match) mapped[col] = match.path
  }
  return mapped
}

export function parseCsvToObjects(csvText) {
  const result = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
    transform: v => v.trim(),
  })
  return result.data || []
}

/**
 * Normalize Google Sheets URL to published CSV format.
 * Handles /edit and /pub URLs, preserves gid param.
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

/** Re-sync is only possible for public HTTP(S) CSV URLs, not local files. */
export function isSyncableImportSource(sourceUrl) {
  return /^https?:\/\//i.test(String(sourceUrl || '').trim())
}
