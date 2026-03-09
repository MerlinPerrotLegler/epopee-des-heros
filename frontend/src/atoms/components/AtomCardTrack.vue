<template>
  <!--
    AtomCardTrack — Piste numérotée sur les 4 bords de la carte.

    Le layout est calculé par buildCardTrackCells() dans cardTrackLayout.js.
    TOUTE modification structurelle doit se faire dans cet utilitaire.

    Props params (voir atoms/index.js pour les valeurs par défaut) :
      max            {number}  Cases droites totales, hors 4 coins (défaut 50)
      cells_top      {number}  Override du nombre de cases horizontales (remplace max)
      cells_left     {number}  Override du nombre de cases verticales   (remplace max)
      n_start        {number}  Premier numéro (défaut 0)
      startCorner    {string}  'topLeft'|'topRight'|'bottomRight'|'bottomLeft'
      roundMode      {string}  'round'|'floor'|'ceil' — arrondi de la distribution
      textOrientation {string} 'parallel'|'perpendicular' — orientation du texte
      cornerTextMode  {string} 'bisect'|'parallel'|'perpendicular'|'custom'
      cornerTextAngle {number} Angle absolu pour cornerTextMode === 'custom'
      bgColor        {string}  Fond des cases
      textColor      {string}  Couleur du texte
      fontSize       {number}  Taille du texte en mm
      borderColor    {string}  Couleur de bordure
      borderWidth    {number}  Épaisseur de bordure en mm
      svgMediaId     {string}  SVG décoratif dans les coins (optionnel)
      cellOverrides  {object}  { [idx]: { bgColor?, svgMediaId? } } — surcharges par case
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
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        :fill="cellBg(cell)"
        :stroke="p.borderColor || '#6c7aff'"
        :stroke-width="bw"
      />
      <!-- SVG override au-dessus du fond, sous le numéro -->
      <image
        v-if="cellOverride(cell)?.svgMediaId"
        :href="`/uploads/${cellOverride(cell).svgMediaId}`"
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        preserveAspectRatio="xMidYMid meet"
      />
      <text
        :x="sv(cell.cx)" :y="sv(cell.cy)"
        text-anchor="middle" dominant-baseline="central"
        :fill="p.textColor || '#ffffff'"
        :font-size="fontSz"
        font-family="Outfit" font-weight="600"
        :transform="`rotate(${cell.textRot},${sv(cell.cx)},${sv(cell.cy)})`"
      >{{ cell.n }}</text>
      <!-- Highlight de la case active (édition) -->
      <rect
        v-if="selected && cell.idx === activeCellIdx"
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        fill="none"
        stroke="#facc15"
        :stroke-width="bw * 2"
        pointer-events="none"
      />
    </g>

    <!-- ── Passe 2 : coins (au-dessus des cases droites) ── -->
    <g v-for="cell in cornerCells" :key="`c-${cell.corner}`">
      <!-- SVG décoratif global des coins (+ éventuel override) -->
      <image
        v-if="p.svgMediaId || cellOverride(cell)?.svgMediaId"
        :href="`/uploads/${cellOverride(cell)?.svgMediaId || p.svgMediaId}`"
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        preserveAspectRatio="xMidYMid meet"
      />
      <!-- Rectangle identique aux cases droites -->
      <rect
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        :fill="cellBg(cell)"
        :stroke="p.borderColor || '#6c7aff'"
        :stroke-width="bw"
      />
      <!-- Texte incliné selon cornerTextMode -->
      <text
        :x="sv(cell.cx)" :y="sv(cell.cy)"
        text-anchor="middle" dominant-baseline="central"
        :fill="p.textColor || '#ffffff'"
        :font-size="fontSz"
        font-family="Outfit" font-weight="600"
        :transform="`rotate(${cell.textRot},${sv(cell.cx)},${sv(cell.cy)})`"
      >{{ cell.n }}</text>
      <!-- Highlight coin actif -->
      <rect
        v-if="selected && cell.idx === activeCellIdx"
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        fill="none"
        stroke="#facc15"
        :stroke-width="bw * 2"
        pointer-events="none"
      />
    </g>
  </svg>
</template>

<script setup>
// ──────────────────────────────────────────────────────────────────────────────
// IMPORTANT : la logique de layout est dans src/utils/cardTrackLayout.js.
// Modifier les paramètres structurels (tc, lc, csH, csV) là-bas affecte
// à la fois le rendu SVG et la détection de clic dans EditorCanvas.
// ──────────────────────────────────────────────────────────────────────────────
import { computed }                from 'vue'
import { useEditorStore }          from '@/stores/editor.js'
import { buildCardTrackCells }     from '@/utils/cardTrackLayout.js'

const props = defineProps({
  params:    { type: Object,  default: () => ({}) },
  width_mm:  { type: Number,  default: 63 },
  height_mm: { type: Number,  default: 88 },
  zoom:      { type: Number,  default: 1  },
  selected:  { type: Boolean, default: false },   // passé par AtomRenderer/EditorCanvas
})

const p = computed(() => props.params)

// Lecture de la case active dans le store (pour le highlight)
const store = useEditorStore()
const activeCellIdx = computed(() => store.activeCellIdx)

// ── Unités SVG : 1 mm = SCALE unités viewBox ──────────────────────────────────
const SCALE = 10
const W = computed(() => props.width_mm  * SCALE)
const H = computed(() => props.height_mm * SCALE)

// Convertit mm → unités SVG (×SCALE)
function sv(mm) { return mm * SCALE }

// ── Cellules (via utilitaire partagé) ─────────────────────────────────────────
const cells = computed(() => buildCardTrackCells(p.value, props.width_mm, props.height_mm))

const straightCells = computed(() => cells.value.filter(c => !c.isCorner))
const cornerCells   = computed(() => cells.value.filter(c =>  c.isCorner))

// ── Surcharges par case ───────────────────────────────────────────────────────
// params.cellOverrides = { "5": { bgColor: "#f00", svgMediaId: "abc" }, ... }
function cellOverride(cell) {
  return p.value.cellOverrides?.[cell.idx] ?? null
}

function cellBg(cell) {
  return cellOverride(cell)?.bgColor || p.value.bgColor || '#2a3050'
}

// ── Styles globaux ────────────────────────────────────────────────────────────
const fontSz = computed(() => (p.value.fontSize    || 2.5) * SCALE)
const bw     = computed(() => (p.value.borderWidth || 0.2) * SCALE)
</script>
