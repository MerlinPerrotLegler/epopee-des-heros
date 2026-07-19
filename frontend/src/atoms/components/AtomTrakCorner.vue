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
      x="0" y="0" :width="svgW" :height="svgH"
      preserveAspectRatio="xMidYMid meet"
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
    >{{ params.n ?? 0 }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useTrackTextures } from '@/composables/useTrackTextures.js'
import { cellFootprintMm } from '@/utils/trackFootprint.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  printMode: { type: Boolean, default: false },
})

const p = computed(() => props.params)
const { byLogicalId } = useTrackTextures()

const SCALE = 10
const override = computed(() => p.value.cellOverrides?.[0] || {})
const texture = computed(() => byLogicalId.value[override.value.textureId] || null)
const footprint = computed(() => cellFootprintMm(
  props.width_mm || 5,
  props.height_mm || 5,
  texture.value?.margins,
))
const svgW = computed(() => footprint.value.w * SCALE)
const svgH = computed(() => footprint.value.h * SCALE)
const fontSz = computed(() => (p.value.fontSize || 2.5) * SCALE)
const coin = computed(() => Number(override.value.coin) || 0)
const textureOpacity = computed(() =>
  override.value.textureSource === 'system' && !props.printMode ? 0.35 : 1)
</script>
