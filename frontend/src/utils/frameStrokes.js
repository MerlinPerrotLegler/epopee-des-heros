/**
 * frameStrokes.js
 * ───────────────
 * Cadre à double trait d'épaisseur uniforme + ornements aux coins et milieux de côté.
 *
 * Coordonnées : SVG units = mm × 10
 *
 * Si titleGapWidth > 0, le bord haut est coupé en deux pour laisser place au titre.
 */

const f = v => Math.round(v * 10) / 10
const SCALE = 10

function pushRect(out, x, y, w, h, opacity = 1, transform) {
  if (w < 0.05 || h < 0.05) return
  const item = {
    d: `M ${f(x)} ${f(y)} h ${f(w)} v ${f(h)} h ${f(-w)} Z`,
    opacity,
  }
  if (transform) item.transform = transform
  out.push(item)
}

function pushPath(out, d, opacity = 1, transform) {
  if (!d) return
  const item = { d, opacity }
  if (transform) item.transform = transform
  out.push(item)
}

/** Segments horizontaux avec coupure optionnelle au centre (accent). */
function hDouble(out, x1, x2, yOuter, yInner, sw, cutCx, cutHalf) {
  if (x2 - x1 < sw) return
  const leftEnd = cutHalf > 0 ? Math.min(cutCx - cutHalf, x2) : x2
  const rightStart = cutHalf > 0 ? Math.max(cutCx + cutHalf, x1) : x1
  if (leftEnd > x1 + 0.05) {
    pushRect(out, x1, yOuter, leftEnd - x1, sw)
    pushRect(out, x1, yInner, leftEnd - x1, sw)
  }
  if (x2 > rightStart + 0.05) {
    pushRect(out, rightStart, yOuter, x2 - rightStart, sw)
    pushRect(out, rightStart, yInner, x2 - rightStart, sw)
  }
}

/** Segments verticaux avec coupure optionnelle au centre (accent). */
function vDouble(out, y1, y2, xOuter, xInner, sw, cutCy, cutHalf) {
  if (y2 - y1 < sw) return
  const topEnd = cutHalf > 0 ? Math.min(cutCy - cutHalf, y2) : y2
  const botStart = cutHalf > 0 ? Math.max(cutCy + cutHalf, y1) : y1
  if (topEnd > y1 + 0.05) {
    pushRect(out, xOuter, y1, sw, topEnd - y1)
    pushRect(out, xInner, y1, sw, topEnd - y1)
  }
  if (y2 > botStart + 0.05) {
    pushRect(out, xOuter, botStart, sw, y2 - botStart)
    pushRect(out, xInner, botStart, sw, y2 - botStart)
  }
}

/**
 * Vrille d'angle (coin haut-gauche, repère local 0,0 = coin extérieur).
 * @param {number} s — taille en unités SVG
 */
function cornerFlourishPath(s) {
  const k = s
  return [
    `M 0 ${f(k * 0.12)}`,
    `C ${f(k * 0.02)} ${f(k * 0.02)}, ${f(k * 0.12)} 0, ${f(k * 0.32)} ${f(k * 0.02)}`,
    `C ${f(k * 0.52)} ${f(k * 0.04)}, ${f(k * 0.62)} ${f(k * 0.14)}, ${f(k * 0.54)} ${f(k * 0.28)}`,
    `C ${f(k * 0.46)} ${f(k * 0.38)}, ${f(k * 0.32)} ${f(k * 0.34)}, ${f(k * 0.24)} ${f(k * 0.24)}`,
    `C ${f(k * 0.16)} ${f(k * 0.14)}, ${f(k * 0.08)} ${f(k * 0.16)}, ${f(k * 0.04)} ${f(k * 0.28)}`,
    `C 0 ${f(k * 0.38)}, ${f(k * 0.02)} ${f(k * 0.44)}, ${f(k * 0.1)} ${f(k * 0.42)}`,
    `C ${f(k * 0.18)} ${f(k * 0.38)}, ${f(k * 0.2)} ${f(k * 0.3)}, ${f(k * 0.14)} ${f(k * 0.22)}`,
    `C ${f(k * 0.1)} ${f(k * 0.16)}, ${f(k * 0.05)} ${f(k * 0.14)}, 0 ${f(k * 0.12)}`,
    'Z',
  ].join(' ')
}

/** Accent milieu de côté — losange + vrilles latérales (repère : cx,cy = centre sur le trait). */
function edgeAccentPath(cx, cy, s, sw, dir) {
  // dir: 'top' | 'bottom' | 'left' | 'right' — pointe vers l'extérieur
  const h = s * 0.75
  const w = s * 0.32
  let diamond
  let leftCurl
  let rightCurl

  if (dir === 'top') {
    diamond = `M ${f(cx)} ${f(cy - h)} L ${f(cx + w)} ${f(cy - h * 0.25)} L ${f(cx)} ${f(cy + sw)} L ${f(cx - w)} ${f(cy - h * 0.25)} Z`
    leftCurl = `M ${f(cx - w * 0.9)} ${f(cy - h * 0.15)} C ${f(cx - w * 1.4)} ${f(cy - h * 0.35)}, ${f(cx - w * 1.2)} ${f(cy + sw * 2)}, ${f(cx - w * 0.5)} ${f(cy + sw)} Z`
    rightCurl = `M ${f(cx + w * 0.9)} ${f(cy - h * 0.15)} C ${f(cx + w * 1.4)} ${f(cy - h * 0.35)}, ${f(cx + w * 1.2)} ${f(cy + sw * 2)}, ${f(cx + w * 0.5)} ${f(cy + sw)} Z`
  } else if (dir === 'bottom') {
    diamond = `M ${f(cx)} ${f(cy + h)} L ${f(cx + w)} ${f(cy + h * 0.25)} L ${f(cx)} ${f(cy - sw)} L ${f(cx - w)} ${f(cy + h * 0.25)} Z`
    leftCurl = `M ${f(cx - w * 0.9)} ${f(cy + h * 0.15)} C ${f(cx - w * 1.4)} ${f(cy + h * 0.35)}, ${f(cx - w * 1.2)} ${f(cy - sw * 2)}, ${f(cx - w * 0.5)} ${f(cy - sw)} Z`
    rightCurl = `M ${f(cx + w * 0.9)} ${f(cy + h * 0.15)} C ${f(cx + w * 1.4)} ${f(cy + h * 0.35)}, ${f(cx + w * 1.2)} ${f(cy - sw * 2)}, ${f(cx + w * 0.5)} ${f(cy - sw)} Z`
  } else if (dir === 'left') {
    diamond = `M ${f(cx - h)} ${f(cy)} L ${f(cx - h * 0.25)} ${f(cy + w)} L ${f(cx + sw)} ${f(cy)} L ${f(cx - h * 0.25)} ${f(cy - w)} Z`
    leftCurl = `M ${f(cx - h * 0.15)} ${f(cy - w * 0.9)} C ${f(cx - h * 0.35)} ${f(cy - w * 1.4)}, ${f(cx + sw * 2)} ${f(cy - w * 1.2)}, ${f(cx + sw)} ${f(cy - w * 0.5)} Z`
    rightCurl = `M ${f(cx - h * 0.15)} ${f(cy + w * 0.9)} C ${f(cx - h * 0.35)} ${f(cy + w * 1.4)}, ${f(cx + sw * 2)} ${f(cy + w * 1.2)}, ${f(cx + sw)} ${f(cy + w * 0.5)} Z`
  } else {
    diamond = `M ${f(cx + h)} ${f(cy)} L ${f(cx + h * 0.25)} ${f(cy + w)} L ${f(cx - sw)} ${f(cy)} L ${f(cx + h * 0.25)} ${f(cy - w)} Z`
    leftCurl = `M ${f(cx + h * 0.15)} ${f(cy - w * 0.9)} C ${f(cx + h * 0.35)} ${f(cy - w * 1.4)}, ${f(cx - sw * 2)} ${f(cy - w * 1.2)}, ${f(cx - sw)} ${f(cy - w * 0.5)} Z`
    rightCurl = `M ${f(cx + h * 0.15)} ${f(cy + w * 0.9)} C ${f(cx + h * 0.35)} ${f(cy + w * 1.4)}, ${f(cx - sw * 2)} ${f(cy + w * 1.2)}, ${f(cx - sw)} ${f(cy + w * 0.5)} Z`
  }
  return [diamond, leftCurl, rightCurl]
}

function addCornerFlourishes(out, W, H, inset, orn, tier) {
  if (tier === 'fin') return
  const d = cornerFlourishPath(orn)
  const corners = [
    `translate(${f(inset)}, ${f(inset)})`,
    `translate(${f(W - inset)}, ${f(inset)}) rotate(90)`,
    `translate(${f(W - inset)}, ${f(H - inset)}) rotate(180)`,
    `translate(${f(inset)}, ${f(H - inset)}) rotate(270)`,
  ]
  for (const transform of corners) {
    pushPath(out, d, 1, transform)
  }
}

function addEdgeAccents(out, W, H, outerOff, innerOff, sw, acc, tier) {
  if (tier === 'fin') return
  const dirs = [
    { dir: 'top', cx: W / 2, cy: outerOff },
    { dir: 'bottom', cx: W / 2, cy: H - outerOff - sw },
    { dir: 'left', cx: outerOff, cy: H / 2 },
    { dir: 'right', cx: W - outerOff - sw, cy: H / 2 },
  ]
  for (const { dir, cx: ax, cy: ay } of dirs) {
    for (const p of edgeAccentPath(ax, ay, acc, sw, dir)) {
      pushPath(out, p)
    }
  }
}

/**
 * @param {number} W
 * @param {number} H
 * @param {string} tier  - fin|basic|rare|epic|mythique|legendaire
 * @param {number} seed  - conservé pour compat ; ornements déterministes
 * @param {{ titleGapWidth?: number, titleCenterX?: number, strokeWidthMm?: number, lineGapMm?: number }} [opts]
 * @returns {Array<{ d: string, opacity: number, transform?: string }>}
 */
export function buildFramePaths(W, H, tier, seed, opts = {}) {
  void seed

  const strokeMm = Math.max(0.06, opts.strokeWidthMm ?? 0.12)
  const gapMm = Math.max(0.08, opts.lineGapMm ?? 0.22)
  const sw = strokeMm * SCALE
  const gap = gapMm * SCALE

  const minSide = Math.min(W, H)
  const ornMm = Math.max(2, Math.min(4.5, minSide / SCALE * 0.09))
  const accMm = Math.max(1.6, Math.min(3.2, minSide / SCALE * 0.055))
  const orn = ornMm * SCALE
  const acc = accMm * SCALE
  const accHalf = acc * 0.55

  const inset = Math.max(sw * 2, orn * 0.28)
  const outerOff = inset
  const innerOff = inset + sw + gap
  const isDouble = tier !== 'fin'

  const xStart = outerOff + orn * 0.42
  const xEnd = W - outerOff - orn * 0.42
  const yStart = outerOff + orn * 0.42
  const yEnd = H - outerOff - orn * 0.42

  const out = []
  const titleGapWidth = Math.max(0, opts.titleGapWidth || 0)
  const titleCenterX = opts.titleCenterX != null ? opts.titleCenterX : W / 2

  function topSegments(xA, xB) {
    if (isDouble) {
      hDouble(out, xA, xB, outerOff, innerOff, sw, W / 2, accHalf)
    } else {
      if (xB - xA > sw) pushRect(out, xA, outerOff, xB - xA, sw)
    }
  }

  function bottomSegments(xA, xB) {
    const yOut = H - outerOff - sw
    const yIn = H - innerOff - sw
    if (isDouble) {
      hDouble(out, xA, xB, yOut, yIn, sw, W / 2, accHalf)
    } else if (xB - xA > sw) {
      pushRect(out, xA, yOut, xB - xA, sw)
    }
  }

  // ── Haut ────────────────────────────────────────────────────────────────
  if (titleGapWidth > 0 && titleGapWidth < W * 0.9) {
    const gapPad = Math.max(2, titleGapWidth * 0.08)
    const leftEnd = Math.max(xStart, titleCenterX - titleGapWidth / 2 - gapPad)
    const rightStart = Math.min(xEnd, titleCenterX + titleGapWidth / 2 + gapPad)
    if (leftEnd > xStart + 0.05) topSegments(xStart, leftEnd)
    if (xEnd > rightStart + 0.05) topSegments(rightStart, xEnd)
  } else {
    topSegments(xStart, xEnd)
  }

  // ── Bas ─────────────────────────────────────────────────────────────────
  bottomSegments(xStart, xEnd)

  // ── Gauche / Droite ─────────────────────────────────────────────────────
  const xLOut = outerOff
  const xLIn = innerOff
  const xROut = W - outerOff - sw
  const xRIn = W - innerOff - sw

  if (isDouble) {
    vDouble(out, yStart, yEnd, xLOut, xLIn, sw, H / 2, accHalf)
    vDouble(out, yStart, yEnd, xROut, xRIn, sw, H / 2, accHalf)
  } else {
    if (yEnd > yStart + sw) pushRect(out, xLOut, yStart, sw, yEnd - yStart)
    if (yEnd > yStart + sw) pushRect(out, xROut, yStart, sw, yEnd - yStart)
  }

  addCornerFlourishes(out, W, H, inset, orn, tier)
  addEdgeAccents(out, W, H, outerOff, innerOff, sw, acc, tier)

  // Tiers supérieurs : petites croix sur les traits (épaisseur uniforme)
  if (tier === 'rare' || tier === 'epic' || tier === 'mythique' || tier === 'legendaire') {
    const tick = sw * 2.2
    const midY = (outerOff + innerOff + sw) / 2
    for (const fx of [0.25, 0.75]) {
      const tx = xStart + (xEnd - xStart) * fx
      pushRect(out, tx - sw / 2, midY - tick / 2, sw, tick)
    }
    for (const fy of [0.25, 0.75]) {
      const ty = yStart + (yEnd - yStart) * fy
      pushRect(out, xLOut + (xLIn - xLOut) / 2 - sw / 2, ty - sw / 2, sw, sw * 2.5)
    }
  }

  return out
}

/**
 * Estime la largeur SVG nécessaire pour un titre (approx. métrique).
 * fontSizeSvg = fontSize_mm × 10
 */
export function estimateTitleGapWidth(title, fontSizeSvg) {
  if (!title) return 0
  const chars = String(title).length
  return Math.max(fontSizeSvg * 2, chars * fontSizeSvg * 0.58 + fontSizeSvg * 1.2)
}
