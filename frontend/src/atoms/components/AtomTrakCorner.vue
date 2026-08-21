<template>
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <rect
      x="0" y="0" :width="svgW" :height="svgH"
      :fill="params.bgColor || '#2a3050'"
    />
    <image
      v-if="params.svgMediaId"
      :href="`/uploads/${params.svgMediaId}`"
      x="0" y="0" :width="svgW" :height="svgH"
      preserveAspectRatio="xMidYMid meet"
    />
    <image
      v-if="texture"
      :href="`/uploads/${texture.mediaId}`"
      :x="img.x" :y="img.y"
      :width="img.w" :height="img.h"
      preserveAspectRatio="none"
      :opacity="textureOpacity"
      :transform="`rotate(${coin},${svgW / 2},${svgH / 2})`"
    />

    <text
      :x="svgW / 2" :y="svgH / 2"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="params.textColor || '#ffffff'"
      :font-size="fontSz"
      font-family="Outfit"
      font-weight="600"
      :transform="`rotate(${params.textRotation ?? 45},${svgW / 2},${svgH / 2})`"
    >{{ cellText }}</text>
    <rect
      v-if="selected && activeCellIdx === 0"
      x="0" y="0" :width="svgW" :height="svgH"
      fill="none"
      stroke="#facc15"
      :stroke-width="2"
      pointer-events="none"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { useTrackTextures } from '@/composables/useTrackTextures.js'
import { textureDrawRect } from '@/utils/trackFootprint.js'
import { resolveTrackCellText } from '@/utils/trackCellText.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  selected:  { type: Boolean, default: false },
  printMode: { type: Boolean, default: false },
})

const store = useEditorStore()
const p = computed(() => props.params)
const { byLogicalId } = useTrackTextures()
const activeCellIdx = computed(() => store.activeCellIdx)

const SCALE = 10
const override = computed(() => p.value.cellOverrides?.[0] || {})
const texture = computed(() => byLogicalId.value[override.value.textureId] || null)
const logicalW = computed(() => props.width_mm || 5)
const logicalH = computed(() => props.height_mm || 5)
const svgW = computed(() => logicalW.value * SCALE)
const svgH = computed(() => logicalH.value * SCALE)
const img = computed(() => {
  const r = textureDrawRect(0, 0, logicalW.value, logicalH.value, texture.value?.margins)
  return {
    x: r.x * SCALE,
    y: r.y * SCALE,
    w: r.w * SCALE,
    h: r.h * SCALE,
  }
})
const fontSz = computed(() => (p.value.fontSize || 2.5) * SCALE)
const coin = computed(() => Number(override.value.coin) || 0)
const cellText = computed(() => resolveTrackCellText(override.value, p.value.n ?? 0))
const textureOpacity = computed(() =>
  override.value.textureSource === 'system' && !props.printMode ? 0.35 : 1)
</script>
