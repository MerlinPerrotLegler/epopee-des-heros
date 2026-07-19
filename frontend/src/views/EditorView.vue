<template>
  <div class="editor-view" v-if="!store.loading">
    <!-- Toolbar -->
    <EditorToolbar />

    <div class="editor-body">
      <!-- Left Panel: Configuration -->
      <div class="editor-panel-left" :style="{ width: panelWidth + 'px' }">
        <EditorPanel />
      </div>

      <!-- Resize handle -->
      <div class="panel-resizer" @mousedown="startPanelResize"></div>

      <!-- Right: Canvas -->
      <div class="editor-canvas-wrapper" ref="canvasWrapper">
        <EditorCanvas />
      </div>
    </div>
  </div>
  <div v-else class="editor-loading">Chargement…</div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import EditorPanel from '@/components/editor/EditorPanel.vue'
import EditorCanvas from '@/components/editor/EditorCanvas.vue'

const props = defineProps({ id: String })
const store = useEditorStore()
const panelWidth = ref(320)

function isInputFocused() {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!store.readOnly && (store.mode !== 'layout' || store.layoutLockHeld)) {
      store.saveDefinition()
    }
  }

  if (isInputFocused()) return

  if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
    if (store.selectedItemId) {
      e.preventDefault()
      store.duplicateItem(store.selectedItemId)
    }
    return
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedItemId) {
    e.preventDefault()
    store.removeItem(store.selectedItemId)
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    if (store.selectedElementId) {
      e.preventDefault()
      const input = document.querySelector('[data-param-key="text"]')
      if (input) { input.focus(); input.select() }
    }
  }
}

watch(
  () => props.id,
  async (newId, oldId) => {
    if (oldId != null && oldId !== newId) {
      await store.leaveLayoutEditor(oldId)
    }
    if (newId) {
      await store.enterLayoutEditor(newId)
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  store.leaveLayoutEditor(props.id)
})

// Panel resize
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
.panel-resizer:hover {
  background: var(--accent-primary);
}

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
