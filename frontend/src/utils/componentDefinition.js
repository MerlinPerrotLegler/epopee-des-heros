/**
 * Flatten a component definition to a list of renderable elements.
 * Prefer modern `layers` tree when present; fall back to legacy `elements`.
 * Note: `elements: []` is truthy — never use `def.elements || def.layers`.
 */
export function flattenComponentElements(definition) {
  if (!definition || typeof definition !== 'object') return []

  const hasLayers = Object.prototype.hasOwnProperty.call(definition, 'layers')
  if (hasLayers) {
    const result = []
    function walk(items) {
      for (const item of items || []) {
        if (!item) continue
        if (item.kind === 'group') walk(item.children || [])
        else if (item.visible !== false) result.push(item)
      }
    }
    walk(definition.layers)
    return result
  }

  if (Array.isArray(definition.elements)) {
    return definition.elements.filter((el) => el && el.visible !== false)
  }

  return []
}
