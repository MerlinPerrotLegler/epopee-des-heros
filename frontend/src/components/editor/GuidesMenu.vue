<template>
  <div class="guides-menu" ref="rootRef">
    <button type="button" class="btn-zoom btn-sm" :class="{ active: open }" @click="open = !open">
      Guides
    </button>
    <div v-if="open" class="guides-panel">
      <label v-for="opt in OPTIONS" :key="opt.key" class="guides-opt">
        <input
          type="checkbox"
          :checked="store.guideOptions[opt.key]"
          @change="store.setGuideOption(opt.key, $event.target.checked)"
        />
        {{ opt.label }}
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor.js'

const store = useEditorStore()
const open = ref(false)
const rootRef = ref(null)

const OPTIONS = [
  { key: 'layoutCenters', label: 'Centres layout' },
  { key: 'elementEdges', label: 'Bords ↔ éléments' },
  { key: 'elementCenters', label: 'Centres ↔ éléments' },
  { key: 'margins', label: 'Marges' },
  { key: 'frames', label: 'Cadres éléments' },
]

function onDocClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<style scoped>
.guides-menu { position: relative; display: inline-flex; }
.guides-menu .active { outline: 1px solid var(--accent-primary); }
.guides-panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 200;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
}
.guides-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}
</style>
