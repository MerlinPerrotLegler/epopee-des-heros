/**
 * cardTrackLayout.js
 * ──────────────────
 * Calcul du layout d'un CardTrack : taille des cases, répartition, positions, rotations.
 * Partagé entre AtomCardTrack.vue (rendu SVG) et EditorCanvas.vue (hit-test au clic).
 *
 * TOUTE modification ici affecte simultanément le rendu ET la détection de clic.
 */

// ── Calcul des paramètres structurels ──────────────────────────────────────────
/**
 * Priorité de résolution :
 *  1. cells_top + cells_left   → compte de cases explicite par côté
 *  2. thicknessH_mm + thicknessV_mm → épaisseur de piste explicite
 *  3. n_end (défaut)           → dernier numéro affiché, roundMode contrôle l'arrondi
 *
 * roundMode (affecte uniquement le mode n_end) :
 *   'round'  → arrondit les cases droites au multiple de 4 le plus proche
 *   'floor'  → choisit le multiple de 4 inférieur
 *   'ceil'   → choisit le multiple de 4 supérieur
 *
 * @param {object} params     params.* de l'atom cardTrack
 * @param {number} width_mm   largeur du layout en mm
 * @param {number} height_mm  hauteur du layout en mm
 * @returns {{ tc, lc, csH, csV, total }}
 *   tc   = cases droites sur chaque côté horizontal (haut / bas)
 *   lc   = cases droites sur chaque côté vertical   (gauche / droite)
 *   csH  = largeur exacte d'une case en mm  (W / (tc+2))
 *   csV  = hauteur exacte d'une case en mm  (H / (lc+2))
 *   total = nombre total de cellules dans la séquence (4 coins + cases droites)
 */
export function computeCardTrackLayout(params, width_mm, height_mm) {
  const W = width_mm
  const H = height_mm

  const roundFns = { floor: Math.floor, ceil: Math.ceil, round: Math.round }
  const roundFn  = roundFns[params.roundMode || 'round'] ?? Math.round

  let tc, lc

  // ── Mode 1 : nombre de cases explicite ────────────────────────────────────
  if (params.cells_top != null && params.cells_left != null) {
    tc = Math.max(1, Math.round(params.cells_top))
    lc = Math.max(1, Math.round(params.cells_left))

  // ── Mode 2 : épaisseur de piste explicite ─────────────────────────────────
  // thicknessH_mm = épaisseur des pistes haut/bas  → correspond à csV
  // thicknessV_mm = épaisseur des pistes gauche/droite → correspond à csH
  } else if (params.thicknessH_mm || params.thicknessV_mm) {
    const tH = params.thicknessH_mm || null   // → csV cible
    const tV = params.thicknessV_mm || null   // → csH cible

    // Calculer tc depuis tV, lc depuis tH (puis recaler pour division exacte)
    if (tV) tc = Math.max(1, roundFn(W / tV - 2))
    if (tH) lc = Math.max(1, roundFn(H / tH - 2))

    // Si un seul est fixé, déduire l'autre depuis n_end
    if (!tc || !lc) {
      const straight = _snappedStraight(params, roundFn)
      if (!tc) tc = Math.max(1, Math.round(straight / 2 * W / (W + H)))
      if (!lc) lc = Math.max(1, straight / 2 - tc)
    }

  // ── Mode 3 : n_end (dernier numéro affiché) ────────────────────────────────
  } else {
    const straight = _snappedStraight(params, roundFn)
    tc = Math.max(1, Math.round(straight / 2 * W / (W + H)))
    lc = Math.max(1, straight / 2 - tc)
  }

  // Division exacte : aucun espace vide, aucun chevauchement
  const csH   = W / (tc + 2)
  const csV   = H / (lc + 2)
  const total = 4 + 2 * tc + 2 * lc

  return { tc, lc, csH, csV, total }
}

/**
 * Calcule le nombre de cases DROITES (hors coins) arrondi au multiple de 4
 * à partir de n_end, n_start et roundMode.
 *
 * Formule : total_cibles = n_end - n_start + 1
 *           cases_droites = total_cibles - 4   (les 4 coins sont fixes)
 *           → arrondir au multiple de 4 avec roundMode
 */
function _snappedStraight(params, roundFn) {
  const nEnd   = params.n_end   ?? 50
  const nStart = params.n_start ?? 0
  const raw    = nEnd - nStart - 3     // cases droites brutes (total - 4 coins)
  return Math.max(4, roundFn(raw / 4) * 4)
}

// ── Rotations du texte selon l'orientation choisie ────────────────────────────
function getStraightRots(textOrientation) {
  // 'parallel'      : haut du chiffre vers le centre (comportement original)
  // 'perpendicular' : +90° → haut du chiffre vers le côté de la carte
  if (textOrientation === 'perpendicular') {
    return { top: 270, bottom: 90, left: 0, right: 180 }
  }
  return { top: 180, bottom: 0, left: 90, right: 270 }
}

function getCornerRot(corner, params) {
  const mode  = params.cornerTextMode  || 'bisect'
  const angle = params.cornerTextAngle ?? 45
  if (mode === 'bisect')        return { TL: 135, TR: 225, BR: 315, BL: 45  }[corner]
  if (mode === 'parallel')      return { TL: 180, TR: 180, BR:   0, BL:   0 }[corner]
  if (mode === 'perpendicular') return { TL:  90, TR: 270, BR: 270, BL:  90 }[corner]
  return angle   // 'custom'
}

// ── Construction de la liste ordonnée de toutes les cellules ──────────────────
/**
 * Retourne le tableau de cellules dans l'ordre TL-horaire.
 * Toutes les positions (x, y, cx, cy) et dimensions (w, h) sont en mm.
 *
 * @returns {Array<{
 *   idx, n, isCorner, corner?, side?,
 *   x, y, w, h, cx, cy, textRot
 * }>}
 */
export function buildCardTrackCells(params, width_mm, height_mm) {
  const { tc, lc, csH, csV, total } = computeCardTrackLayout(params, width_mm, height_mm)

  const rots = getStraightRots(params.textOrientation)

  const startOffset = (() => {
    const map = {
      topLeft:     0,
      topRight:    1 + tc,
      bottomRight: 2 + tc + lc,
      bottomLeft:  3 + 2 * tc + lc,
    }
    return map[params.startCorner || 'topLeft'] ?? 0
  })()

  const n0  = params.n_start ?? 0
  const raw = []

  // ── Coin TL ── bisectrice entre haut(180°) et gauche(90°) → 135°
  raw.push({ isCorner: true,  corner: 'TL', x: 0,            y: 0,            textRot: getCornerRot('TL', params) })

  // ── Bord haut (gauche → droite) ──
  for (let i = 0; i < tc; i++)
    raw.push({ isCorner: false, side: 'top',    x: (i + 1) * csH, y: 0,            textRot: rots.top    })

  // ── Coin TR ── bisectrice entre haut(180°) et droite(270°) → 225°
  raw.push({ isCorner: true,  corner: 'TR', x: (tc + 1) * csH, y: 0,            textRot: getCornerRot('TR', params) })

  // ── Bord droit (haut → bas) ──
  for (let i = 0; i < lc; i++)
    raw.push({ isCorner: false, side: 'right',  x: (tc + 1) * csH, y: (i + 1) * csV, textRot: rots.right  })

  // ── Coin BR ── bisectrice entre droite(270°) et bas(0°/360°) → 315°
  raw.push({ isCorner: true,  corner: 'BR', x: (tc + 1) * csH, y: (lc + 1) * csV, textRot: getCornerRot('BR', params) })

  // ── Bord bas (droite → gauche, sens horaire) ──
  for (let i = 0; i < tc; i++)
    raw.push({ isCorner: false, side: 'bottom', x: (tc - i) * csH, y: (lc + 1) * csV, textRot: rots.bottom })

  // ── Coin BL ── bisectrice entre bas(0°) et gauche(90°) → 45°
  raw.push({ isCorner: true,  corner: 'BL', x: 0,            y: (lc + 1) * csV, textRot: getCornerRot('BL', params) })

  // ── Bord gauche (bas → haut, sens horaire) ──
  for (let i = 0; i < lc; i++)
    raw.push({ isCorner: false, side: 'left',   x: 0,            y: (lc - i) * csV, textRot: rots.left   })

  return raw.map((cell, idx) => ({
    ...cell,
    idx,
    n:  n0 + ((idx - startOffset + total) % total),
    w:  csH,
    h:  csV,
    cx: cell.x + csH / 2,
    cy: cell.y + csV / 2,
  }))
}

// ── Hit-test : quelle cellule a été cliquée ? ─────────────────────────────────
/**
 * @param {number} relX_mm  x du clic en mm depuis le coin haut-gauche de l'atom
 * @param {number} relY_mm  y du clic en mm depuis le coin haut-gauche de l'atom
 * @returns {number|null}   idx de la cellule, ou null si hors piste
 */
export function hitTestCardTrackCell(params, width_mm, height_mm, relX_mm, relY_mm) {
  const cells = buildCardTrackCells(params, width_mm, height_mm)
  for (const cell of cells) {
    if (relX_mm >= cell.x && relX_mm < cell.x + cell.w &&
        relY_mm >= cell.y && relY_mm < cell.y + cell.h) {
      return cell.idx
    }
  }
  return null
}
