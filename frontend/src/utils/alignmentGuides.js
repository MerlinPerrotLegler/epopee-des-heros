// frontend/src/utils/alignmentGuides.js
export const VISIBILITY_MM = 3

export function elementBBox(el) {
  const left = el.x_mm
  const top = el.y_mm
  const width = el.width_mm
  const height = el.height_mm
  return {
    left, top, width, height,
    right: left + width,
    bottom: top + height,
    cx: left + width / 2,
    cy: top + height / 2,
  }
}

function anyOptionOn(o) {
  return o.layoutCenters || o.elementEdges || o.elementCenters || o.margins || o.frames
}

function pushLine(out, seen, axis, position_mm, delta, snapGrid, source) {
  if (Math.abs(delta) > VISIBILITY_MM) return
  const key = `${axis}:${position_mm.toFixed(3)}:${source}`
  const strong = Math.abs(delta) < snapGrid
  if (seen.has(key)) {
    const existing = seen.get(key)
    if (strong && !existing.strong) existing.strong = true
    return
  }
  const guide = { kind: 'line', axis, position_mm, strong, source }
  seen.set(key, guide)
  out.push(guide)
}

export function computeAlignmentGuides({ active, candidates, layoutW, layoutH, snapGrid, options }) {
  if (!active || !anyOptionOn(options)) return []
  const out = []
  const a = elementBBox(active)
  const lineSeen = new Map()
  const step = snapGrid > 0 ? snapGrid : 1

  if (options.layoutCenters) {
    const midX = layoutW / 2
    const midY = layoutH / 2
    for (const v of [a.left, a.cx, a.right]) {
      pushLine(out, lineSeen, 'x', midX, v - midX, step, 'layout')
    }
    for (const v of [a.top, a.cy, a.bottom]) {
      pushLine(out, lineSeen, 'y', midY, v - midY, step, 'layout')
    }
  }

  const xVals = (bb) => {
    const vals = []
    if (options.elementEdges) vals.push({ v: bb.left, s: 'edge' }, { v: bb.right, s: 'edge' })
    if (options.elementCenters) vals.push({ v: bb.cx, s: 'center' })
    return vals
  }
  const yVals = (bb) => {
    const vals = []
    if (options.elementEdges) vals.push({ v: bb.top, s: 'edge' }, { v: bb.bottom, s: 'edge' })
    if (options.elementCenters) vals.push({ v: bb.cy, s: 'center' })
    return vals
  }

  for (const cand of candidates) {
    const b = elementBBox(cand)
    if (options.frames) {
      out.push({ kind: 'frame', x_mm: b.left, y_mm: b.top, width_mm: b.width, height_mm: b.height })
    }
    if (options.elementEdges || options.elementCenters) {
      for (const av of xVals(a)) {
        for (const bv of xVals(b)) {
          pushLine(out, lineSeen, 'x', bv.v, av.v - bv.v, step, av.s === 'center' || bv.s === 'center' ? 'center' : 'edge')
        }
      }
      for (const av of yVals(a)) {
        for (const bv of yVals(b)) {
          pushLine(out, lineSeen, 'y', bv.v, av.v - bv.v, step, av.s === 'center' || bv.s === 'center' ? 'center' : 'edge')
        }
      }
    }
  }

  if (options.margins) {
    const gaps = { left: null, right: null, top: null, bottom: null }
    for (const cand of candidates) {
      const b = elementBBox(cand)
      // horizontal face: vertical overlap
      const vOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (vOverlap > 0) {
        const gapL = a.left - b.right
        if (gapL > 0 && (gaps.left == null || gapL < gaps.left.distance_mm)) {
          const midY = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2
          gaps.left = {
            kind: 'margin', side: 'left', distance_mm: gapL, equal: false,
            from_mm: { x: a.left, y: midY }, to_mm: { x: b.right, y: midY },
          }
        }
        const gapR = b.left - a.right
        if (gapR > 0 && (gaps.right == null || gapR < gaps.right.distance_mm)) {
          const midY = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2
          gaps.right = {
            kind: 'margin', side: 'right', distance_mm: gapR, equal: false,
            from_mm: { x: a.right, y: midY }, to_mm: { x: b.left, y: midY },
          }
        }
      }
      // vertical face: horizontal overlap
      const hOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      if (hOverlap > 0) {
        const gapT = a.top - b.bottom
        if (gapT > 0 && (gaps.top == null || gapT < gaps.top.distance_mm)) {
          const midX = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2
          gaps.top = {
            kind: 'margin', side: 'top', distance_mm: gapT, equal: false,
            from_mm: { x: midX, y: a.top }, to_mm: { x: midX, y: b.bottom },
          }
        }
        const gapB = b.top - a.bottom
        if (gapB > 0 && (gaps.bottom == null || gapB < gaps.bottom.distance_mm)) {
          const midX = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2
          gaps.bottom = {
            kind: 'margin', side: 'bottom', distance_mm: gapB, equal: false,
            from_mm: { x: midX, y: a.bottom }, to_mm: { x: midX, y: b.top },
          }
        }
      }
    }
    if (gaps.left && gaps.right && Math.abs(gaps.left.distance_mm - gaps.right.distance_mm) < step) {
      gaps.left.equal = gaps.right.equal = true
    }
    if (gaps.top && gaps.bottom && Math.abs(gaps.top.distance_mm - gaps.bottom.distance_mm) < step) {
      gaps.top.equal = gaps.bottom.equal = true
    }
    for (const g of Object.values(gaps)) if (g) out.push(g)
  }

  return out
}
