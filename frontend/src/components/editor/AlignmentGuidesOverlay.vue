<template>
  <svg
    class="alignment-guides"
    :width="mmToPx(widthMm)"
    :height="mmToPx(heightMm)"
  >
    <template v-for="(g, i) in guides" :key="i">
      <!-- frames -->
      <rect
        v-if="g.kind === 'frame'"
        :x="mmToPx(g.x_mm)" :y="mmToPx(g.y_mm)"
        :width="mmToPx(g.width_mm)" :height="mmToPx(g.height_mm)"
        fill="none"
        stroke="var(--accent-primary)"
        stroke-opacity="0.35"
        stroke-width="1"
        stroke-dasharray="4 3"
      />
      <!-- lines -->
      <line
        v-else-if="g.kind === 'line' && g.axis === 'x'"
        :x1="mmToPx(g.position_mm)" y1="0"
        :x2="mmToPx(g.position_mm)" :y2="mmToPx(heightMm)"
        :stroke="lineColor(g)"
        :stroke-width="g.strong ? 2.5 : 1"
        stroke-opacity="0.9"
      />
      <line
        v-else-if="g.kind === 'line' && g.axis === 'y'"
        x1="0" :y1="mmToPx(g.position_mm)"
        :x2="mmToPx(widthMm)" :y2="mmToPx(g.position_mm)"
        :stroke="lineColor(g)"
        :stroke-width="g.strong ? 2.5 : 1"
        stroke-opacity="0.9"
      />
      <!-- margins -->
      <g v-else-if="g.kind === 'margin'">
        <line
          :x1="mmToPx(g.from_mm.x)" :y1="mmToPx(g.from_mm.y)"
          :x2="mmToPx(g.to_mm.x)" :y2="mmToPx(g.to_mm.y)"
          :stroke="g.equal ? 'var(--accent-primary)' : 'rgba(108,122,255,0.55)'"
          :stroke-width="g.equal ? 2 : 1"
        />
        <text
          :x="mmToPx((g.from_mm.x + g.to_mm.x) / 2)"
          :y="mmToPx((g.from_mm.y + g.to_mm.y) / 2) - 4"
          fill="var(--accent-primary)"
          font-size="10"
          font-family="var(--font-mono)"
          text-anchor="middle"
        >{{ g.distance_mm.toFixed(1) }} mm</text>
      </g>
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useMmScale } from '@/composables/useMmScale.js'

const props = defineProps({
  guides: { type: Array, default: () => [] },
  widthMm: { type: Number, required: true },
  heightMm: { type: Number, required: true },
  zoom: { type: Number, default: 1 },
})

const zoomRef = computed(() => props.zoom)
const { mmToPx } = useMmScale(zoomRef)

function lineColor(g) {
  return g.strong ? 'var(--accent-primary)' : 'rgba(108,122,255,0.45)'
}
</script>

<style scoped>
.alignment-guides {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 50;
  overflow: visible;
}
</style>
