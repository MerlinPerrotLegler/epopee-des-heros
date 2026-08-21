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

/** Top-level items: new editor tree (`kind`) or legacy `layers[].elements`. */
function layoutTopItems(definition) {
  const layers = definition?.layers || []
  if (!layers.length) return []
  if (layers.some((l) => l.kind === 'group' || l.kind === 'element')) return layers
  return layers.flatMap((l) => l.children || l.elements || [])
}

function nestedDefinition(el, componentRegistry = {}, moleculeRegistry = {}) {
  if (el.type === 'component' && el.componentId) {
    return componentRegistry[el.componentId]?.definition
  }
  if (el.type === 'molecule' && el.moleculeId) {
    return (moleculeRegistry[el.moleculeId] || componentRegistry[el.moleculeId])?.definition
  }
  return null
}

/**
 * Get all bindable paths from a layout definition, including atoms nested in components
 * when `componentRegistry` is provided.
 * Returns array of { path, label, type, elementId, nameInLayout, options? }
 * @param {object} definition
 * @param {object|null} atomParamRules - config.atomParamRules (pour options badge/iconMap)
 * @param {object} componentRegistry - { componentId: component }
 * @param {object} moleculeRegistry - { moleculeId: molecule }
 */
export function getBindablePaths(definition, atomParamRules = null, componentRegistry = {}, moleculeRegistry = {}) {
  const paths = []

  function walkItems(items, prefixParts = []) {
    for (const item of items || []) {
      if (item.kind === 'group') {
        walkItems(item.children || [], prefixParts)
        continue
      }
      const el = item
      if (!el.nameInLayout) continue
      const currentParts = [...prefixParts, el.nameInLayout]

      const nestedDef = nestedDefinition(el, componentRegistry, moleculeRegistry)
      if (nestedDef) {
        const nestedItems = flattenComponentElements(nestedDef)
        walkItems(nestedItems.map((c) => ({ ...c, kind: c.kind || 'element' })), currentParts)
        continue
      }

      for (const [paramKey, paramValue] of Object.entries(el.params || {})) {
        const isMapValue = paramKey === 'value'
          && (el.atomType === 'badge' || el.atomType === 'iconMap')
        const rows = isMapValue
          ? resolveMapRows(el.atomType, el.params, atomParamRules)
          : null
        paths.push({
          path: [...currentParts, paramKey].join('.'),
          label: `${currentParts.join('.')} → ${paramKey}`,
          type: typeof paramValue,
          elementId: el.id,
          nameInLayout: currentParts.join('.'),
          options: isMapValue ? getMapValueOptionsFromRows(rows) : null,
        })
      }
    }
  }
  walkItems(layoutTopItems(definition))

  return paths
}

/**
 * Extract all bindable paths from a layout, including atoms nested inside components.
 * componentRegistry: { componentId: componentDefinition }
 * Returns array of { path, nameInLayout, paramName, atomType, elementId }
 */
export function extractBindingPaths(layoutDefinition, componentRegistry = {}, moleculeRegistry = {}) {
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

      const nestedDef = nestedDefinition(el, componentRegistry, moleculeRegistry)
      if (nestedDef) {
        const nestedItems = flattenComponentElements(nestedDef)
        walkItems(nestedItems.map((inner) => ({ ...inner, kind: inner.kind || 'element' })), currentParts)
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

  walkItems(layoutTopItems(layoutDefinition))

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

/** Params considérés comme « contenu » (vs style) pour formulaires Data / instance. */
export const CONTENT_BINDING_PARAM_KEYS = new Set(['text', 'ref', 'tag', 'value'])

export function isContentBindingPath(path) {
  const param = String(path || '').split('.').pop()
  return CONTENT_BINDING_PARAM_KEYS.has(param)
}

/**
 * Partitionne les chemins bindables : contenu d'abord, reste en « avancé ».
 * @returns {{ content: object[], advanced: object[] }}
 */
export function partitionBindablePaths(paths) {
  const content = []
  const advanced = []
  for (const bp of paths || []) {
    if (isContentBindingPath(bp.path)) content.push(bp)
    else advanced.push(bp)
  }
  return { content, advanced }
}

/**
 * Fusionne data existante avec tous les chemins bindables (clés manquantes → '').
 */
export function mergeDataWithBindablePaths(data, paths) {
  const out = { ...(data && typeof data === 'object' ? data : {}) }
  for (const bp of paths || []) {
    if (bp?.path && !(bp.path in out)) out[bp.path] = ''
  }
  return out
}
