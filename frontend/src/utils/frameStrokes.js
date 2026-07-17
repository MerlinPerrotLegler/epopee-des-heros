/**
 * frameStrokes.js
 * ───────────────
 * Cadre calligraphique — 4 bords générés comme le séparateur (même seed LCG / tiers).
 *
 * Coordonnées : SVG units = mm × 10
 *
 * Si titleGapWidth > 0, le bord haut est coupé en deux pour laisser place au titre.
 */

import { buildSeparatorPaths } from './separatorStrokes.js'

const f = v => Math.round(v * 10) / 10

/**
 * @param {number} W
 * @param {number} H
 * @param {string} tier  - mêmes que separator : fin|basic|rare|epic|mythique|legendaire
 * @param {number} seed
 * @param {{ titleGapWidth?: number, titleCenterX?: number }} [opts]
 * @returns {Array<{ d: string, opacity: number, transform?: string }>}
 */
export function buildFramePaths(W, H, tier, seed, opts = {}) {
  const titleGapWidth = Math.max(0, opts.titleGapWidth || 0)
  const titleCenterX  = opts.titleCenterX != null ? opts.titleCenterX : W / 2

  // Bande d'épaisseur du trait (SVG units) — fine, proportionnelle au plus petit côté
  const band = Math.max(3.5, Math.min(W, H) * 0.045)
  // Décalage pour centrer le trait sur le bord (demi-bande vers l'intérieur)
  const half = band / 2
  const inset = half

  const out = []

  function pushEdge(len, edgeSeed, transform) {
    const paths = buildSeparatorPaths(len, band, tier, edgeSeed)
    for (const p of paths) {
      if (!p?.d) continue
      out.push({ d: p.d, opacity: p.opacity ?? 1, transform })
    }
  }

  // ── Haut ────────────────────────────────────────────────────────────────
  if (titleGapWidth > 0 && titleGapWidth < W * 0.9) {
    const gapPad = Math.max(2, titleGapWidth * 0.08)
    const leftEnd  = Math.max(inset, titleCenterX - titleGapWidth / 2 - gapPad)
    const rightStart = Math.min(W - inset, titleCenterX + titleGapWidth / 2 + gapPad)
    const leftLen  = Math.max(0, leftEnd - inset)
    const rightLen = Math.max(0, W - inset - rightStart)
    if (leftLen > 2) {
      pushEdge(leftLen, seed + 1, `translate(${f(inset)}, ${f(inset - half)})`)
    }
    if (rightLen > 2) {
      pushEdge(rightLen, seed + 2, `translate(${f(rightStart)}, ${f(inset - half)})`)
    }
  } else {
    const topLen = Math.max(0, W - inset * 2)
    if (topLen > 2) {
      pushEdge(topLen, seed + 1, `translate(${f(inset)}, ${f(inset - half)})`)
    }
  }

  // ── Bas ─────────────────────────────────────────────────────────────────
  {
    const botLen = Math.max(0, W - inset * 2)
    if (botLen > 2) {
      pushEdge(
        botLen,
        seed + 3,
        `translate(${f(inset)}, ${f(H - inset - half)})`
      )
    }
  }

  // ── Gauche (généré horizontal puis rotation -90) ────────────────────────
  {
    const sideLen = Math.max(0, H - inset * 2)
    if (sideLen > 2) {
      // translate to left edge, rotate so stroke runs top→bottom
      pushEdge(
        sideLen,
        seed + 5,
        `translate(${f(inset + half)}, ${f(inset)}) rotate(90)`
      )
    }
  }

  // ── Droite ──────────────────────────────────────────────────────────────
  {
    const sideLen = Math.max(0, H - inset * 2)
    if (sideLen > 2) {
      pushEdge(
        sideLen,
        seed + 7,
        `translate(${f(W - inset + half)}, ${f(inset)}) rotate(90)`
      )
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
  // largeur moyenne ~0.55em par caractère + padding latéral
  return Math.max(fontSizeSvg * 2, chars * fontSizeSvg * 0.58 + fontSizeSvg * 1.2)
}
