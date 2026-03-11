<template>
  <div class="gse">

    <!-- ── Barre de prévisualisation + marqueurs ── -->
    <div
      class="gse-bar"
      ref="barRef"
      :style="{ background: previewCss }"
      @click="onBarClick"
    >
      <div
        v-for="(stop, i) in stops" :key="i"
        class="gse-marker"
        :class="{ active: selected === i }"
        :style="{ left: stop.pos + '%', background: stop.color }"
        @click.stop="selected = i"
        @mousedown.stop="startDrag($event, i)"
      />
    </div>

    <!-- ── Stop sélectionné ── -->
    <div v-if="selected !== null" class="gse-selected">
      <div class="gse-row">
        <ColorPickerAlpha
          :model-value="stops[selected]?.color ?? null"
          @update:model-value="updateColor(selected, $event)"
          class="gse-cpa"
        />
        <input
          type="number"
          :value="stops[selected]?.pos ?? 0"
          @input="updatePos(selected, +$event.target.value)"
          min="0" max="100" step="1"
          class="gse-pos"
        />
        <span class="gse-unit">%</span>
        <button class="gse-del" :disabled="stops.length <= 2" @click="removeStop(selected)" title="Supprimer">✕</button>
      </div>
    </div>

    <!-- ── Liste résumée de tous les arrêts ── -->
    <div class="gse-list">
      <div
        v-for="(stop, i) in stops" :key="i"
        class="gse-list-item"
        :class="{ active: selected === i }"
        @click="selected = i"
      >
        <span class="gse-swatch" :style="{ background: stop.color }" />
        <span class="gse-list-color">{{ stop.color }}</span>
        <span class="gse-list-pos">{{ stop.pos }}%</span>
      </div>
      <button class="gse-add" @click="addStop">+ Arrêt</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ColorPickerAlpha from './ColorPickerAlpha.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  gradientType: { type: String, default: 'linear' }, // for preview only
  angle:  { type: Number, default: 135 },
  posX:   { type: Number, default: 50 },
  posY:   { type: Number, default: 50 },
  shape:  { type: String, default: 'ellipse' },
})
const emit = defineEmits(['update:modelValue'])

const barRef  = ref(null)
const selected = ref(0)

const stops = computed(() => [...props.modelValue].sort((a, b) => a.pos - b.pos))

function emit_(newStops) {
  // keep original array order but updated values
  emit('update:modelValue', newStops)
}

const previewCss = computed(() => {
  const s = stops.value.map(s => `${s.color} ${s.pos}%`).join(', ')
  if (props.gradientType === 'radial') {
    return `radial-gradient(${props.shape} at ${props.posX}% ${props.posY}%, ${s})`
  }
  return `linear-gradient(${props.angle}deg, ${s})`
})

function updateColor(idx, color) {
  const arr = props.modelValue.map((s, i) => i === idx ? { ...s, color } : s)
  emit_(arr)
}

function updatePos(idx, pos) {
  const clamped = Math.max(0, Math.min(100, pos))
  const arr = props.modelValue.map((s, i) => i === idx ? { ...s, pos: clamped } : s)
  emit_(arr)
  // keep selected on the same stop content
  const newIdx = arr.findIndex(s => s === arr[idx])
  selected.value = idx
}

function addStop() {
  // Insert at midpoint between last two stops
  const sorted = [...props.modelValue].sort((a, b) => a.pos - b.pos)
  const last = sorted[sorted.length - 1]
  const prev = sorted[sorted.length - 2]
  const newPos = Math.round((last.pos + prev.pos) / 2)
  const newStop = { color: last.color, pos: newPos }
  const arr = [...props.modelValue, newStop]
  emit_(arr)
  selected.value = arr.length - 1
}

function removeStop(idx) {
  if (props.modelValue.length <= 2) return
  const arr = props.modelValue.filter((_, i) => i !== idx)
  emit_(arr)
  selected.value = Math.min(idx, arr.length - 1)
}

// Click on bar to add stop at that position
function onBarClick(e) {
  if (!barRef.value) return
  const rect = barRef.value.getBoundingClientRect()
  const pos  = Math.round(((e.clientX - rect.left) / rect.width) * 100)
  // interpolate color at that position
  const sorted = [...props.modelValue].sort((a, b) => a.pos - b.pos)
  let color = sorted[0].color
  for (let i = 0; i < sorted.length - 1; i++) {
    if (pos >= sorted[i].pos && pos <= sorted[i + 1].pos) {
      color = sorted[i].color  // simplification: use left stop color
      break
    }
  }
  const arr = [...props.modelValue, { color, pos }]
  emit_(arr)
  selected.value = arr.length - 1
}

// Drag stop marker along the bar
function startDrag(e, idx) {
  selected.value = idx
  const onMove = (ev) => {
    if (!barRef.value) return
    const rect = barRef.value.getBoundingClientRect()
    const pos  = Math.max(0, Math.min(100, Math.round(((ev.clientX - rect.left) / rect.width) * 100)))
    const arr  = props.modelValue.map((s, i) => i === idx ? { ...s, pos } : s)
    emit_(arr)
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.gse { display: flex; flex-direction: column; gap: 6px; }

/* Gradient bar */
.gse-bar {
  position: relative;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border-default);
  cursor: crosshair;
  user-select: none;
}

.gse-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
  cursor: grab;
  transition: transform 80ms;
}
.gse-marker.active {
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 0 2px var(--accent-primary);
}
.gse-marker:active { cursor: grabbing; }

/* Selected stop row */
.gse-selected { padding: 4px 0; }
.gse-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.gse-cpa {
  flex: 1;
  min-width: 0;
}
.gse-pos {
  width: 44px;
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 4px;
  text-align: right;
}
.gse-unit {
  font-size: 10px;
  color: var(--text-muted);
}
.gse-del {
  background: none;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 5px;
}
.gse-del:hover:not(:disabled) { color: #ef4444; border-color: #ef4444; }
.gse-del:disabled { opacity: 0.3; cursor: not-allowed; }

/* Stop list */
.gse-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 120px;
  overflow-y: auto;
}
.gse-list-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
}
.gse-list-item:hover { background: var(--bg-hover); }
.gse-list-item.active { background: var(--bg-tertiary); }
.gse-swatch {
  width: 12px; height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.2);
  flex-shrink: 0;
}
.gse-list-color { flex: 1; font-family: var(--font-mono); color: var(--text-muted); }
.gse-list-pos { font-family: var(--font-mono); color: var(--text-muted); }
.gse-add {
  background: none;
  border: 1px dashed var(--border-default);
  border-radius: 3px;
  color: var(--text-muted);
  font-size: 10px;
  padding: 3px 8px;
  cursor: pointer;
  text-align: center;
  margin-top: 2px;
}
.gse-add:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
</style>
