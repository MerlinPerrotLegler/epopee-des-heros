export function baseCellSizeMm({ cellSize, axisLengthMm }) {
  const r = Number(cellSize)
  const axis = Number(axisLengthMm)
  if (!(axis > 0) || !(r > 0)) return 0
  return r * axis
}

export function cellFootprintMm(baseW, baseH, margins = {}) {
  const m = {
    left: Number(margins.left) || 0,
    right: Number(margins.right) || 0,
    top: Number(margins.top) || 0,
    bottom: Number(margins.bottom) || 0,
  }
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
