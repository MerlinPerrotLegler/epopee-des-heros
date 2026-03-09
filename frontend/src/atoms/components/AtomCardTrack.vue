<template>
  <!--
    AtomCardTrack — Piste numérotée sur les quatre bords de la carte.
    ═══════════════════════════════════════════════════════════════════

    FORMULE TAILLE DES CASES
    ────────────────────────
    max  = nombre de cases DROITES souhaitées (hors 4 coins, défaut 50).
    maxS = snap au multiple de 4 inférieur.
    tc   = cases par côté horizontal  =  round(maxS/2 × W/(W+H))
    lc   = cases par côté vertical    =  maxS/2 − tc
    csH  = W / (tc+2)    ← largeur exacte d'une case (horizontal + coins)
    csV  = H / (lc+2)    ← hauteur exacte d'une case (vertical + coins)

    Division exacte → aucun chevauchement, aucun espace vide.
    Les coins sont rectangulaires (csH × csV) si csH ≠ csV.

    IMPORTANT : modifier tc, lc, csH ou csV affecte TOUTES les cases
    (droites + coins) simultanément.

    ORIENTATION DES CHIFFRES (haut = vers le centre de la carte)
    ─────────────────────────────────────────────────────────────
      Bas    → 0°    Haut → 180°    Gauche → 90°    Droite → 270°
      Coins  → 45° / 135° / 225° / 315° (bisectrice entre les deux côtés)

    FORME DES COINS
    ───────────────
    Rectangle identique aux cases droites (csH × csV).
    Seul le texte est incliné à 45°. Les coins sont rendus AU-DESSUS des
    cases droites (deux passes SVG).

    NUMÉROTATION CONTINUE
    ─────────────────────
    Sens horaire depuis startCorner : TL → haut(G→D) → TR → droite(H→B)
    → BR → bas(D→G) → BL → gauche(B→H).

    Props params:
      max          {number}  Cases droites totales, hors 4 coins (défaut 50)
      n_start      {number}  Premier numéro (défaut 0)
      startCorner  {string}  'topLeft'|'topRight'|'bottomRight'|'bottomLeft'
      bgColor      {string}  Fond des cases (défaut '#2a3050')
      textColor    {string}  Texte (défaut '#ffffff')
      fontSize     {number}  Taille texte en mm (défaut 2.5)
      borderColor  {string}  Bordure (défaut '#6c7aff')
      borderWidth  {number}  Épaisseur bordure en mm (défaut 0.2)
      svgMediaId   {string}  SVG décoratif dans les coins (optionnel)
  -->
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${W} ${H}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- ── Passe 1 : cases droites (derrière les coins) ── -->
    <g v-for="cell in straightCells" :key="`s-${cell.idx}`">
      <rect
        :x="cell.x" :y="cell.y" :width="cH" :height="cV"
        :fill="p.bgColor     || '#2a3050'"
        :stroke="p.borderColor || '#6c7aff'"
        :stroke-width="bw"
      />
      <text
        :x="cell.cx" :y="cell.cy"
        text-anchor="middle" dominant-baseline="central"
        :fill="p.textColor || '#ffffff'"
        :font-size="fontSz"
        font-family="Outfit" font-weight="600"
        :transform="`rotate(${cell.textRot},${cell.cx},${cell.cy})`"
      >{{ cell.n }}</text>
    </g>

    <!-- ── Passe 2 : coins (au-dessus des cases droites) ── -->
    <g v-for="cell in cornerCells" :key="`c-${cell.corner}`">
      <!-- Fond SVG décoratif optionnel (en dessous de la case) -->
      <image
        v-if="p.svgMediaId"
        :href="`/uploads/${p.svgMediaId}`"
        :x="cell.x" :y="cell.y" :width="cH" :height="cV"
        preserveAspectRatio="xMidYMid meet"
      />
      <!-- Rectangle identique aux cases droites -->
      <rect
        :x="cell.x" :y="cell.y" :width="cH" :height="cV"
        :fill="p.bgColor     || '#2a3050'"
        :stroke="p.borderColor || '#6c7aff'"
        :stroke-width="bw"
      />
      <!-- Texte incliné à 45° (bisectrice des deux côtés adjacents) -->
      <text
        :x="cell.cx" :y="cell.cy"
        text-anchor="middle" dominant-baseline="central"
        :fill="p.textColor || '#ffffff'"
        :font-size="fontSz"
        font-family="Outfit" font-weight="600"
        :transform="`rotate(${cell.textRot},${cell.cx},${cell.cy})`"
      >{{ cell.n }}</text>
    </g>
  </svg>
</template>

<script setup>
// ──────────────────────────────────────────────────────────────────
// ATTENTION : modifier tc, lc, csH ou csV change les 4 bords + coins.
// ──────────────────────────────────────────────────────────────────
import { computed } from 'vue'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  { type: Number, default: 63 },
  height_mm: { type: Number, default: 88 },
  zoom:      { type: Number, default: 1 },
})

const p = computed(() => props.params)

// ── Unités SVG (1 mm = SCALE unités) ──────────────────────────────
const SCALE = 10
const W = computed(() => props.width_mm  * SCALE)
const H = computed(() => props.height_mm * SCALE)

// ── Snap de max au multiple de 4 inférieur ────────────────────────
const maxSnapped = computed(() => {
  const m = p.value.max ?? 50
  return Math.max(4, Math.floor(m / 4) * 4)
})

// ── Répartition proportionnelle des cases par côté ────────────────
// tc = cases sur chaque côté horizontal (haut & bas)
// lc = cases sur chaque côté vertical  (gauche & droite)
// tc + lc = maxSnapped / 2  → 2*tc + 2*lc = maxSnapped  (cases droites)
const tc = computed(() =>
  Math.round(maxSnapped.value / 2 * W.value / (W.value + H.value))
)
const lc = computed(() => maxSnapped.value / 2 - tc.value)

// ── Taille exacte des cases (division sans reste) ─────────────────
// Toutes les cases (droites + coins) ont la même largeur cH et hauteur cV.
// cH × (tc+2) = W  →  cH = W/(tc+2)    (2 coins occupent chacun 1 largeur)
// cV × (lc+2) = H  →  cV = H/(lc+2)
const cH = computed(() => W.value / (tc.value + 2))   // largeur d'une case
const cV = computed(() => H.value / (lc.value + 2))   // hauteur d'une case

// ── Total de cellules dans la séquence (pour la numérotation) ─────
const totalCells = computed(() => 4 + 2 * tc.value + 2 * lc.value)

// ── Décalage de départ (startCorner) dans la séquence TL-horaire ──
const startOffset = computed(() => {
  const t = tc.value, l = lc.value
  const map = {
    topLeft:     0,
    topRight:    1 + t,
    bottomRight: 2 + t + l,
    bottomLeft:  3 + 2 * t + l,
  }
  return map[p.value.startCorner || 'topLeft'] ?? 0
})

// ── Construction de toutes les cellules en ordre TL-horaire ───────
//
// Séquence :
//   [0] coin TL
//   [1 .. tc]           haut gauche→droite
//   [tc+1]              coin TR
//   [tc+2 .. tc+lc+1]  droite haut→bas
//   [tc+lc+2]           coin BR
//   [tc+lc+3 .. 2tc+lc+2] bas droite→gauche
//   [2tc+lc+3]          coin BL
//   [2tc+lc+4 .. 2tc+2lc+3] gauche bas→haut
//
const allCells = computed(() => {
  const t  = tc.value, l = lc.value
  const ch = cH.value, cv = cV.value
  const total  = totalCells.value
  const offset = startOffset.value
  const n0     = p.value.n_start ?? 0

  const raw = []

  // Coin TL : bisectrice entre haut(180°) et gauche(90°) → 135°
  raw.push({ isCorner: true, corner: 'TL', x: 0, y: 0, textRot: 135 })

  // Bord haut (gauche → droite)
  // textRot 180° : haut du chiffre pointe vers le bas = vers le centre
  for (let i = 0; i < t; i++)
    raw.push({ isCorner: false, x: (i + 1) * ch, y: 0, textRot: 180 })

  // Coin TR : bisectrice entre haut(180°) et droite(270°) → 225°
  raw.push({ isCorner: true, corner: 'TR', x: (t + 1) * ch, y: 0, textRot: 225 })

  // Bord droit (haut → bas)
  // textRot 270° : haut du chiffre pointe vers la gauche = vers le centre
  for (let i = 0; i < l; i++)
    raw.push({ isCorner: false, x: (t + 1) * ch, y: (i + 1) * cv, textRot: 270 })

  // Coin BR : bisectrice entre droite(270°) et bas(0°/360°) → 315°
  raw.push({ isCorner: true, corner: 'BR', x: (t + 1) * ch, y: (l + 1) * cv, textRot: 315 })

  // Bord bas (droite → gauche, sens horaire)
  // textRot 0° : haut du chiffre pointe vers le haut = vers le centre
  for (let i = 0; i < t; i++)
    raw.push({ isCorner: false, x: (t - i) * ch, y: (l + 1) * cv, textRot: 0 })

  // Coin BL : bisectrice entre bas(0°) et gauche(90°) → 45°
  raw.push({ isCorner: true, corner: 'BL', x: 0, y: (l + 1) * cv, textRot: 45 })

  // Bord gauche (bas → haut, sens horaire)
  // textRot 90° : haut du chiffre pointe vers la droite = vers le centre
  for (let i = 0; i < l; i++)
    raw.push({ isCorner: false, x: 0, y: (l - i) * cv, textRot: 90 })

  // Assignation des numéros (décalage de startCorner)
  return raw.map((cell, idx) => ({
    ...cell,
    idx,
    n:  n0 + ((idx - offset + total) % total),
    cx: cell.x + ch / 2,
    cy: cell.y + cv / 2,
  }))
})

// Séparation pour le rendu en deux passes (coins au-dessus)
const straightCells = computed(() => allCells.value.filter(c => !c.isCorner))
const cornerCells   = computed(() => allCells.value.filter(c =>  c.isCorner))

// ── Styles (mm → unités SVG) ──────────────────────────────────────
const fontSz = computed(() => (p.value.fontSize    || 2.5) * SCALE)
const bw     = computed(() => (p.value.borderWidth || 0.2) * SCALE)
</script>
