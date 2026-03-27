<template>
  <div class="carac-wrap" :style="wrapStyle">
    <!-- SVG derrière -->
    <img v-if="params.svgMediaId && params.svgPosition === 'behind'"
      :src="`/uploads/${params.svgMediaId}`" class="carac-overlay" />

    <!-- Texte (sans fond coloré — couleur du type de stat ou textColor) -->
    <div class="carac-rect" :style="rectStyle">
      <span v-if="params.modifier" class="carac-modifier">{{ params.modifier }}&nbsp;</span>
      <span class="carac-stat">{{ stat }}</span>
      <span v-if="params.threshold" class="carac-threshold">&nbsp;&gt;{{ params.threshold }}</span>
    </div>

    <!-- SVG devant -->
    <img v-if="params.svgMediaId && params.svgPosition === 'front'"
      :src="`/uploads/${params.svgMediaId}`" class="carac-overlay carac-overlay-front" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'
import { STAT_TYPES, FONT_FAMILY } from '@/atoms/index.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)

const stat = computed(() => (props.params.stat || 'FOR').toUpperCase().slice(0, 3))
const effectiveFontMm = computed(() => Number(props.params.fontSize || 3))
const wrapStyle = computed(() => ({
  // Hauteur pilotée par la taille de police pour garder un rendu cohérent
  height: `${Math.max(1, mmToPx(effectiveFontMm.value * 1.35))}px`,
}))

const rectStyle = computed(() => ({
  background: 'transparent',
  color: props.params.textColor ?? STAT_TYPES[props.params.stat]?.color ?? '#1a1a2e',
  fontSize: `${mmToPx(effectiveFontMm.value)}px`,
  fontFamily: props.params.fontFamily || FONT_FAMILY,
  fontWeight: props.params.fontWeight || 700,
}))
</script>

<style scoped>
.carac-wrap {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-start;
}

.carac-rect {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1.1;
  padding: 0 0.2em;
  user-select: none;
  box-sizing: border-box;
}

.carac-modifier {
  font-size: 0.75em;
  font-weight: 600;
  opacity: 0.9;
}

.carac-stat {
  font-size: 1em;
}

.carac-threshold {
  font-size: 0.75em;
  font-weight: 600;
  opacity: 0.9;
}

.carac-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  z-index: 0;
}

.carac-overlay-front {
  z-index: 2;
}

.carac-rect {
  position: relative;
  z-index: 1;
}
</style>
