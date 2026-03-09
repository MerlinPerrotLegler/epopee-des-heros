<template>
  <div class="editor-view" v-if="!store.loading">
    <EditorToolbar />
    <div class="editor-body">
      <div class="editor-panel-left" :style="{ width: panelWidth + 'px' }">
        <EditorPanel />
      </div>
      <div class="panel-resizer" @mousedown="startPanelResize"></div>
      <div class="editor-canvas-wrapper">
        <EditorCanvas />
      </div>
    </div>
  </div>
  <div v-else class="editor-loading">Chargement…</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EditorPanel from '@/components/editor/EditorPanel.vue'
import EditorCanvas from '@/components/editor/EditorCanvas.vue'

const props = defineProps({ id: String })
const store = useEditorStore()
const panelWidth = ref(320)

onMounted(() => {
  store.loadComponent(props.id)
})

function isInputFocused() {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    store.saveDefinition()
  }
  if (e.key === 'Delete' && store.selectedElementId && !isInputFocused()) {
    store.removeElement(store.selectedElementId)
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    if (!isInputFocused() && store.selectedElementId) {
      e.preventDefault()
      const input = document.querySelector('[data-param-key="text"]')
      if (input) { input.focus(); input.select() }
    }
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown))

let resizing = false
function startPanelResize(e) {
  resizing = true
  const startX = e.clientX
  const startW = panelWidth.value
  const onMove = (e) => {
    if (!resizing) return
    panelWidth.value = Math.max(240, Math.min(600, startW + (e.clientX - startX)))
  }
  const onUp = () => {
    resizing = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.editor-panel-left {
  flex-shrink: 0;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-subtle);
  overflow-y: auto;
  overflow-x: hidden;
}
.panel-resizer {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: background var(--transition-fast);
}
.panel-resizer:hover { background: var(--accent-primary); }
.editor-canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--bg-deep);
}
.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}
</style>
