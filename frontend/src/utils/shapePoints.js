/** Polygon vertices in mm for chamfered rects and inscribed diamonds. */

export function chamferRectPoints(w, h, cut) {
  const width = Number(w) || 0
  const height = Number(h) || 0
  const maxCut = Math.min(width, height) / 2
  const c = Math.min(Math.max(Number(cut) || 0, 0), maxCut)
  if (c === 0) {
    return [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ]
  }
  return [
    [c, 0],
    [width - c, 0],
    [width, c],
    [width, height - c],
    [width - c, height],
    [c, height],
    [0, height - c],
    [0, c],
  ]
}

export function diamondPoints(w, h) {
  const width = Number(w) || 0
  const height = Number(h) || 0
  return [
    [width / 2, 0],
    [width, height / 2],
    [width / 2, height],
    [0, height / 2],
  ]
}

export function pointsAttr(points) {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}

/** Points inset by strokeWidth/2 so the SVG stroke is not clipped by the viewBox. */
export function strokeInset(w, h, strokeWidth, makePoints) {
  const inset = Math.max(0, Number(strokeWidth) || 0) / 2
  const iw = Math.max(0, (Number(w) || 0) - 2 * inset)
  const ih = Math.max(0, (Number(h) || 0) - 2 * inset)
  return makePoints(iw, ih).map(([x, y]) => [x + inset, y + inset])
}
