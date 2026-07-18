<template>
  <!--
    AtomCadre — Cadre calligraphique (mêmes tiers/seed que le séparateur) + titre optionnel.
    Titre : fontSize en mm physiques.
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
      <g
        v-for="orn in cornerOrnaments"
        :key="orn.key"
        class="cadre-corner"
      >
        <path
          v-if="orn.kind === 'star4' || orn.kind === 'star5'"
          :d="orn.d"
          :fill="strokeColor"
        />
        <circle
          v-else-if="orn.kind === 'circle'"
          :cx="orn.cx"
          :cy="orn.cy"
          :r="orn.r"
          :fill="strokeColor"
        />
        <rect
          v-else-if="orn.kind === 'square'"
          :x="orn.cx - orn.r"
          :y="orn.cy - orn.r"
          :width="orn.r * 2"
          :height="orn.r * 2"
          :fill="strokeColor"
        />
        <polygon
          v-else-if="orn.kind === 'triangle'"
          :points="`${orn.cx},${orn.cy - orn.r} ${orn.cx - orn.r * 0.866},${orn.cy + orn.r * 0.5} ${orn.cx + orn.r * 0.866},${orn.cy + orn.r * 0.5}`"
          :fill="strokeColor"
          :transform="`rotate(${orn.rotationDeg} ${orn.cx} ${orn.cy})`"
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
import { buildCornerOrnaments } from '@/utils/cornerOrnaments.js'
import { mmCss } from '@/utils/cssMm.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  { type: Number, default: 50 },
  height_mm: { type: Number, default: 20 },
})


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

const fontSizeMm = computed(() => Number(props.params.fontSize ?? 2.8))
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

const cornerOrnaments = computed(() => {
  const shape = props.params.cornerShape ?? 'star4'
  const sizeMm = props.params.cornerSize ?? 2
  return buildCornerOrnaments({
    svgW: svgW.value,
    svgH: svgH.value,
    pad: pad.value,
    shape,
    sizeSvg: sizeMm * SCALE,
    corners: {
      TL: props.params.cornerTL !== false,
      TR: props.params.cornerTR !== false,
      BL: props.params.cornerBL !== false,
      BR: props.params.cornerBR !== false,
    },
  })
})

const titleStyle = computed(() => {
  const align = props.params.titleAlign || 'center'
  return {
    fontSize: mmCss(fontSizeMm.value),
    fontFamily: props.params.fontFamily || 'inherit',
    fontWeight: props.params.fontWeight ?? 600,
    color: props.params.titleColor || props.params.color || 'inherit',
    textAlign: align,
    top: mmCss(Math.max(0.1, fontSizeMm.value * 0.06)),
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: mmCss(Math.max(8, titleGapWidth.value / SCALE)),
    padding: `0 ${mmCss(0.8)}`,
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
