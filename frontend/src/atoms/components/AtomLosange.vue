<template>
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${w} ${h}`"
    preserveAspectRatio="none"
  >
    <polygon
      :points="points"
      :fill="fill"
      :stroke="stroke"
      :stroke-width="sw"
      stroke-linejoin="miter"
      :opacity="params.opacity ?? 1"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { diamondPoints, pointsAttr, strokeInset } from '@/utils/shapePoints.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
})

const w = computed(() => Number(props.width_mm) || 1.6)
const h = computed(() => Number(props.height_mm) || 1.6)
const sw = computed(() => Math.max(0, Number(props.params.strokeWidth) || 0))
const fill = computed(() => props.params.fill || 'transparent')
const stroke = computed(() => {
  if (sw.value <= 0) return 'none'
  return props.params.color || '#1a1a1a'
})
const points = computed(() => pointsAttr(
  strokeInset(w.value, h.value, sw.value, diamondPoints),
))
</script>
