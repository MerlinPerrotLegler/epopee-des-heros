<template>
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMidYMid meet"
    overflow="visible"
  >
    <g v-for="cell in cellLayouts" :key="`bg-${cell.n}-${cell.idx}`">
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
    </g>
    <image
      v-for="cell in texturedCells"
      :key="`img-${cell.n}-${cell.idx}`"
      :href="`/uploads/${cell.texture.mediaId}`"
      :x="sv(cell.image.x)" :y="sv(cell.image.y)"
      :width="sv(cell.image.w)" :height="sv(cell.image.h)"
      preserveAspectRatio="none"
      :opacity="textureOpacity(cell)"
      :transform="`rotate(${cell.coin},${sv(cell.cx)},${sv(cell.cy)})`"
    />
    <g v-for="cell in cellLayouts" :key="`fg-${cell.n}-${cell.idx}`">
      <text
        :x="sv(textPos(cell).x)" :y="sv(textPos(cell).y)"
        :text-anchor="textPos(cell).textAnchor"
        :dominant-baseline="textPos(cell).dominantBaseline"
        :fill="params.textColor || '#ffffff'"
        :font-size="fontSizePx"
        :font-family="params.fontFamily || 'Outfit'"
        font-weight="600"
      >{{ cell.text }}</text>
      <rect
        v-if="selected && cell.idx === activeCellIdx"
        :x="sv(cell.x)" :y="sv(cell.y)"
        :width="sv(cell.w)" :height="sv(cell.h)"
        fill="none"
        stroke="#facc15"
        :stroke-width="2"
        pointer-events="none"
      />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { useTrackTextures } from '@/composables/useTrackTextures.js'
import { buildTrakCells } from '@/utils/trakLayout.js'
import { cellTextLayout } from '@/utils/trackCellText.js'

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

const isVertical = computed(() => p.value.direction === 'vertical')

const SCALE = 10
function sv(mm) { return mm * SCALE }

const fontSizePx = computed(() => sv(p.value.fontSize || 2.5))
const cellLayouts = computed(() => buildTrakCells({
  params: p.value,
  width_mm: props.width_mm,
  height_mm: props.height_mm,
  texturesById: byLogicalId.value,
}))
const texturedCells = computed(() => cellLayouts.value.filter((cell) => cell.texture))

// Le viewBox reste celui de la boîte logique de l'atome : 1 mm SVG reste
// 1 mm physique. Les images plus grandes débordent sans être remises à
// l'échelle dans la boîte.
const svgW = computed(() => sv(props.width_mm))
const svgH = computed(() => sv(props.height_mm))

function textureOpacity(cell) {
  return cell.textureSource === 'system' && !props.printMode ? 0.35 : 1
}

function textPos(cell) {
  return cellTextLayout(cell, p.value.cellTextAlign, {
    insetMm: (p.value.fontSize || 2.5) * 0.2,
  })
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
