<template>
  <!--
    AtomTrak — Piste numérotée droite (track).
    Affiche une rangée de cellules numérotées de n_start à n_end.
    Chaque cellule est un carré (ou rectangle) avec son numéro.
    Les caps (première et dernière cellule) peuvent être des triangles
    rectangles pointant vers l'extérieur si params.caps === true.

    Props params:
      n_start      {number}  Premier numéro affiché (défaut 0)
      n_end        {number}  Dernier numéro affiché (défaut 10)
      direction    {string}  'horizontal' | 'vertical' (défaut 'horizontal')
      cellSize_mm  {number}  Taille d'une cellule en mm (défaut 5)
      bgColor      {string}  Couleur de fond des cellules (défaut '#2a3050')
      textColor    {string}  Couleur du texte (défaut '#ffffff')
      fontSize     {number}  Taille du texte en mm (défaut 2.5)
      borderColor  {string}  Couleur de la bordure (défaut '#6c7aff')
      borderWidth  {number}  Épaisseur de la bordure en mm (défaut 0.2)
      caps         {boolean} Afficher des triangles rectangles aux extrémités (défaut false)
  -->
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <!-- Rendu de chaque cellule -->
    <g v-for="(n, i) in cells" :key="n">
      <!-- Cap gauche/haut (triangle rectangle pointant vers l'extérieur) -->
      <polygon
        v-if="params.caps && i === 0"
        :points="capPoints('start', i)"
        :fill="params.bgColor || '#2a3050'"
        :stroke="params.borderColor || '#6c7aff'"
        :stroke-width="borderPx"
      />
      <!-- Cap droit/bas -->
      <polygon
        v-else-if="params.caps && i === cells.length - 1"
        :points="capPoints('end', i)"
        :fill="params.bgColor || '#2a3050'"
        :stroke="params.borderColor || '#6c7aff'"
        :stroke-width="borderPx"
      />
      <!-- Cellule normale -->
      <rect
        v-else
        :x="cellX(i)" :y="cellY(i)"
        :width="cellW" :height="cellH"
        :fill="params.bgColor || '#2a3050'"
        :stroke="params.borderColor || '#6c7aff'"
        :stroke-width="borderPx"
      />

      <!-- Numéro dans la cellule -->
      <text
        :x="labelX(i)" :y="labelY(i)"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="params.textColor || '#ffffff'"
        :font-size="fontSizePx"
        font-family="Outfit"
        font-weight="600"
      >{{ n }}</text>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 }
})

const { mmToPx } = useAtomScale(props)

// Liste des numéros à afficher
const cells = computed(() => {
  const start = props.params.n_start ?? 0
  const end   = props.params.n_end   ?? 10
  const arr = []
  for (let i = start; i <= end; i++) arr.push(i)
  return arr
})

const isVertical = computed(() => props.params.direction === 'vertical')

// Taille d'une cellule dans l'espace SVG (unité = mm × 10 pour la viewBox)
// On travaille directement en unités SVG calquées sur les mm (×10 pour éviter les sub-pixels).
const SCALE = 10 // 1 mm → 10 SVG units

function toSVG(mm) { return mm * SCALE }

const cellSz = computed(() => toSVG(props.params.cellSize_mm || 5))
const borderPx = computed(() => toSVG(props.params.borderWidth || 0.2))
const fontSizePx = computed(() => toSVG(props.params.fontSize || 2.5))

// Dimensions de la cellule (carrée)
const cellW = computed(() => isVertical.value ? cellSz.value : cellSz.value)
const cellH = computed(() => cellSz.value)

// Viewbox totale
const svgW = computed(() =>
  isVertical.value ? cellSz.value : cellSz.value * cells.value.length
)
const svgH = computed(() =>
  isVertical.value ? cellSz.value * cells.value.length : cellSz.value
)

// Position X du coin gauche de la cellule i
function cellX(i) {
  return isVertical.value ? 0 : i * cellSz.value
}
// Position Y du coin supérieur de la cellule i
function cellY(i) {
  return isVertical.value ? i * cellSz.value : 0
}
// Centre X pour le texte
function labelX(i) {
  return cellX(i) + cellW.value / 2
}
// Centre Y pour le texte
function labelY(i) {
  return cellY(i) + cellH.value / 2
}

// Points du triangle-cap pour la première et la dernière cellule.
// Le triangle rectangle pointe vers l'extérieur de la piste.
function capPoints(side, i) {
  const x = cellX(i)
  const y = cellY(i)
  const w = cellW.value
  const h = cellH.value
  if (!isVertical.value) {
    // Horizontal : cap gauche pointe à gauche, cap droit pointe à droite
    if (side === 'start') {
      // Triangle : pointe à gauche
      return `${x},${y + h / 2} ${x + w},${y} ${x + w},${y + h}`
    } else {
      // Triangle : pointe à droite
      return `${x},${y} ${x + w},${y + h / 2} ${x},${y + h}`
    }
  } else {
    // Vertical : cap haut pointe vers le haut, cap bas vers le bas
    if (side === 'start') {
      return `${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`
    } else {
      return `${x},${y} ${x + w},${y} ${x + w / 2},${y + h}`
    }
  }
}
</script>
