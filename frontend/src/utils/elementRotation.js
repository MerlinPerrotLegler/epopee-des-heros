// frontend/src/utils/elementRotation.js

export function normalizeDeg(deg) {
  if (!Number.isFinite(deg)) return 0
  let d = deg % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

export function snapDeg(deg, step = 15) {
  if (!Number.isFinite(deg) || !step) return 0
  return Math.round(deg / step) * step
}

export function shortestAngleDelta(fromDeg, toDeg) {
  let d = toDeg - fromDeg
  while (d > 180) d -= 360
  while (d <= -180) d += 360
  return d
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function elementCenter(el) {
  const w = num(el.width_mm)
  const h = num(el.height_mm)
  return {
    x: num(el.x_mm) + w / 2,
    y: num(el.y_mm) + h / 2,
  }
}

export function selectionPivot(els) {
  if (!els?.length) return { x: 0, y: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of els) {
    const c = elementCenter(el)
    if (c.x < minX) minX = c.x
    if (c.y < minY) minY = c.y
    if (c.x > maxX) maxX = c.x
    if (c.y > maxY) maxY = c.y
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

export function pointerAngleDeg(x_mm, y_mm, cx, cy) {
  return Math.atan2(y_mm - cy, x_mm - cx) * (180 / Math.PI)
}

export function rotatePoint(x, y, cx, cy, deltaDeg) {
  const rad = deltaDeg * (Math.PI / 180)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

export function applyRotationDelta(els, deltaDeg, pivot) {
  const out = []
  for (const el of els) {
    const w = num(el.width_mm)
    const h = num(el.height_mm)
    const c = elementCenter(el)
    const c2 = rotatePoint(c.x, c.y, pivot.x, pivot.y, deltaDeg)
    out.push({
      id: el.id,
      x_mm: c2.x - w / 2,
      y_mm: c2.y - h / 2,
      rotation: normalizeDeg(num(el.rotation) + deltaDeg),
    })
  }
  return out
}

export function gestureAppliedDelta(startRotation, pointerDeltaDeg, shiftKey) {
  const rawTarget = startRotation + pointerDeltaDeg
  const target = shiftKey ? snapDeg(rawTarget, 15) : rawTarget
  return target - startRotation
}

export function resetAppliedDelta(startRotation) {
  return shortestAngleDelta(num(startRotation), 0)
}
