<template>
  <svg
    width="100%"
    height="100%"
    :viewBox="`0 0 ${svgW} ${svgH}`"
    preserveAspectRatio="xMinYMin meet"
    overflow="visible"
  >
    <g v-for="cell in cells" :key="`path-cell-${cell.idx}`">
      <rect
        :x="sv(cell.x)"
        :y="sv(cell.y)"
        :width="sv(cell.w)"
        :height="sv(cell.h)"
        :fill="params.bgColor || '#2a3050'"
      />
      <image
        v-if="cell.texture"
        :href="`/uploads/${cell.texture.mediaId}`"
        :x="sv(cell.x)"
        :y="sv(cell.y)"
        :width="sv(cell.w)"
        :height="sv(cell.h)"
        preserveAspectRatio="xMidYMid meet"
        :opacity="textureOpacity(cell)"
        :transform="`rotate(${cell.coin},${sv(cell.cx)},${sv(cell.cy)})`"
      />
      <text
        :x="sv(cell.cx)"
        :y="sv(cell.cy)"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="params.textColor || '#ffffff'"
        :font-size="fontSize"
        :font-family="params.fontFamily || 'Outfit'"
        font-weight="600"
      >{{ cell.n }}</text>
      <rect
        v-if="selected && cell.idx === activeCellIdx"
        :x="sv(cell.x)"
        :y="sv(cell.y)"
        :width="sv(cell.w)"
        :height="sv(cell.h)"
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
import { buildTrakPathCells } from '@/utils/trakPathLayout.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: { type: Number, default: 55 },
  height_mm: { type: Number, default: 25 },
  selected: { type: Boolean, default: false },
  printMode: { type: Boolean, default: false },
})

const SCALE = 10
const store = useEditorStore()
const { byLogicalId } = useTrackTextures()

const svgW = computed(() => sv(props.width_mm))
const svgH = computed(() => sv(props.height_mm))
const fontSize = computed(() => sv(props.params.fontSize || 2.5))
const activeCellIdx = computed(() => store.activeCellIdx)
const cells = computed(() => buildTrakPathCells({
  segments: props.params.segments,
  cellSize: props.params.cellSize ?? 0.1,
  n_start: props.params.n_start ?? 0,
  cellOverrides: props.params.cellOverrides || {},
  texturesById: byLogicalId.value,
  width_mm: props.width_mm,
  height_mm: props.height_mm,
}).cells)

function sv(mm) {
  return mm * SCALE
}

function textureOpacity(cell) {
  return cell.textureSource === 'system' && !props.printMode ? 0.35 : 1
}
</script>
