export function baseCellSizeMm({ cellSize, axisLengthMm }) {
  const r = Number(cellSize)
  const axis = Number(axisLengthMm)
  if (!(axis > 0) || !(r > 0)) return 0
  return r * axis
}

export function normalizeMargins(margins = {}) {
  return {
    left: Number(margins.left) || 0,
    right: Number(margins.right) || 0,
    top: Number(margins.top) || 0,
    bottom: Number(margins.bottom) || 0,
  }
}

export function cellFootprintMm(baseW, baseH, margins = {}) {
  const m = normalizeMargins(margins)
  const insetLeft = baseW * m.left
  const insetRight = baseW * m.right
  const insetTop = baseH * m.top
  const insetBottom = baseH * m.bottom
  return {
    w: baseW + insetLeft + insetRight,
    h: baseH + insetTop + insetBottom,
    insetLeft,
    insetRight,
    insetTop,
    insetBottom,
  }
}

/**
 * Rectangle de l’image : la case (x, y, baseW × baseH) reste fixe.
 * Marges positives → débord ; négatives → retrait dans la case.
 */
export function textureDrawRect(x, y, baseW, baseH, margins = {}) {
  const fp = cellFootprintMm(baseW, baseH, margins)
  return {
    x: x - fp.insetLeft,
    y: y - fp.insetTop,
    w: fp.w,
    h: fp.h,
  }
}

/** Cases du + orthogonal : nord, ouest, centre, est, sud. */
export const PLUS_TILE_SLOTS = [
  { key: 'n', col: 1, row: 0 },
  { key: 'w', col: 0, row: 1 },
  { key: 'c', col: 1, row: 1 },
  { key: 'e', col: 2, row: 1 },
  { key: 's', col: 1, row: 2 },
]

/**
 * Layout d’aperçu 5 tuiles en + sur une grille logique 3×3 (case = 1).
 * Les empreintes débordent (marge > 0) ou se reculent (marge < 0) pour
 * visualiser les joints. La vue inclut le carré logique [0,3]² plus le
 * débord positif.
 */
export function plusTilePreviewLayout(margins = {}) {
  const footprint = cellFootprintMm(1, 1, margins)
  const padL = Math.max(0, footprint.insetLeft)
  const padR = Math.max(0, footprint.insetRight)
  const padT = Math.max(0, footprint.insetTop)
  const padB = Math.max(0, footprint.insetBottom)
  const viewW = 3 + padL + padR
  const viewH = 3 + padT + padB
  const tiles = PLUS_TILE_SLOTS.map(({ key, col, row }) => {
    const logicalX = padL + col
    const logicalY = padT + row
    return {
      key,
      col,
      row,
      logicalX,
      logicalY,
      x: logicalX - footprint.insetLeft,
      y: logicalY - footprint.insetTop,
      w: footprint.w,
      h: footprint.h,
    }
  })
  return { viewW, viewH, tiles, footprint }
}

const NEIGHBOR_KEYS = ['n', 'w', 'e', 's']

function toPreviewTile(track) {
  if (!track?.filename) return null
  return {
    filename: track.filename,
    originalName: track.original_name || track.track_meta?.label || '',
    margins: normalizeMargins(track.track_meta?.margins),
  }
}

/**
 * Jusqu’à 4 autres textures autour du centre.
 * Priorité aux voisins cochés, puis le reste du catalogue.
 * Chaque tuile conserve ses propres marges (jamais celles du centre).
 */
export function pickPlusNeighborTiles(tracks, { currentMediaId, voisinIds = [] } = {}) {
  const others = (tracks || []).filter((track) => track && track.id !== currentMediaId)
  const byLogicalId = new Map()
  for (const track of others) {
    const logicalId = track.track_meta?.id
    if (Number.isInteger(logicalId)) byLogicalId.set(logicalId, track)
  }
  const selected = []
  const seen = new Set()
  for (const rawId of voisinIds || []) {
    const logicalId = Number(rawId)
    const track = byLogicalId.get(logicalId)
    if (!track || seen.has(track.id)) continue
    seen.add(track.id)
    selected.push(track)
  }
  const rest = others
    .filter((track) => !seen.has(track.id))
    .sort((a, b) => (a.track_meta?.id ?? 0) - (b.track_meta?.id ?? 0))
  const pool = [...selected, ...rest]
  const neighbors = {}
  for (let i = 0; i < NEIGHBOR_KEYS.length; i += 1) {
    neighbors[NEIGHBOR_KEYS[i]] = toPreviewTile(pool[i])
  }
  return neighbors
}

/** Padding de l’aperçu = plus grand débord positif parmi les tuiles visibles. */
export function plusPreviewPad(tiles = []) {
  const pad = { left: 0, right: 0, top: 0, bottom: 0 }
  for (const tile of tiles) {
    if (!tile) continue
    const m = normalizeMargins(tile.margins)
    pad.left = Math.max(pad.left, m.left)
    pad.right = Math.max(pad.right, m.right)
    pad.top = Math.max(pad.top, m.top)
    pad.bottom = Math.max(pad.bottom, m.bottom)
  }
  return {
    left: Math.max(0, pad.left),
    right: Math.max(0, pad.right),
    top: Math.max(0, pad.top),
    bottom: Math.max(0, pad.bottom),
  }
}

export function overflowCssVars(margins = {}) {
  const m = normalizeMargins(margins)
  return {
    '--ml': m.left,
    '--mr': m.right,
    '--mt': m.top,
    '--mb': m.bottom,
  }
}
