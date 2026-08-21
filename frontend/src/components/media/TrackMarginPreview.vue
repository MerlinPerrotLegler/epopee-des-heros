<template>
  <div class="plus-preview" role="img" :aria-label="ariaLabel">
    <div
      class="plus-stage"
      :style="{ aspectRatio: `${layout.viewW} / ${layout.viewH}` }"
    >
      <div
        v-for="tile in layout.tiles"
        :key="`img-${tile.key}`"
        class="plus-tile"
        :class="{ center: tile.key === 'c' }"
        :style="boxStyle(tile.x, tile.y, tile.w, tile.h, tile.key === 'c' ? 2 : 1)"
      >
        <img :src="src" :alt="tile.key === 'c' ? 'Tuile centrale' : `Voisin ${tile.key}`" />
      </div>
      <div
        v-for="tile in layout.tiles"
        :key="`cell-${tile.key}`"
        class="plus-cell"
        :class="{ center: tile.key === 'c' }"
        :style="boxStyle(tile.logicalX, tile.logicalY, 1, 1, 3)"
      />
    </div>
    <p class="plus-hint">Aperçu en + — une tuile au centre et une de chaque côté pour juger les joints.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { plusTilePreviewLayout } from '@/utils/trackFootprint.js'

const props = defineProps({
  filename: { type: String, default: '' },
  originalName: { type: String, default: '' },
  margins: { type: Object, default: () => ({ left: 0, right: 0, top: 0, bottom: 0 }) },
})

const src = computed(() => props.filename ? `/uploads/${props.filename}` : '')
const layout = computed(() => plusTilePreviewLayout(props.margins))
const ariaLabel = computed(() =>
  `Aperçu orthogonal de ${props.originalName || 'la tuile'} avec voisins nord, ouest, est et sud`)

function pct(value, total) {
  if (!(total > 0)) return '0%'
  return `${(value / total) * 100}%`
}

function boxStyle(x, y, w, h, z) {
  return {
    left: pct(x, layout.value.viewW),
    top: pct(y, layout.value.viewH),
    width: pct(w, layout.value.viewW),
    height: pct(h, layout.value.viewH),
    zIndex: z,
  }
}
</script>

<style scoped>
.plus-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}
.plus-stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius-md);
  background-color: #b0b0b0;
  background-image:
    linear-gradient(45deg, #888 25%, transparent 25%),
    linear-gradient(-45deg, #888 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #888 75%),
    linear-gradient(-45deg, transparent 75%, #888 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}
.plus-tile,
.plus-cell {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
}
.plus-tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.plus-tile.center {
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.35));
}
.plus-cell {
  border: 1px dashed rgba(255, 255, 255, 0.28);
}
.plus-cell.center {
  border-color: var(--accent-primary);
  border-style: solid;
  border-width: 1.5px;
}
.plus-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-muted);
  text-align: center;
}
</style>
