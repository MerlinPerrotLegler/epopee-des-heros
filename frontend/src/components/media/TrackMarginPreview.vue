<template>
  <div class="plus-preview" role="img" :aria-label="ariaLabel" :style="cssVars">
    <div class="plus-frame">
      <div class="plus-grid">
        <div
          v-for="key in slotKeys"
          :key="key"
          class="plus-slot"
          :class="key"
        >
          <img v-if="src" :src="src" :alt="key === 'c' ? 'Tuile centrale' : `Voisin ${key}`" />
          <span class="plus-cell" :class="{ center: key === 'c' }" />
        </div>
      </div>
    </div>
    <p class="plus-hint">Cases carrées — l’image déborde selon les marges pour juger les joints.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  filename: { type: String, default: '' },
  originalName: { type: String, default: '' },
  margins: { type: Object, default: () => ({ left: 0, right: 0, top: 0, bottom: 0 }) },
})

const slotKeys = ['n', 'w', 'c', 'e', 's']

const src = computed(() => props.filename ? `/uploads/${props.filename}` : '')
const ariaLabel = computed(() =>
  `Aperçu orthogonal de ${props.originalName || 'la tuile'} : cases carrées, image débordante`)

const cssVars = computed(() => {
  const m = props.margins || {}
  const ml = Number(m.left) || 0
  const mr = Number(m.right) || 0
  const mt = Number(m.top) || 0
  const mb = Number(m.bottom) || 0
  return {
    '--ml': ml,
    '--mr': mr,
    '--mt': mt,
    '--mb': mb,
    '--pad-l': Math.max(0, ml),
    '--pad-r': Math.max(0, mr),
    '--pad-t': Math.max(0, mt),
    '--pad-b': Math.max(0, mb),
  }
})
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
.plus-frame {
  display: grid;
  grid-template-columns: var(--pad-l)fr 3fr var(--pad-r)fr;
  grid-template-rows: var(--pad-t)fr 3fr var(--pad-b)fr;
  width: 100%;
  aspect-ratio: 1;
  overflow: visible;
}
.plus-grid {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    ". n ."
    "w c e"
    ". s .";
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
