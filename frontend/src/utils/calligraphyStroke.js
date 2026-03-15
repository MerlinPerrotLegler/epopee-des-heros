/**
 * calligraphyStroke.js
 * ─────────────────────
 * Génère un path SVG d (polygone rempli) pour un trait calligraphique
 * à partir d'un tableau de points bruts capturés via Pointer Events.
 *
 * Formule d'épaisseur (TSD-019) :
 *   w(φ) = nibWidth × |sin(φ − nibAngle)|   (min = nibWidth × 0.05)
 *   pressureFactor = 1 / (1 + speed × pressureScale × 0.005)
 *   w_final = w(φ) × lerp(1, pressureFactor, pressureScale)
 *
 * Lissage :
 *   1. Douglas-Peucker  (ε = smoothing × 2 SVG units)
 *   2. Catmull-Rom → cubic Bezier
 *   3. Polygone fermé : côté gauche aller + côté droit retour + Z
 */

const PI = Math.PI

// ── Douglas-Peucker ─────────────────────────────────────────────────────────
function perpDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1e-9) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
  return Math.abs(dx * (ay - py) - dy * (ax - px)) / len
}

function douglasPeucker(pts, eps) {
  if (pts.length <= 2) return pts
  const last = pts.length - 1
  let maxD = 0, maxIdx = 0
  for (let i = 1; i < last; i++) {
    const d = perpDist(pts[i].x, pts[i].y, pts[0].x, pts[0].y, pts[last].x, pts[last].y)
    if (d > maxD) { maxD = d; maxIdx = i }
  }
  if (maxD <= eps) return [pts[0], pts[last]]
  const left  = douglasPeucker(pts.slice(0, maxIdx + 1), eps)
  const right = douglasPeucker(pts.slice(maxIdx), eps)
  return [...left.slice(0, -1), ...right]
}

// ── Catmull-Rom → cubic Bezier ───────────────────────────────────────────────
// Returns [{sx, sy, cp1x, cp1y, cp2x, cp2y, ex, ey}]
function catmullRomToBezier(pts) {
  const segs = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    segs.push({
      sx:   p1.x,  sy:   p1.y,
      cp1x: p1.x + (p2.x - p0.x) / 6,
      cp1y: p1.y + (p2.y - p0.y) / 6,
      cp2x: p2.x - (p3.x - p1.x) / 6,
      cp2y: p2.y - (p3.y - p1.y) / 6,
      ex:   p2.x,  ey:   p2.y,
    })
  }
  return segs
}

// ── Calligraphic width at stroke direction φ ─────────────────────────────────
function calligraphicWidth(phi, nibWidth, nibAngleDeg, pressureFactor, pressureScale) {
  const theta = nibAngleDeg * PI / 180
  const w     = nibWidth * Math.abs(Math.sin(phi - theta))
  const wMin  = nibWidth * 0.05
  // lerp between w and (w × pressureFactor) weighted by pressureScale
  const modulated = Math.max(w, wMin) * (1 + pressureScale * (pressureFactor - 1))
  return Math.max(modulated, wMin)
}

const fmt = v => Math.round(v * 10) / 10

/**
 * Builds a closed SVG polygon path for a calligraphic stroke.
 *
 * @param {Array<{x, y, t, pressure}>} rawPoints — SVG-unit coords + timestamp + pressure
 * @param {Object} pen
 *   - nibWidth_svgu {number} — nib width in SVG units  (nibWidth_mm × SCALE)
 *   - nibAngle     {number} — nib angle in degrees
 *   - pressureScale{number} — 0 = fixed width, 1 = full modulation
 *   - smoothing    {number} — 0 = raw, 1 = heavy smoothing
 * @returns {string} SVG path `d` (closed polygon)
 */
export function buildStroke(rawPoints, pen) {
  if (rawPoints.length < 2) return ''

  const {
    nibWidth_svgu = 15,
    nibAngle      = 45,
    pressureScale = 0.6,
    smoothing     = 0.5,
  } = pen

  // 1. Douglas-Peucker simplification (eps in SVG units = 0.1 mm)
  // Use a smaller epsilon so gentle curves keep enough points for visible width variation.
  const eps = Math.max(smoothing, 0.3)
  const pts = douglasPeucker(rawPoints, eps)
  if (pts.length < 2) return ''

  const N = pts.length
  const leftPts  = []
  const rightPts = []

  for (let i = 0; i < N; i++) {
    // Direction at this point
    let phi
    if (i < N - 1) {
      phi = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x)
    } else {
      phi = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x)
    }

    // Speed-based pressure modulation
    const next  = pts[Math.min(i + 1, N - 1)]
    const prev  = pts[Math.max(i - 1, 0)]
    const refPt = i < N - 1 ? next : prev
    const dx    = refPt.x - pts[i].x, dy = refPt.y - pts[i].y
    const dist  = Math.sqrt(dx * dx + dy * dy)
    const dt    = Math.max(Math.abs((refPt.t || 0) - (pts[i].t || 0)), 1)
    const speed = dist / dt
    // Real stylus pressure overrides speed-based estimate
    const useStylusPressure = (pts[i].pressure > 0 && pts[i].pressure < 1)
    const pressureFactor = useStylusPressure
      ? pts[i].pressure
      : 1 / (1 + speed * pressureScale * 0.005)

    const w = calligraphicWidth(phi, nibWidth_svgu, nibAngle, pressureFactor, pressureScale)

    // Taper at stroke ends for natural pointed tips.
    // For N ≤ 2 (very short or perfectly straight strokes), skip heavy tapering so the
    // stroke remains visible — both endpoints would otherwise collapse to sub-pixel width.
    const tipFactor = N <= 2 ? 0.5 : 0.08
    const taper = (i === 0 || i === N - 1) ? tipFactor : 1
    const wt = w * taper

    const nx = -Math.sin(phi), ny = Math.cos(phi)
    leftPts.push({ x: pts[i].x + nx * wt / 2, y: pts[i].y + ny * wt / 2 })
    rightPts.push({ x: pts[i].x - nx * wt / 2, y: pts[i].y - ny * wt / 2 })
  }

  // 2. Smooth outlines with Catmull-Rom → Bezier
  const segsL    = catmullRomToBezier(leftPts)
  const segsR    = catmullRomToBezier(rightPts)
  const segsRRev = [...segsR].reverse()

  // 3. Build closed SVG polygon (forward left, backward right)
  const parts = [`M ${fmt(leftPts[0].x)} ${fmt(leftPts[0].y)}`]

  for (const s of segsL) {
    parts.push(`C ${fmt(s.cp1x)} ${fmt(s.cp1y)},${fmt(s.cp2x)} ${fmt(s.cp2y)},${fmt(s.ex)} ${fmt(s.ey)}`)
  }

  parts.push(`L ${fmt(rightPts[N - 1].x)} ${fmt(rightPts[N - 1].y)}`)

  for (const s of segsRRev) {
    // Reversed Bezier: E→S, controls cp2→cp1
    parts.push(`C ${fmt(s.cp2x)} ${fmt(s.cp2y)},${fmt(s.cp1x)} ${fmt(s.cp1y)},${fmt(s.sx)} ${fmt(s.sy)}`)
  }

  parts.push('Z')
  return parts.join(' ')
}
