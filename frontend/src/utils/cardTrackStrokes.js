/**
 * cardTrackStrokes.js
 * ───────────────────
 * Génération de traits de plume SVG pour les séparateurs du CardTrack.
 *
 * Principe :
 *   - Chaque séparateur est rendu comme un FUSEAU REMPLI (filled polygon)
 *     qui s'effile aux deux extrémités et s'épaissit au centre — effet plume.
 *   - Le trait couvre 80 % de la longueur du séparateur (marge 10 % de chaque côté).
 *   - Une légère courbure de la colonne vertébrale + variation d'épaisseur
 *     crée l'irrégularité naturelle d'un geste à la plume.
 *   - Les séparateurs incluent les frontières coins ↔ cases droites.
 */

// ── Pseudo-random LCG seeded ───────────────────────────────────────────────────
function seededRand(seed) {
  let s = (Math.abs(seed | 0) >>> 0) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

// ── Construction du pool ───────────────────────────────────────────────────────
/**
 * Génère un pool de `count` variantes de trait.
 * Chaque variante décrit la forme du fuseau via des paramètres normalisés
 * appliqués à l'épaisseur maximale (maxHalfWidth) fournie au moment du tracé.
 *
 * @param {number} count     Nombre de variantes
 * @param {number} seedBase  Seed de base
 */
export function buildStrokePool(count, seedBase) {
  const rand = seededRand(seedBase)
  return Array.from({ length: count }, () => ({
    // Wobble perpendiculaire à 1/3 et 2/3 du trajet (multiplicateur × maxHalfWidth)
    wob1: (rand() - 0.5) * 0.50,
    wob2: (rand() - 0.5) * 0.50,
    // Variation d'épaisseur (facteur appliqué à l'épaisseur sin normale)
    wVar1: 0.80 + rand() * 0.40,   // 0.80 … 1.20
    wVar2: 0.80 + rand() * 0.40,
    // Légère perturbation de position des extrémités
    s0p: (rand() - 0.5) * 0.30,
    e0p: (rand() - 0.5) * 0.30,
  }))
}

// ── Tracé d'une variante ───────────────────────────────────────────────────────
/**
 * Génère le path SVG d'un fuseau (filled) pour un séparateur donné.
 *
 * Forme : fuseau à deux ailes symétriques (+ wobble et variation)
 *   Côté 1 : P0 →(C1+n·W1, C2+n·W2)→ P3
 *   Côté 2 : P3 →(C2−n·W2, C1−n·W1)→ P0
 *
 * @param {number} x1, y1      Extrémité gauche / haute du séparateur (SVG units)
 * @param {number} x2, y2      Extrémité droite / basse
 * @param {object} variant     Variante issue du pool
 * @param {number} maxHalfWidth Épaisseur max / 2 (SVG units)
 * @returns {string}           Attribut `d` du path
 */
export function variantToPath(x1, y1, x2, y2, variant, maxHalfWidth) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.001) return ''

  const tx = dx / len, ty = dy / len  // vecteur tangente unitaire
  const nx = -ty, ny = tx              // vecteur perpendiculaire (gauche)

  const { wob1, wob2, wVar1, wVar2, s0p, e0p } = variant
  const w = maxHalfWidth

  // ── 80 % de la longueur — marge 10 % à chaque extrémité ──
  const margin = 0.10
  const P0x = x1 + tx * len * margin       + nx * s0p * w
  const P0y = y1 + ty * len * margin       + ny * s0p * w
  const P3x = x1 + tx * len * (1 - margin) + nx * e0p * w
  const P3y = y1 + ty * len * (1 - margin) + ny * e0p * w

  // ── Points de contrôle du bezier (1/3 et 2/3 du trajet total) ──
  const t1 = margin + (1 - 2 * margin) / 3
  const t2 = margin + (1 - 2 * margin) * 2 / 3
  const C1x = x1 + tx * len * t1
  const C1y = y1 + ty * len * t1
  const C2x = x1 + tx * len * t2
  const C2y = y1 + ty * len * t2

  // ── Épaisseur (half-width) aux points de contrôle ──
  // sin(π/3) ≈ 0.866 → naturellement épais au milieu, effilé aux extrémités
  const SIN = Math.sin(Math.PI / 3)   // ≈ 0.866
  const W1 = w * SIN * wVar1           // with thickness variation
  const W2 = w * SIN * wVar2

  // Offset lateral total pour chaque côté (largeur + wobble de spine)
  const off1A = W1 + wob1 * w   // côté « gauche » (n+)
  const off2A = W2 + wob2 * w
  const off1B = W1 - wob1 * w   // côté « droite » (n-)
  const off2B = W2 - wob2 * w

  const f = v => Math.round(v * 10) / 10

  // ── Fuseau rempli : aller (côté n+) puis retour (côté n−) ──
  return [
    `M ${f(P0x)} ${f(P0y)}`,
    `C ${f(C1x + nx * off1A)} ${f(C1y + ny * off1A)},` +
    `${f(C2x + nx * off2A)} ${f(C2y + ny * off2A)},` +
    `${f(P3x)} ${f(P3y)}`,
    `C ${f(C2x - nx * off2B)} ${f(C2y - ny * off2B)},` +
    `${f(C1x - nx * off1B)} ${f(C1y - ny * off1B)},` +
    `${f(P0x)} ${f(P0y)}`,
    'Z',
  ].join(' ')
}

// ── Sélection d'une variante ───────────────────────────────────────────────────
/**
 * Sélectionne une variante de façon stable (seed + pairIdx → même résultat toujours).
 *
 * @param {Array}  pool       Pool de variantes
 * @param {number} globalSeed Seed configuré par l'utilisateur
 * @param {number} pairIdx    Index de la paire dans l'anneau des cellules
 */
export function pickVariant(pool, globalSeed, pairIdx) {
  if (!pool.length) return null
  const rand = seededRand(globalSeed * 997 + pairIdx * 31)
  rand(); rand()   // warm-up
  return pool[Math.floor(rand() * pool.length)]
}

// ── Calcul des séparateurs ─────────────────────────────────────────────────────
/**
 * Retourne TOUS les séparateurs entre cellules adjacentes dans l'anneau,
 * y compris les frontières coins ↔ cases droites.
 *
 * Algo : pour chaque paire consécutive (i, i+1 mod n) dans le tableau de cellules,
 * si les deux cellules partagent une arête → séparateur.
 *
 *   Même bande H (même y) + arête verticale commune → séparateur VERTICAL
 *   Même bande V (même x) + arête horizontale commune → séparateur HORIZONTAL
 *
 * @param {Array}  cells  Sortie de buildCardTrackCells()
 * @param {number} scale  Facteur mm → SVG units (SCALE dans AtomCardTrack)
 * @returns {Array<{ x1, y1, x2, y2, isVertical: boolean, pairIdx: number }>}
 */
export function buildSeparators(cells, scale) {
  const seps = []
  const n = cells.length
  const EPS = 0.001

  for (let i = 0; i < n; i++) {
    const a = cells[i]
    const b = cells[(i + 1) % n]

    let sep = null

    if (Math.abs(a.y - b.y) < EPS) {
      // ── Même bande horizontale → séparateur VERTICAL ──
      const left  = a.x < b.x ? a : b
      const right = a.x < b.x ? b : a
      if (Math.abs(left.x + left.w - right.x) < EPS) {
        const sepX = (left.x + left.w) * scale
        sep = {
          x1: sepX, y1: left.y * scale,
          x2: sepX, y2: (left.y + left.h) * scale,
          isVertical: true, pairIdx: i,
        }
      }
    } else if (Math.abs(a.x - b.x) < EPS) {
      // ── Même bande verticale → séparateur HORIZONTAL ──
      const top = a.y < b.y ? a : b
      const bot = a.y < b.y ? b : a
      if (Math.abs(top.y + top.h - bot.y) < EPS) {
        const sepY = (top.y + top.h) * scale
        sep = {
          x1: top.x * scale,          y1: sepY,
          x2: (top.x + top.w) * scale, y2: sepY,
          isVertical: false, pairIdx: i,
        }
      }
    }

    if (sep) seps.push(sep)
  }

  return seps
}
