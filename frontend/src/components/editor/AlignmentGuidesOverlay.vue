<template>
  <svg
    class="alignment-guides"
    :width="mmCss(widthMm)"
    :height="mmCss(heightMm)"
    :viewBox="`0 0 ${widthMm} ${heightMm}`"
  >
    <template v-for="(g, i) in guides" :key="i">
      <!-- frames -->
      <rect
        v-if="g.kind === 'frame'"
        :x="g.x_mm" :y="g.y_mm"
        :width="g.width_mm" :height="g.height_mm"
        fill="none"
        stroke="var(--accent-primary)"
        stroke-opacity="0.35"
        stroke-width="0.15"
        stroke-dasharray="1 0.8"
      />
      <!-- lines: active=solid, centre proche=dashed, bord proche=dotted (épaisseurs en mm) -->
      <line
        v-else-if="g.kind === 'line' && g.axis === 'x'"
        :x1="g.position_mm" y1="0"
        :x2="g.position_mm" :y2="heightMm"
        :stroke="lineColor(g)"
        :stroke-width="g.strong ? 0.35 : 0.15"
        :stroke-dasharray="lineDash(g)"
        stroke-opacity="0.9"
      />
      <line
        v-else-if="g.kind === 'line' && g.axis === 'y'"
        x1="0" :y1="g.position_mm"
        :x2="widthMm" :y2="g.position_mm"
        :stroke="lineColor(g)"
        :stroke-width="g.strong ? 0.35 : 0.15"
        :stroke-dasharray="lineDash(g)"
        stroke-opacity="0.9"
      />
      <!-- margins -->
      <g v-else-if="g.kind === 'margin'">
        <line
          :x1="g.from_mm.x" :y1="g.from_mm.y"
          :x2="g.to_mm.x" :y2="g.to_mm.y"
          :stroke="g.equal ? 'var(--accent-primary)' : 'rgba(108,122,255,0.55)'"
          :stroke-width="g.equal ? 0.35 : 0.15"
        />
        <text
          :x="(g.from_mm.x + g.to_mm.x) / 2"
          :y="(g.from_mm.y + g.to_mm.y) / 2 - 1"
          fill="var(--accent-primary)"
          font-size="2.5"
          font-family="var(--font-mono)"
          text-anchor="middle"
        >{{ g.distance_mm.toFixed(1) }} mm</text>
      </g>
    </template>
  </svg>
</template>

<script setup>
import { mmCss } from '@/utils/cssMm.js'

defineProps({
  guides: { type: Array, default: () => [] },
  widthMm: { type: Number, required: true },
  heightMm: { type: Number, required: true },
})

function lineColor(g) {
  return g.strong ? 'var(--accent-primary)' : 'rgba(108,122,255,0.45)'
}

/** Active → solid ; centre (layout/center) proche → dashed ; bord proche → dotted (mm viewBox) */
function lineDash(g) {
  if (g.strong) return null
  if (g.source === 'edge') return '0.15 0.4' // dotted
  return '0.8 0.5' // dashed (layout + element centers)
}
</script>

<style scoped>
.alignment-guides {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  /* Above selected canvas elements (100) and handles (101); below floating UI panels */
  z-index: 120;
  overflow: visible;
}
</style>
