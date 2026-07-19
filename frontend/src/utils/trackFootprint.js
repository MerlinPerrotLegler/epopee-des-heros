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
