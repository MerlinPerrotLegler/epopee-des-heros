<template>
  <!--
    AtomTrakCorner — Case de coin pour une piste (track).

    Forme : rectangle (identique aux cases droites adjacentes).
    Seul le texte est incliné à `textRotation` degrés (défaut 45°).

    Un SVG personnalisé peut être placé derrière via svgMediaId.

    Props params:
      n            {number}  Numéro affiché (défaut 0)
      bgColor      {string}  Fond (défaut '#2a3050')
      textColor    {string}  Texte (défaut '#ffffff')
      fontSize     {number}  Taille texte en mm (défaut 2.5)
      borderColor  {string}  Bordure (défaut '#6c7aff')
      borderWidth  {number}  Épaisseur bordure en mm (défaut 0.2)
      svgMediaId   {string}  ID media d'un SVG décoratif de fond (optionnel)
      textRotation {number}  Rotation du texte en degrés (défaut 45)
                             CardTrack injecte 135/225/315/45 selon le coin.
  -->
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- SVG décoratif optionnel (derrière) -->
    <image
      v-if="params.svgMediaId"
      :href="`/uploads/${params.svgMediaId}`"
      x="0" y="0" width="100" height="100"
      preserveAspectRatio="xMidYMid meet"
    />

    <!-- Rectangle de fond (même forme que les cases droites) -->
    <rect
      x="0" y="0" width="100" height="100"
      :fill="params.bgColor     || '#2a3050'"
      :stroke="params.borderColor || '#6c7aff'"
      :stroke-width="borderW"
    />

    <!-- Numéro incliné à textRotation° -->
    <text
      x="50" y="50"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="params.textColor || '#ffffff'"
      :font-size="fontSz"
      font-family="Outfit"
      font-weight="600"
      :transform="`rotate(${params.textRotation ?? 45}, 50, 50)`"
    >{{ params.n ?? 0 }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})

// viewBox 0-100 ; on met fontSize et borderWidth à l'échelle
const vbScale = computed(() => 100 / Math.max(props.width_mm || 5, 0.1))
const fontSz  = computed(() => (props.params.fontSize    || 2.5) * vbScale.value)
const borderW = computed(() => (props.params.borderWidth || 0.2) * vbScale.value)
</script>
