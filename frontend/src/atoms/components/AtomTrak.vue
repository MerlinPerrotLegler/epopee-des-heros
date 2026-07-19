<template>
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <g v-for="cell in cellLayouts" :key="`cell-${cell.n}-${cell.idx}`">
      <polygon
        v-if="params.caps && cell.idx === 0"
        :points="capPoints('start', cell)"
        :fill="params.bgColor || '#2a3050'"
      />
      <polygon
        v-else-if="params.caps && cell.idx === cellLayouts.length - 1"
        :points="capPoints('end', cell)"
        :fill="params.bgColor || '#2a3050'"
      />
      <rect
        v-else
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        :fill="params.bgColor || '#2a3050'"
      />
      <image
        v-if="cell.texture"
        :href="`/uploads/${cell.texture.mediaId}`"
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        preserveAspectRatio="xMidYMid meet"
        :opacity="textureOpacity(cell)"
        :transform="`rotate(${cell.coin},${sv(cell.cx)},${sv(cell.cy)})`"
      />

      <text
        :x="sv(cell.cx)" :y="sv(cell.cy)"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="params.textColor || '#ffffff'"
        :font-size="fontSizePx"
        :font-family="params.fontFamily || 'Outfit'"
        font-weight="600"
      >{{ cell.n }}</text>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useTrackTextures } from '@/composables/useTrackTextures.js'
import { baseCellSizeMm, cellFootprintMm } from '@/utils/trackFootprint.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  printMode: { type: Boolean, default: false },
})

const p = computed(() => props.params)
const { byLogicalId } = useTrackTextures()

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
function sv(mm) { return mm * SCALE }

const baseSizeMm = computed(() => baseCellSizeMm({
  cellSize: p.value.cellSize ?? 0.1,
  axisLengthMm: isVertical.value ? props.height_mm : props.width_mm,
}))
const fontSizePx = computed(() => sv(p.value.fontSize || 2.5))

const cellLayouts = computed(() => {
  let offset = 0
  return cells.value.map((n, idx) => {
    const override = p.value.cellOverrides?.[idx] || {}
    const texture = byLogicalId.value[override.textureId] || null
    const footprint = cellFootprintMm(
      baseSizeMm.value,
      baseSizeMm.value,
      texture?.margins,
    )
    const x = isVertical.value ? 0 : offset
    const y = isVertical.value ? offset : 0
    offset += isVertical.value ? footprint.h : footprint.w
    return {
      idx,
      n,
      x,
      y,
      w: footprint.w,
      h: footprint.h,
      cx: x + footprint.w / 2,
      cy: y + footprint.h / 2,
      texture,
      coin: Number(override.coin) || 0,
      textureSource: override.textureSource,
    }
  })
})

const svgW = computed(() => sv(isVertical.value
  ? Math.max(0, ...cellLayouts.value.map((cell) => cell.w))
  : cellLayouts.value.reduce((sum, cell) => sum + cell.w, 0)))
const svgH = computed(() => sv(isVertical.value
  ? cellLayouts.value.reduce((sum, cell) => sum + cell.h, 0)
  : Math.max(0, ...cellLayouts.value.map((cell) => cell.h))))

function textureOpacity(cell) {
  return cell.textureSource === 'system' && !props.printMode ? 0.35 : 1
}

function capPoints(side, cell) {
  const x = sv(cell.x)
  const y = sv(cell.y)
  const w = sv(cell.w)
  const h = sv(cell.h)
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
</script>
