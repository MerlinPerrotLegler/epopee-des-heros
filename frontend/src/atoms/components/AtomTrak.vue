<template>
  <!--
    AtomTrak — Piste numérotée droite (track).
    Affiche une rangée de cellules numérotées de n_start à n_end.
    Séparateurs / bordures : traits de plume (même moteur que CardTrack)
    ou traits droits selon penStyle + borderTop/Right/Bottom/Left.
  -->
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <!-- Fond des cellules (sans stroke si plume / bordures sélectives) -->
    <g v-for="(n, i) in cells" :key="`cell-${n}-${i}`">
      <polygon
        v-if="params.caps && i === 0"
        :points="capPoints('start', i)"
        :fill="params.bgColor || '#2a3050'"
        :stroke="cellStroke"
        :stroke-width="cellStrokeW"
      />
      <polygon
        v-else-if="params.caps && i === cells.length - 1"
        :points="capPoints('end', i)"
        :fill="params.bgColor || '#2a3050'"
        :stroke="cellStroke"
        :stroke-width="cellStrokeW"
      />
      <rect
        v-else
        :x="cellX(i)" :y="cellY(i)"
        :width="cellW" :height="cellH"
        :fill="params.bgColor || '#2a3050'"
        :stroke="cellStroke"
        :stroke-width="cellStrokeW"
      />

      <text
        :x="labelX(i)" :y="labelY(i)"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="params.textColor || '#ffffff'"
        :font-size="fontSizePx"
        :font-family="params.fontFamily || 'Outfit'"
        font-weight="600"
      >{{ n }}</text>
    </g>

    <!-- Séparateurs + bordures : mode traits droits -->
    <g v-if="!penEnabled" pointer-events="none">
      <line
        v-for="(s, i) in plainLines"
        :key="`line-${i}`"
        :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2"
        :stroke="borderColor"
        :stroke-width="borderPx"
      />
    </g>

    <!-- Séparateurs + bordures : mode plume (fuseaux rempli) -->
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
  buildLinearSeparators,
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

const cells = computed(() => {
  const start = p.value.n_start ?? 0
  const end   = p.value.n_end   ?? 10
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const arr = []
  if (p.value.reverse) {
    for (let i = hi; i >= lo; i--) arr.push(i)
  } else {
    for (let i = lo; i <= hi; i++) arr.push(i)
  }
  return arr
})

const isVertical = computed(() => p.value.direction === 'vertical')

const SCALE = 10
function toSVG(mm) { return mm * SCALE }

const cellSz = computed(() => toSVG(p.value.cellSize_mm || 5))
const borderPx = computed(() => toSVG(p.value.borderWidth || 0.2))
const fontSizePx = computed(() => toSVG(p.value.fontSize || 2.5))
const borderColor = computed(() => p.value.borderColor || '#6c7aff')

const cellW = computed(() => cellSz.value)
const cellH = computed(() => cellSz.value)

const svgW = computed(() =>
  isVertical.value ? cellSz.value : cellSz.value * cells.value.length
)
const svgH = computed(() =>
  isVertical.value ? cellSz.value * cells.value.length : cellSz.value
)

const penEnabled = computed(() => p.value.penStyle === true)
const penColor = computed(() => p.value.penColor || borderColor.value)
const penHalfWidthSVG = computed(() => (p.value.penWidth ?? 0.4) / 2 * SCALE)

// Pas de stroke sur les cellules si plume, ou si on dessine les côtés à part
const cellStroke = computed(() =>
  penEnabled.value || useSelectiveBorders.value ? 'none' : borderColor.value
)
const cellStrokeW = computed(() =>
  penEnabled.value || useSelectiveBorders.value ? 0 : borderPx.value
)

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

function cellX(i) {
  return isVertical.value ? 0 : i * cellSz.value
}
function cellY(i) {
  return isVertical.value ? i * cellSz.value : 0
}
function labelX(i) {
  return cellX(i) + cellW.value / 2
}
function labelY(i) {
  return cellY(i) + cellH.value / 2
}

function capPoints(side, i) {
  const x = cellX(i)
  const y = cellY(i)
  const w = cellW.value
  const h = cellH.value
  if (!isVertical.value) {
    if (side === 'start') {
      return `${x},${y + h / 2} ${x + w},${y} ${x + w},${y + h}`
    }
    return `${x},${y} ${x + w},${y + h / 2} ${x},${y + h}`
  }
  if (side === 'start') {
    return `${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`
  }
  return `${x},${y} ${x + w},${y} ${x + w / 2},${y + h}`
}

const separators = computed(() =>
  buildLinearSeparators(cells.value.length, cellSz.value, isVertical.value)
)

const outerBorders = computed(() =>
  buildOuterBorders(svgW.value, svgH.value, borderSides.value)
)

const allSegments = computed(() => [...separators.value, ...outerBorders.value])

const plainLines = computed(() => {
  if (penEnabled.value) return []
  // Mode classique plein cadre : les rects portent déjà le stroke
  if (!useSelectiveBorders.value) return []
  // Bordures sélectives : séparateurs + côtés activés en traits droits
  return allSegments.value
})

const strokePool = computed(() =>
  penEnabled.value
    ? buildStrokePool(p.value.penPoolSize ?? 4, p.value.penSeed ?? 1)
    : []
)

const strokePaths = computed(() => {
  if (!penEnabled.value) return []
  const seed = p.value.penSeed ?? 1
  return allSegments.value.map((sep, i) => {
    const variant = pickVariant(strokePool.value, seed, sep.pairIdx + i * 17)
    if (!variant) return null
    return {
      d: variantToPath(sep.x1, sep.y1, sep.x2, sep.y2, variant, penHalfWidthSVG.value),
    }
  }).filter(Boolean)
})
</script>
