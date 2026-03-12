// ============================================
// Data Binding Utility
// Resolves {{bindingPath}} expressions using card instance data
// ============================================

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
 */
export function resolveElementParams(element, data) {
  if (!data || !element.nameInLayout) return element.params || {}

  const resolved = {}
  const prefix = element.nameInLayout

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
 * Get all bindable paths from a layout definition.
 * Returns array of { path, label, type, elementId, nameInLayout }
 */
export function getBindablePaths(definition) {
  const paths = []
  
  function walkItems(items) {
    for (const item of items) {
      if (item.kind === 'group') { walkItems(item.children || []); continue }
      const el = item
      if (!el.nameInLayout) continue
      for (const [paramKey, paramValue] of Object.entries(el.params || {})) {
        paths.push({
          path: `${el.nameInLayout}.${paramKey}`,
          label: `${el.nameInLayout} → ${paramKey}`,
          type: typeof paramValue,
          elementId: el.id,
          nameInLayout: el.nameInLayout
        })
      }
    }
  }
  walkItems(definition.layers || [])

  return paths
}

/**
 * Parse CSV text into array of objects using first row as headers.
 */
export function parseCsvToObjects(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || ''
    })
    rows.push(obj)
  }

  return rows
}
