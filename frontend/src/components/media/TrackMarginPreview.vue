<template>
  <div class="plus-preview" role="img" :aria-label="ariaLabel" :style="padVars">
    <div class="plus-stage">
      <div class="plus-grid">
        <div
          v-for="slot in slots"
          :key="slot.key"
          class="plus-slot"
          :class="slot.key"
        >
          <img
            v-if="slot.tile?.filename"
            :src="`/uploads/${slot.tile.filename}`"
            :alt="slot.tile.originalName || slot.key"
            :style="overflowCssVars(slot.tile.margins)"
          />
          <span class="plus-cell" :class="{ center: slot.key === 'c' }" />
        </div>
      </div>
    </div>
    <p class="plus-hint">
      Cases carrées — chaque image garde ses propres marges.
      Le centre est celle que tu édites.
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { overflowCssVars, plusPreviewPad } from '@/utils/trackFootprint.js'

const props = defineProps({
  center: { type: Object, default: () => ({}) },
  neighbors: { type: Object, default: () => ({}) },
})

const slots = computed(() => ([
  { key: 'n', tile: props.neighbors.n || null },
  { key: 'w', tile: props.neighbors.w || null },
  { key: 'c', tile: props.center?.filename ? props.center : null },
  { key: 'e', tile: props.neighbors.e || null },
  { key: 's', tile: props.neighbors.s || null },
]))

const padVars = computed(() => {
  const pad = plusPreviewPad(slots.value.map((slot) => slot.tile))
  return {
    '--pad-l': pad.left,
    '--pad-r': pad.right,
    '--pad-t': pad.top,
    '--pad-b': pad.bottom,
  }
})

const ariaLabel = computed(() =>
  `Aperçu orthogonal de ${props.center?.originalName || 'la tuile'} avec voisins aux marges distinctes`)
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
  padding:
    calc(var(--pad-t) * 33.333%)
    calc(var(--pad-r) * 33.333%)
    calc(var(--pad-b) * 33.333%)
    calc(var(--pad-l) * 33.333%);
  overflow: visible;
}
.plus-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    ". n ."
    "w c e"
    ". s .";
  aspect-ratio: 1;
  overflow: visible;
  background-color: #b0b0b0;
  background-image:
    linear-gradient(45deg, #888 25%, transparent 25%),
    linear-gradient(-45deg, #888 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #888 75%),
    linear-gradient(-45deg, transparent 75%, #888 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
  border-radius: var(--radius-md);
}
.plus-slot {
  position: relative;
  overflow: visible;
  z-index: 1;
}
.plus-slot.n { grid-area: n; }
.plus-slot.w { grid-area: w; }
.plus-slot.c { grid-area: c; z-index: 2; }
.plus-slot.e { grid-area: e; }
.plus-slot.s { grid-area: s; }
.plus-slot img {
  position: absolute;
  left: calc(var(--ml) * -100%);
  top: calc(var(--mt) * -100%);
  width: calc((1 + var(--ml) + var(--mr)) * 100%);
  height: calc((1 + var(--mt) + var(--mb)) * 100%);
  object-fit: fill;
  pointer-events: none;
}
.plus-cell {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 1px dashed rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 3;
}
.plus-cell.center {
  border: 1.5px solid var(--accent-primary);
}
.plus-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-muted);
  text-align: center;
}
</style>
