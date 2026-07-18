<template>
  <!--
    AtomTrakCorner — Case de coin pour une piste (track).
    Bordures sélectives (haut/droite/bas/gauche) + traits de plume optionnels.
  -->
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <image
      v-if="params.svgMediaId"
      :href="`/uploads/${params.svgMediaId}`"
      x="0" y="0" width="100" height="100"
      preserveAspectRatio="xMidYMid meet"
    />

    <rect
      x="0" y="0" width="100" height="100"
      :fill="params.bgColor || '#2a3050'"
      :stroke="cellStroke"
      :stroke-width="cellStrokeW"
    />

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

    <g v-if="!penEnabled" pointer-events="none">
      <line
        v-for="(s, i) in plainLines"
        :key="`line-${i}`"
        :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2"
        :stroke="borderColor"
        :stroke-width="borderW"
      />
    </g>

    <g v-if="penEnabled" pointer-events="none">
      <path
        v-for="(stroke, i) in strokePaths"
        :key="`pen-${i}`"
        :d="stroke.d"
        :fill="penColor"
        stroke="none"
      />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import {
  buildStrokePool,
  buildOuterBorders,
  variantToPath,
  pickVariant,
} from '@/utils/cardTrackStrokes.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
})

const p = computed(() => props.params)

const vbScale = computed(() => 100 / Math.max(props.width_mm || 5, 0.1))
const fontSz  = computed(() => (p.value.fontSize || 2.5) * vbScale.value)
const borderW = computed(() => (p.value.borderWidth || 0.2) * vbScale.value)
const borderColor = computed(() => p.value.borderColor || '#6c7aff')

const penEnabled = computed(() => p.value.penStyle === true)
const penColor = computed(() => p.value.penColor || borderColor.value)
const penHalfWidthSVG = computed(() => (p.value.penWidth ?? 0.4) / 2 * vbScale.value)

const borderSides = computed(() => ({
  top:    p.value.borderTop    !== false,
  right:  p.value.borderRight  !== false,
  bottom: p.value.borderBottom !== false,
  left:   p.value.borderLeft   !== false,
}))

const useSelectiveBorders = computed(() => {
  const s = borderSides.value
  return !(s.top && s.right && s.bottom && s.left)
})

const cellStroke = computed(() =>
  penEnabled.value || useSelectiveBorders.value ? 'none' : borderColor.value
)
const cellStrokeW = computed(() =>
  penEnabled.value || useSelectiveBorders.value ? 0 : borderW.value
)

const outerBorders = computed(() => buildOuterBorders(100, 100, borderSides.value))

const plainLines = computed(() => {
  if (penEnabled.value || !useSelectiveBorders.value) return []
  return outerBorders.value
})

const strokePool = computed(() =>
  penEnabled.value
    ? buildStrokePool(p.value.penPoolSize ?? 4, p.value.penSeed ?? 1)
    : []
)

const strokePaths = computed(() => {
  if (!penEnabled.value) return []
  const seed = p.value.penSeed ?? 1
  return outerBorders.value.map((sep, i) => {
    const variant = pickVariant(strokePool.value, seed, sep.pairIdx + i * 17)
    if (!variant) return null
    return {
      d: variantToPath(sep.x1, sep.y1, sep.x2, sep.y2, variant, penHalfWidthSVG.value),
    }
  }).filter(Boolean)
})
</script>
