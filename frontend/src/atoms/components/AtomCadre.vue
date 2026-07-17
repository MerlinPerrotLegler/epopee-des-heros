<template>
  <!--
    AtomCadre — Cadre calligraphique (mêmes tiers/seed que le séparateur) + titre optionnel.
    Titre : fontSize en % de la hauteur du layout en cours.
  -->
  <div class="cadre-root">
    <svg
      class="cadre-svg"
      width="100%"
      height="100%"
      :viewBox="`0 0 ${svgW} ${svgH}`"
      preserveAspectRatio="none"
      overflow="visible"
    >
      <rect
        v-if="bgFill"
        :x="pad"
        :y="pad"
        :width="Math.max(0, svgW - pad * 2)"
        :height="Math.max(0, svgH - pad * 2)"
        :fill="bgFill"
        :opacity="params.bgOpacity ?? 1"
      />
      <g
        v-for="(stroke, i) in paths"
        :key="i"
        :transform="stroke.transform"
      >
        <path
          :d="stroke.d"
          :fill="strokeColor"
          :fill-opacity="stroke.opacity"
        />
      </g>
    </svg>

    <div
      v-if="showTitle && titleText"
      class="cadre-title"
      :style="titleStyle"
    >{{ titleText }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { buildFramePaths, estimateTitleGapWidth } from '@/utils/frameStrokes.js'
import { useAtomScale } from './useAtomScale.js'
import { useLayoutRelativeFontMm } from './useLayoutRelativeFont.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  { type: Number, default: 50 },
  height_mm: { type: Number, default: 20 },
  zoom:      { type: Number, default: 1 },
})

const { mmToPx } = useAtomScale(props)

const SCALE = 10

const svgW = computed(() => (props.width_mm  || 50) * SCALE)
const svgH = computed(() => (props.height_mm || 20) * SCALE)

const tier  = computed(() => props.params.tier  || 'basic')
const seed  = computed(() => props.params.seed  ?? 42)
const strokeColor = computed(() => props.params.color || '#6c7aff')
const bgFill = computed(() => props.params.bgColor || null)
const pad = computed(() => Math.max(2, Math.min(svgW.value, svgH.value) * 0.02))

const titleText = computed(() => String(props.params.title ?? '').trim())
const showTitle = computed(() => props.params.showTitle !== false)

// fontSize = % de la hauteur du layout en cours
const fontSizeMm = useLayoutRelativeFontMm(computed(() => props.params.fontSize ?? 2.8))
const fontSizeSvg = computed(() => fontSizeMm.value * SCALE)

const titleGapWidth = computed(() => {
  if (!showTitle.value || !titleText.value) return 0
  return estimateTitleGapWidth(titleText.value, fontSizeSvg.value)
})

const paths = computed(() =>
  buildFramePaths(svgW.value, svgH.value, tier.value, seed.value, {
    titleGapWidth: titleGapWidth.value,
    titleCenterX: svgW.value / 2,
  })
)

const titleStyle = computed(() => {
  const align = props.params.titleAlign || 'center'
  return {
    fontSize: `${mmToPx(fontSizeMm.value)}px`,
    fontFamily: props.params.fontFamily || 'inherit',
    fontWeight: props.params.fontWeight ?? 600,
    color: props.params.titleColor || props.params.color || 'inherit',
    textAlign: align,
    top: `${mmToPx(Math.max(0.1, fontSizeMm.value * 0.06))}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: `${mmToPx(Math.max(8, titleGapWidth.value / SCALE))}px`,
    padding: `0 ${mmToPx(0.8)}px`,
    background: props.params.titleBgColor || 'transparent',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
})
</script>

<style scoped>
.cadre-root {
  width: 100%;
  height: 100%;
  position: relative;
  box-sizing: border-box;
  overflow: visible;
}
.cadre-svg {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
}
.cadre-title {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  box-sizing: border-box;
}
</style>
