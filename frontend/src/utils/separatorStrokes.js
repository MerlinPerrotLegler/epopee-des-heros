/**
 * separatorStrokes.js
 * ───────────────────
 * Génération de séparateurs calligraphiques SVG — 5 niveaux d'ornementation.
 *
 * Technique identique aux traits de plume du CardTrack :
 *   - Fuseaux remplis (filled polygons bezier) pour l'effet plume
 *   - Determinisme via seed LCG → le même seed donne toujours le même rendu
 *
 * Coordonnées : SVG units = mm × 10 (cohérent avec AtomTrak)
 *
 * Tiers disponibles :
 *   basic      — trait plume pur, sobre
 *   rare       — trait + petites enjolivures (diamants + croix centrale)
 *   epic       — trait + enjolivures moyennes (3 croix + diamants multiples)
 *   mythique   — trait + grandes enjolivures (croix, vrilles calligraphiques)
 *   legendaire — trait + effet magique (vrilles + sparkles + halo)
 */

const f = v => Math.round(v * 10) / 10

// ── LCG seeded pseudo-random ─────────────────────────────────────────────────
function seededRand(seed) {
  let s = (Math.abs(seed | 0) >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

// ── Fuseau horizontal : (x1,cy) → (x2,cy), demi-largeur hw ─────────────────
// wob : wobble perpendiculaire de la colonne vertébrale (fraction de hw)
// vT / vB : variation d'épaisseur haut / bas
// m   : marge de pointe (fraction de len) — plus grand = pointe plus marquée
function fH(x1, x2, cy, hw, wob = 0, vT = 1, vB = 1, m = 0.10) {
  const len = x2 - x1
  if (len < 0.5) return ''
  const Px = x1 + len * m, Qx = x2 - len * m
  const t1 = m + (1 - 2 * m) / 3
  const t2 = m + (1 - 2 * m) * 2 / 3
  const C1x = x1 + len * t1, C2x = x1 + len * t2
  const k = 0.866 // sin(60°)
  const W1t = hw * k * vT + wob * hw * 0.5
  const W2t = hw * k * vT - wob * hw * 0.5
  const W1b = hw * k * vB + wob * hw * 0.3
  const W2b = hw * k * vB - wob * hw * 0.3
  return [
    `M ${f(Px)} ${f(cy)}`,
    `C ${f(C1x)} ${f(cy - W1t)},${f(C2x)} ${f(cy - W2t)},${f(Qx)} ${f(cy)}`,
    `C ${f(C2x)} ${f(cy + W2b)},${f(C1x)} ${f(cy + W1b)},${f(Px)} ${f(cy)}`,
    'Z',
  ].join(' ')
}

// ── Fuseau vertical : (cx,y1) → (cx,y2), demi-largeur hw ────────────────────
function fV(cx, y1, y2, hw, wobL = 0, wobR = 0) {
  const len = y2 - y1
  if (len < 0.5) return ''
  const m = 0.07
  const Py = y1 + len * m, Qy = y2 - len * m
  const t1 = m + (1 - 2 * m) / 3
  const t2 = m + (1 - 2 * m) * 2 / 3
  const C1y = y1 + len * t1, C2y = y1 + len * t2
  const k = 0.866
  const W1l = hw * k + wobL * hw, W2l = hw * k - wobL * hw
  const W1r = hw * k + wobR * hw, W2r = hw * k - wobR * hw
  return [
    `M ${f(cx)} ${f(Py)}`,
    `C ${f(cx - W1l)} ${f(C1y)},${f(cx - W2l)} ${f(C2y)},${f(cx)} ${f(Qy)}`,
    `C ${f(cx + W2r)} ${f(C2y)},${f(cx + W1r)} ${f(C1y)},${f(cx)} ${f(Py)}`,
    'Z',
  ].join(' ')
}

// ── Diamant allongé horizontalement ─────────────────────────────────────────
function dH(cx, cy, rx, ry) {
  return `M ${f(cx - rx)} ${f(cy)} L ${f(cx)} ${f(cy - ry)} L ${f(cx + rx)} ${f(cy)} L ${f(cx)} ${f(cy + ry)} Z`
}

// ── Vrille calligraphique (teardrop) vers le haut ou le bas ──────────────────
// dir : -1 = vers le haut, +1 = vers le bas
// len : hauteur de la vrille, w : demi-largeur au plus large
function vrille(cx, cy, dir, len, w) {
  const s = dir
  const a = cy + s * len * 0.35
  const b = cy + s * len * 0.80
  const tip = cy + s * len
  return [
    `M ${f(cx)} ${f(cy)}`,
    `C ${f(cx - w * 1.05)} ${f(a)},${f(cx - w * 0.68)} ${f(b)},${f(cx)} ${f(tip)}`,
    `C ${f(cx + w * 0.68)} ${f(b)},${f(cx + w * 1.05)} ${f(a)},${f(cx)} ${f(cy)}`,
    'Z',
  ].join(' ')
}

// ── Étoile 4 branches (sparkle) ──────────────────────────────────────────────
// ro : rayon extérieur, ri : rayon de la gorge entre les branches
function star4(cx, cy, ro, ri) {
  const d = ri * 0.707
  return [
    `M ${f(cx)} ${f(cy - ro)}`,
    `L ${f(cx + d)} ${f(cy - d)}`,
    `L ${f(cx + ro)} ${f(cy)}`,
    `L ${f(cx + d)} ${f(cy + d)}`,
    `L ${f(cx)} ${f(cy + ro)}`,
    `L ${f(cx - d)} ${f(cy + d)}`,
    `L ${f(cx - ro)} ${f(cy)}`,
    `L ${f(cx - d)} ${f(cy - d)}`,
    'Z',
  ].join(' ')
}

// ── Helper interne ───────────────────────────────────────────────────────────
function p(d, opacity = 1) { return { d, opacity } }

/**
 * Génère les descripteurs de paths SVG pour un séparateur horizontal.
 *
 * @param {number} W     - Largeur totale en SVG units (= width_mm × 10)
 * @param {number} H     - Hauteur totale en SVG units (= height_mm × 10)
 * @param {string} tier  - 'basic' | 'rare' | 'epic' | 'mythique' | 'legendaire'
 * @param {number} seed  - Seed pour la variation déterministe
 * @returns {Array<{d: string, opacity: number}>}
 */
export function buildSeparatorPaths(W, H, tier, seed) {
  const rand = seededRand(seed)
  const cx = W / 2   // centre horizontal
  const cy = H / 2   // centre vertical (axe du trait principal)
  const R  = H / 2   // demi-hauteur = rayon max des ornements

  // Variation aléatoire déterministe pour ce seed
  // basic → wobble très faible : on veut un trait de plume droit et sobre
  const isThin = tier === 'basic'
  const wob  = (rand() - 0.5) * (isThin ? 0.10 : 0.22)
  const vTop = (isThin ? 0.92 : 0.86) + rand() * (isThin ? 0.16 : 0.28)
  const vBot = (isThin ? 0.92 : 0.86) + rand() * (isThin ? 0.16 : 0.28)

  const bg = []   // sous le trait principal (halos)
  const mid = []  // trait principal
  const fg = []   // ornements au-dessus

  // ── Trait principal (tous les tiers) ────────────────────────────────────
  // basic : marge de pointe 0.12 → attaque/dégagé plus marqués à la plume
  const strokeMargin = isThin ? 0.12 : 0.10
  mid.push(p(fH(0, W, cy, R * 0.30, wob, vTop, vBot, strokeMargin)))

  if (tier === 'basic') return mid

  // ── rare+ : croix centrale + diamants flanquants ─────────────────────
  const pW = Math.max(W * 0.011, 2) // demi-largeur des fuseaux perpendiculaires

  fg.push(p(fV(cx, cy - R * 0.82, cy + R * 0.82, pW,
    rand() * 0.08, rand() * 0.08), 0.92))

  const dr1 = R * 0.46, dy1 = R * 0.23
  fg.push(p(dH(W * 0.25, cy, dr1, dy1), 0.88))
  fg.push(p(dH(W * 0.75, cy, dr1, dy1), 0.88))

  if (tier === 'rare') return [...mid, ...fg]

  // ── epic+ : triple croix + diamants intermédiaires + finiales ────────
  fg.push(p(fV(cx - pW * 3.5, cy - R * 0.58, cy + R * 0.58, pW * 0.80,
    rand() * 0.06, rand() * 0.06), 0.80))
  fg.push(p(fV(cx + pW * 3.5, cy - R * 0.58, cy + R * 0.58, pW * 0.80,
    rand() * 0.06, rand() * 0.06), 0.80))

  fg.push(p(fV(W * 0.25, cy - R * 0.60, cy + R * 0.60, pW * 0.85,
    rand() * 0.08, rand() * 0.08), 0.82))
  fg.push(p(fV(W * 0.75, cy - R * 0.60, cy + R * 0.60, pW * 0.85,
    rand() * 0.08, rand() * 0.08), 0.82))

  fg.push(p(dH(W * 0.375, cy, R * 0.32, R * 0.16), 0.80))
  fg.push(p(dH(W * 0.625, cy, R * 0.32, R * 0.16), 0.80))
  fg.push(p(dH(W * 0.10,  cy, R * 0.22, R * 0.11), 0.76))
  fg.push(p(dH(W * 0.90,  cy, R * 0.22, R * 0.11), 0.76))

  if (tier === 'epic') return [...mid, ...fg]

  // ── mythique+ : vrilles calligraphiques + diamant central ────────────
  const tLen = R * 0.68, tW = R * 0.23

  // Vrilles au centre (haut + bas)
  fg.push(p(vrille(cx, cy, -1, tLen, tW), 0.78))
  fg.push(p(vrille(cx, cy, +1, tLen, tW), 0.78))

  // Vrilles aux positions 1/4 et 3/4
  const st = tLen * 0.72, sw = tW * 0.78
  fg.push(p(vrille(W * 0.25, cy, -1, st, sw), 0.72))
  fg.push(p(vrille(W * 0.25, cy, +1, st, sw), 0.72))
  fg.push(p(vrille(W * 0.75, cy, -1, st, sw), 0.72))
  fg.push(p(vrille(W * 0.75, cy, +1, st, sw), 0.72))

  // Petites vrilles aux positions 40% et 60%
  const mt = tLen * 0.50, mw = tW * 0.55
  fg.push(p(vrille(W * 0.40, cy, -1, mt, mw), 0.65))
  fg.push(p(vrille(W * 0.40, cy, +1, mt, mw), 0.65))
  fg.push(p(vrille(W * 0.60, cy, -1, mt, mw), 0.65))
  fg.push(p(vrille(W * 0.60, cy, +1, mt, mw), 0.65))

  // Petits diamants finials aux extrémités
  fg.push(p(dH(W * 0.055, cy, R * 0.18, R * 0.09), 0.78))
  fg.push(p(dH(W * 0.945, cy, R * 0.18, R * 0.09), 0.78))

  // Grand diamant central en avant-plan
  fg.push(p(dH(cx, cy, R * 0.28, R * 0.18), 0.90))

  if (tier === 'mythique') return [...mid, ...fg]

  // ── légendaire : sparkles + halo magique ────────────────────────────
  // Sparkle central (remplace le diamant)
  fg.push(p(star4(cx, cy, R * 0.32, R * 0.08), 0.95))

  // Sparkles aux positions 1/4 et 3/4
  fg.push(p(star4(W * 0.25, cy, R * 0.22, R * 0.055), 0.85))
  fg.push(p(star4(W * 0.75, cy, R * 0.22, R * 0.055), 0.85))

  // Petits sparkles aux extrémités
  fg.push(p(star4(W * 0.10, cy, R * 0.13, R * 0.033), 0.70))
  fg.push(p(star4(W * 0.90, cy, R * 0.13, R * 0.033), 0.70))

  // Halo magique (trait élargi semi-transparent, dessiné SOUS tout le reste)
  bg.push(p(fH(W * 0.01, W * 0.99, cy, R * 1.9, wob * 0.4, 0.5, 0.5), 0.12))

  return [...bg, ...mid, ...fg]
}
