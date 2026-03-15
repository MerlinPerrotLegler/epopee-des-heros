<template>
  <!--
    AtomSeparator — Séparateur calligraphique à la plume, 5 niveaux d'ornementation.

    Props params:
      tier      {string}  'basic' | 'rare' | 'epic' | 'mythique' | 'legendaire'
      color     {string}  Couleur de remplissage (défaut '#6c7aff')
      seed      {number}  Seed pour la variation déterministe (défaut 42)
      direction {string}  'horizontal' | 'vertical' (défaut 'horizontal')
  -->
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <g :transform="groupTransform">
      <path
        v-for="(stroke, i) in paths"
        :key="i"
        :d="stroke.d"
        :fill="color"
        :fill-opacity="stroke.opacity"
      />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { buildSeparatorPaths } from '@/utils/separatorStrokes.js'

const props = defineProps({
  params:    { type: Object,  default: () => ({}) },
  width_mm:  { type: Number,  default: 40 },
  height_mm: { type: Number,  default: 4 },
  zoom:      { type: Number,  default: 1 },
})

const SCALE = 10

const isVertical = computed(() => props.params.direction === 'vertical')

// Dimensions SVG de la viewBox (identiques aux mm × 10)
const svgW = computed(() => (props.width_mm  || 40) * SCALE)
const svgH = computed(() => (props.height_mm || 4)  * SCALE)

// Pour un séparateur vertical, on génère les paths en mode horizontal
// avec les dimensions échangées, puis on applique une rotation SVG.
const pathW = computed(() => isVertical.value ? svgH.value : svgW.value)
const pathH = computed(() => isVertical.value ? svgW.value : svgH.value)

// Transform qui fait pivoter les paths horizontaux pour les rendre verticaux :
//   translate(0, pathW) rotate(-90) — mappe (px,py) → (py, pathW-px)
//   ce qui fait courir le trait de haut en bas dans la viewBox.
const groupTransform = computed(() =>
  isVertical.value
    ? `translate(0, ${pathW.value}) rotate(-90)`
    : undefined
)

const tier  = computed(() => props.params.tier  || 'basic')
const color = computed(() => props.params.color || '#6c7aff')
const seed  = computed(() => props.params.seed  || 42)

const paths = computed(() =>
  buildSeparatorPaths(pathW.value, pathH.value, tier.value, seed.value)
)
</script>
