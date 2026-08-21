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
      svgMediaId     {string}  SVG décoratif dans les coins (optionnel)
      cellOverrides  {object}  { [idx]: { textureId, coin, textureSource, text, bgColor } }
  -->
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${W} ${H}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <g v-for="cell in cells" :key="`bg-${cell.idx}`">
      <rect
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        :fill="cellBg(cell)"
      />
      <image
        v-if="legacyMediaId(cell)"
        :href="`/uploads/${legacyMediaId(cell)}`"
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
    <image
      v-for="cell in texturedCells"
      :key="`img-${cell.idx}`"
      :href="`/uploads/${cellTexture(cell).mediaId}`"
      :x="sv(imageRect(cell).x)" :y="sv(imageRect(cell).y)"
      :width="sv(imageRect(cell).w)" :height="sv(imageRect(cell).h)"
      preserveAspectRatio="none"
      :opacity="textureOpacity(cell)"
      :transform="`rotate(${cellCoin(cell)},${sv(cell.cx)},${sv(cell.cy)})`"
    />
    <g v-for="cell in cells" :key="`fg-${cell.idx}`">
      <text
        :x="sv(textPos(cell).x)" :y="sv(textPos(cell).y)"
        :text-anchor="textPos(cell).textAnchor"
        :dominant-baseline="textPos(cell).dominantBaseline"
        :fill="p.textColor || '#ffffff'"
        :font-size="fontSz"
        :font-family="p.fontFamily || 'Outfit'" font-weight="600"
        :transform="`rotate(${cell.textRot},${sv(textPos(cell).x)},${sv(textPos(cell).y)})`"
      >{{ cell.text }}</text>
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
import { useTrackTextures }        from '@/composables/useTrackTextures.js'
import {
  buildCardTrackCells,
} from '@/utils/cardTrackLayout.js'
import { textureDrawRect } from '@/utils/trackFootprint.js'
import { cellTextLayout } from '@/utils/trackCellText.js'

const props = defineProps({
  params:    { type: Object,  default: () => ({}) },
  width_mm:  { type: Number,  default: 63 },
  height_mm: { type: Number,  default: 88 },
  selected:  { type: Boolean, default: false },   // passé par AtomRenderer/EditorCanvas
  printMode: { type: Boolean, default: false },
})

const p = computed(() => props.params)
const { byLogicalId } = useTrackTextures()

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
const cells = computed(() =>
  buildCardTrackCells(p.value, props.width_mm, props.height_mm))
const texturedCells = computed(() => cells.value.filter((cell) => cellTexture(cell)))

// ── Surcharges par case ───────────────────────────────────────────────────────
// params.cellOverrides = { "5": { textureId: 2, coin: 90, textureSource: "user" }, ... }
function cellOverride(cell) {
  return p.value.cellOverrides?.[cell.idx] ?? null
}

function textureForIndex(idx) {
  const textureId = p.value.cellOverrides?.[idx]?.textureId
  return byLogicalId.value[textureId] || null
}

function cellTexture(cell) {
  return textureForIndex(cell.idx)
}

function imageRect(cell) {
  return textureDrawRect(cell.x, cell.y, cell.w, cell.h, cellTexture(cell)?.margins)
}

function cellCoin(cell) {
  return Number(cellOverride(cell)?.coin) || 0
}

function textureOpacity(cell) {
  return cellOverride(cell)?.textureSource === 'system' && !props.printMode ? 0.35 : 1
}

function legacyMediaId(cell) {
  return cellOverride(cell)?.svgMediaId || (cell.isCorner ? p.value.svgMediaId : null)
}

function cellBg(cell) {
  return cellOverride(cell)?.bgColor || p.value.bgColor || '#2a3050'
}

function textPos(cell) {
  return cellTextLayout(cell, p.value.cellTextAlign, {
    insetMm: (p.value.fontSize || 2.5) * 0.2,
  })
}

// ── Styles globaux ────────────────────────────────────────────────────────────
const fontSz = computed(() => (p.value.fontSize    || 2.5) * SCALE)
const bw = 2
</script>
