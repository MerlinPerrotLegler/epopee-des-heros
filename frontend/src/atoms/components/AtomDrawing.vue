<template>
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <!-- Stored strokes -->
    <path
      v-for="(stroke, i) in strokes"
      :key="i"
      :d="stroke.d"
      :fill="stroke.color"
      :fill-opacity="stroke.opacity ?? 1"
    />
    <!-- Live preview stroke (being drawn right now) -->
    <path
      v-if="liveStroke && liveStroke.d"
      :d="liveStroke.d"
      :fill="liveStroke.color"
      :fill-opacity="liveStroke.opacity ?? 1"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  params:     { type: Object,  default: () => ({}) },
  width_mm:   Number,
  height_mm:  Number,
  zoom:       { type: Number,  default: 1 },
  liveStroke: { type: Object,  default: null },  // { d, color, opacity }
})

// 1 mm = 10 SVG units (same SCALE as all other SVG atoms)
const SCALE = 10

const svgW = computed(() => (props.width_mm  || 40) * SCALE)
const svgH = computed(() => (props.height_mm || 20) * SCALE)

const strokes = computed(() => props.params.strokes || [])
</script>
