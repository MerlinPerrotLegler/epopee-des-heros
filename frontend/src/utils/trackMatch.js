/**
 * Maps upload convention to case rotation (degrees).
 * Upload: droit L→R, coin top→left, impasse top.
 */
export function pickCoin(requiredOrientation, textureType) {
  const dir = requiredOrientation
  if (textureType === 'droit') {
    if (dir === 'vertical' || dir === 'up' || dir === 'down') return 90
    return 0
  }
  if (textureType === 'impasse') {
    if (dir === 'down') return 180
    if (dir === 'left') return 270
    if (dir === 'right') return 90
    return 0
  }
  if (textureType === 'coin') {
    if (dir === 'right') return 90
    if (dir === 'down') return 180
    if (dir === 'left') return 270
    return 0
  }
  return 0
}

function alignmentMatches(textureAlignment, requiredAlignment) {
  if (textureAlignment === 'both') return true
  return textureAlignment === requiredAlignment
}

function voisinsMatch(texture, neighborTextureIds) {
  if (!neighborTextureIds?.length) return true
  const allowed = texture.voisins
  if (!allowed?.length) return true
  return neighborTextureIds.every((id) => allowed.includes(id))
}

export function isTextureCompatible(texture, { requiredType, requiredAlignment, neighborTextureIds }) {
  if (!texture) return false
  if (texture.type !== requiredType) return false
  if (!alignmentMatches(texture.alignment, requiredAlignment)) return false
  return voisinsMatch(texture, neighborTextureIds)
}

function neighborTextureIdsForCell(cell, overrides) {
  const ids = []
  for (const nIdx of cell.neighborIdxs || []) {
    const o = overrides[nIdx]
    if (o?.textureId != null) ids.push(o.textureId)
  }
  return ids
}

function cellOrientation(cell) {
  return cell.direction ?? cell.requiredAlignment
}

const TEXTURE_OVERRIDE_KEYS = ['textureId', 'coin', 'textureSource']

function stripTextureKeys(cellData = {}) {
  const next = { ...cellData }
  for (const key of TEXTURE_OVERRIDE_KEYS) delete next[key]
  return next
}

/** Remove texture fields from every cell; drop entries that become empty. */
export function clearAllTextureOverrides(existingOverrides = {}) {
  const overrides = {}
  for (const [key, entry] of Object.entries(existingOverrides)) {
    const cellData = stripTextureKeys(entry)
    if (Object.keys(cellData).length > 0) overrides[Number(key)] = cellData
  }
  return overrides
}

/** Apply the same user texture to each track cell, preserving unrelated keys. */
export function propagateTextureOverrides(cells, { textureId, coin }, existingOverrides = {}) {
  const overrides = {}
  for (const [key, entry] of Object.entries(existingOverrides)) {
    overrides[Number(key)] = { ...entry }
  }
  for (const cell of cells) {
    overrides[cell.idx] = {
      ...(overrides[cell.idx] || {}),
      textureId,
      coin,
      textureSource: 'user',
    }
  }
  return overrides
}

export function shuffleTrackTextures({ cells, textures, existingOverrides = {} }) {
  const sorted = [...textures].sort((a, b) => a.id - b.id)
  const overrides = {}

  for (const [key, entry] of Object.entries(existingOverrides)) {
    const preserved = stripTextureKeys(entry)
    if (Object.keys(preserved).length > 0) overrides[Number(key)] = preserved
  }

  for (const [key, entry] of Object.entries(existingOverrides)) {
    if (entry?.textureSource === 'user' && entry?.textureId != null) {
      overrides[Number(key)] = { ...(overrides[Number(key)] || {}), ...entry }
    }
  }

  const orderedCells = [...cells].sort((a, b) => a.idx - b.idx)

  for (const cell of orderedCells) {
    if (overrides[cell.idx]?.textureSource === 'user') continue

    const base = stripTextureKeys(overrides[cell.idx])
    const neighborTextureIds = neighborTextureIdsForCell(cell, overrides)
    const compatible = sorted.filter((t) =>
      isTextureCompatible(t, {
        requiredType: cell.requiredType,
        requiredAlignment: cell.requiredAlignment,
        neighborTextureIds,
      }),
    )

    if (compatible.length === 0) {
      if (Object.keys(base).length === 0) delete overrides[cell.idx]
      else overrides[cell.idx] = base
      continue
    }

    const texture = compatible[0]
    overrides[cell.idx] = {
      ...base,
      textureId: texture.id,
      coin: pickCoin(cellOrientation(cell), texture.type),
      textureSource: 'system',
    }
  }

  return overrides
}
