// frontend/src/utils/cornerOrnaments.js
export const CORNER_SHAPES = ['none', 'star4', 'star5', 'circle', 'square', 'triangle']

const CORNER_KEYS = ['TL', 'TR', 'BL', 'BR']

const TRI_ROT = { TL: -45, TR: 45, BR: 135, BL: -135 }

function cornerCenter(key, svgW, svgH, pad) {
  const right = key === 'TR' || key === 'BR'
  const bottom = key === 'BL' || key === 'BR'
  return {
    cx: right ? svgW - pad : pad,
    cy: bottom ? svgH - pad : pad,
  }
}

/** Regular star path centered at (cx,cy). points=4 → 4-pointed; points=5 → classic. */
export function starPathD(cx, cy, outerR, points, innerRatio = 0.4) {
  const verts = points * 2
  const parts = []
  for (let i = 0; i < verts; i++) {
    const r = i % 2 === 0 ? outerR : outerR * innerRatio
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    parts.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }
  return parts.join(' ') + ' Z'
}

/**
 * @returns {Array<{ key: string, kind: string, cx: number, cy: number, r: number, rotationDeg?: number, d?: string }>}
 */
export function buildCornerOrnaments({ svgW, svgH, pad, shape, sizeSvg, corners = {} }) {
  if (!shape || shape === 'none' || !(sizeSvg > 0)) return []
  const r = sizeSvg / 2
  const out = []
  for (const key of CORNER_KEYS) {
    if (corners[key] === false) continue
    const { cx, cy } = cornerCenter(key, svgW, svgH, pad)
    const base = { key, kind: shape, cx, cy, r }
    if (shape === 'star4') {
      out.push({ ...base, d: starPathD(cx, cy, r, 4, 0.38) })
    } else if (shape === 'star5') {
      out.push({ ...base, d: starPathD(cx, cy, r, 5, 0.4) })
    } else if (shape === 'triangle') {
      out.push({ ...base, rotationDeg: TRI_ROT[key] })
    } else {
      out.push(base) // circle | square
    }
  }
  return out
}
