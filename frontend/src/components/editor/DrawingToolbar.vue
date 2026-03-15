<template>
  <div class="drawing-toolbar" @mousedown.stop @pointerdown.stop>
    <button
      v-for="(pen, i) in pens"
      :key="i"
      class="pen-btn"
      :class="{ active: activePenIdx === i }"
      :title="pen.name"
      @click.stop="emit('select-pen', i)"
    >
      <span class="pen-nib" :style="{ color: pen.color }">✒</span>
      <span class="pen-name">{{ pen.name }}</span>
    </button>

    <div class="toolbar-sep" />

    <button class="tool-btn" title="Effacer le dernier trait (Ctrl+Z)" @click.stop="emit('erase-last')">
      ✕ Effacer
    </button>
    <button class="tool-btn done-btn" title="Terminer le dessin (Échap)" @click.stop="emit('done')">
      ✓ Terminer
    </button>
  </div>
</template>

<script setup>
defineProps({
  pens:         { type: Array,  default: () => [] },
  activePenIdx: { type: Number, default: 0 },
})
const emit = defineEmits(['select-pen', 'erase-last', 'done'])
</script>

<style scoped>
.drawing-toolbar {
  position: absolute;
  top: -38px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--bg-secondary, #1e2235);
  border: 1px solid var(--accent-primary, #6c7aff);
  border-radius: 6px;
  padding: 4px 8px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.55);
  z-index: 300;
  white-space: nowrap;
  pointer-events: all;
}

.pen-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  background: none;
  cursor: pointer;
  color: var(--text-secondary, #a0a8c0);
  font-size: 10px;
  transition: background 80ms;
}
.pen-btn:hover { background: var(--bg-tertiary, #2a3050); }
.pen-btn.active {
  background: var(--accent-primary, #6c7aff);
  color: #fff;
  border-color: var(--accent-primary, #6c7aff);
}

.pen-nib  { font-size: 12px; }
.pen-name { max-width: 72px; overflow: hidden; text-overflow: ellipsis; }

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: var(--border-subtle, #363d5c);
  margin: 0 3px;
  flex-shrink: 0;
}

.tool-btn {
  padding: 3px 9px;
  border-radius: 4px;
  border: 1px solid var(--border-default, #2a3050);
  background: none;
  cursor: pointer;
  color: var(--text-secondary, #a0a8c0);
  font-size: 10px;
  transition: background 80ms;
}
.tool-btn:hover    { background: var(--bg-tertiary, #2a3050); }
.done-btn          { color: #4ade80; border-color: rgba(74, 222, 128, 0.3); }
.done-btn:hover    { background: rgba(74, 222, 128, 0.15); }
</style>
