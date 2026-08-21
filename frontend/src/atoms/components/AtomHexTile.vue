<template>
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${w} ${h}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <polygon
      :points="points"
      :fill="params.bgColor || '#2a3050'"
      :stroke="params.borderColor || '#6c7aff'"
      :stroke-width="params.borderWidth || 0.3"
    />
    <text
      :x="w / 2"
      :y="h / 2"
      text-anchor="middle"
      dominant-baseline="middle"
      :fill="params.textColor || '#fff'"
      :font-size="params.fontSize || 2.5"
      font-family="Outfit, sans-serif"
      font-weight="500"
    >{{ params.text }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { hexPolygonPoints } from '@/utils/hexGeometry.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
})

const w = computed(() => Number(props.width_mm) || 10)
const h = computed(() => Number(props.height_mm) || 11.5)
const points = computed(() => hexPolygonPoints(w.value, h.value))
</script>
