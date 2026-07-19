/** @typedef {{ width_px?: number, height_px?: number }} TexturePx */

/**
 * @param {number} heightMm
 * @param {TexturePx | null | undefined} texture
 * @returns {{ width_mm: number, height_mm: number }}
 */
export function tileSizeFromHeight(heightMm, texture) {
  const height_mm = heightMm
  const widthPx = texture?.width_px
  const heightPx = texture?.height_px
  if (widthPx > 0 && heightPx > 0) {
    return { width_mm: heightMm * (widthPx / heightPx), height_mm }
  }
  return { width_mm: height_mm, height_mm }
}

/** @param {unknown} el */
export function isPlanMarker(el) {
  return el?.type === 'atom' && el?.atomType === 'plan'
}

/**
 * @param {Array<{ id?: string, type?: string, atomType?: string }> | null | undefined} groupChildren
 * @returns {string[]}
 */
export function nudgeableSiblingIds(groupChildren) {
  if (!groupChildren?.length) return []
  return groupChildren
    .filter(el => el?.type === 'atom' && el?.atomType === 'image')
    .map(el => el.id)
    .filter(Boolean)
}

function findItem(items, id) {
  for (const item of items || []) {
    if (item.id === id) return item
    if (item.kind === 'group') {
      const found = findItem(item.children, id)
      if (found) return found
    }
  }
  return null
}

function findGroupById(items, groupId) {
  for (const item of items || []) {
    if (item.id === groupId && item.kind === 'group') return item
    if (item.kind === 'group') {
      const found = findGroupById(item.children, groupId)
      if (found) return found
    }
  }
  return null
}

function findParentGroup(items, itemId, parentGroup = null) {
  for (const item of items || []) {
    if (item.id === itemId) return parentGroup
    if (item.kind === 'group') {
      const found = findParentGroup(item.children, itemId, item)
      if (found) return found
    }
  }
  return null
}

function collectPlanMarkers(items, result = []) {
  for (const item of items || []) {
    if (item.kind === 'group') collectPlanMarkers(item.children, result)
    else if (isPlanMarker(item)) result.push(item)
  }
  return result
}

/**
 * @param {Array<object>} layers
 * @param {string | null | undefined} selectedItemId
 * @returns {{ planEl: object, group: object } | null}
 */
export function findPlanContext(layers, selectedItemId) {
  if (!selectedItemId || !layers?.length) return null

  const selected = findItem(layers, selectedItemId)
  if (!selected || selected.kind === 'group') return null

  if (isPlanMarker(selected)) {
    const groupId = selected.params?.tileGroupId
    if (!groupId) return null
    const group = findGroupById(layers, groupId)
    if (!group) return null
    return { planEl: selected, group }
  }

  if (selected.type === 'atom' && selected.atomType === 'image') {
    const parentGroup = findParentGroup(layers, selectedItemId)
    if (!parentGroup) return null
    const planEl = collectPlanMarkers(layers).find(p => p.params?.tileGroupId === parentGroup.id)
    if (!planEl) return null
    return { planEl, group: parentGroup }
  }

  return null
}
