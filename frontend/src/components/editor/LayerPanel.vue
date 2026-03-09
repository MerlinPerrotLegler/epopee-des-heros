<template>
  <div class="layer-panel">
    <div class="panel-section">
      <div class="panel-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Calques</span>
        <button class="btn-icon btn-sm" @click="store.addLayer()" title="Nouveau calque">+</button>
      </div>

      <div
        class="layer-list"
        @dragover.prevent="onListDragOver"
        @drop.prevent="onListDrop"
      >
        <div
          v-for="(layer, idx) in reversedLayers" :key="layer.id"
          class="layer-item"
          :class="{
            active: store.selectedLayerId === layer.id,
            'drag-over': dragOverIdx === idx,
          }"
          draggable="true"
          @dragstart="onDragStart($event, idx)"
          @dragend="onDragEnd"
          @dragover.prevent="dragOverIdx = idx"
          @dragleave="dragOverIdx = null"
          @drop.prevent="onDrop(idx)"
          @click="store.selectedLayerId = layer.id"
        >
          <!-- Drag handle -->
          <span class="layer-drag-handle" title="Réordonner">⋮⋮</span>

          <button
            class="btn-icon btn-sm"
            @click.stop="store.updateLayer(layer.id, { visible: !layer.visible })"
            :title="layer.visible ? 'Masquer' : 'Afficher'"
          >{{ layer.visible ? '◉' : '○' }}</button>

          <span
            class="layer-name"
            v-if="editingId !== layer.id"
            @dblclick="startRename(layer)"
          >{{ layer.name }}</span>
          <input
            v-else
            ref="renameInput"
            class="layer-name-input"
            v-model="editName"
            @blur="finishRename(layer)"
            @keydown.enter="finishRename(layer)"
            @keydown.escape="editingId = null"
          />

          <!-- Opacity badge — drag left/right to change -->
          <span
            class="layer-opacity"
            :title="`Opacité : ${Math.round((layer.opacity ?? 1) * 100)}%\nGlisser gauche/droite pour modifier`"
            @mousedown.stop="startOpacityDrag($event, layer)"
          >{{ Math.round((layer.opacity ?? 1) * 100) }}%</span>

          <button
            class="btn-icon btn-sm"
            @click.stop="store.updateLayer(layer.id, { locked: !layer.locked })"
            :title="layer.locked ? 'Déverrouiller' : 'Verrouiller'"
          >{{ layer.locked ? '🔒' : '🔓' }}</button>

          <button
            class="btn-icon btn-sm"
            @click.stop="store.removeLayer(layer.id)"
            title="Supprimer"
            v-if="store.layers.length > 1"
          >✕</button>
        </div>
      </div>
    </div>

    <!-- Layer elements list -->
    <div class="panel-section" v-if="store.activeLayer">
      <div class="panel-section-title">Éléments du calque</div>
      <div class="element-list" v-if="layerElements.length">
        <div
          v-for="el in layerElements" :key="el.id"
          class="element-item"
          :class="{ active: store.selectedElementId === el.id }"
          @click="store.selectedElementId = el.id"
        >
          <span class="el-type">{{ getTypeIcon(el) }}</span>
          <span class="el-name">{{ el.nameInLayout || getTypeLabel(el) }}</span>
          <span class="el-pos">{{ el.x_mm.toFixed(0) }},{{ el.y_mm.toFixed(0) }}</span>
          <button class="btn-icon btn-sm" @click.stop="store.duplicateElement(el.id)" title="Dupliquer">⧉</button>
          <button class="btn-icon btn-sm" @click.stop="store.removeElement(el.id)" title="Supprimer">✕</button>
        </div>
      </div>
      <div v-else class="empty-hint">Aucun élément. Allez dans "Ajouter".</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { ATOM_TYPES } from '@/atoms/index.js'

const store = useEditorStore()
const editingId = ref(null)
const editName = ref('')

const reversedLayers = computed(() => [...store.layers].reverse())

const layerElements = computed(() => {
  return store.activeLayer?.elements || []
})

function getTypeIcon(el) {
  if (el.type === 'atom' && ATOM_TYPES[el.atomType]) return ATOM_TYPES[el.atomType].icon
  if (el.type === 'component') return '◧'
  if (el.type === 'molecule') return '◬'
  return '?'
}

function getTypeLabel(el) {
  if (el.type === 'atom' && ATOM_TYPES[el.atomType]) return ATOM_TYPES[el.atomType].label
  if (el.type === 'component') return `Composant`
  if (el.type === 'molecule') return `Molécule`
  return 'Élément'
}

function startRename(layer) {
  editingId.value = layer.id
  editName.value = layer.name
  nextTick(() => {
    const input = document.querySelector('.layer-name-input')
    if (input) input.focus()
  })
}

function finishRename(layer) {
  if (editName.value.trim()) {
    store.updateLayer(layer.id, { name: editName.value.trim() })
  }
  editingId.value = null
}

// ── Drag & drop reorder ─────────────────────────────────────────────────────
// reversedLayers is a visual reversal — index 0 in reversedLayers = last real layer
// We convert: realIdx = (layers.length - 1) - reversedIdx

const dragSrcIdx  = ref(null)  // index in reversedLayers
const dragOverIdx = ref(null)

function onDragStart(e, reversedIdx) {
  dragSrcIdx.value = reversedIdx
  e.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  dragSrcIdx.value = null
  dragOverIdx.value = null
}

function onListDragOver(e) {
  e.preventDefault()
}

function onListDrop(e) {
  // handled by individual item @drop
}

function onDrop(reversedTargetIdx) {
  if (dragSrcIdx.value === null || dragSrcIdx.value === reversedTargetIdx) {
    onDragEnd()
    return
  }
  const n = store.layers.length
  const fromReal = (n - 1) - dragSrcIdx.value
  const toReal   = (n - 1) - reversedTargetIdx
  store.reorderLayers(fromReal, toReal)
  onDragEnd()
}

// ── Per-layer opacity drag ──────────────────────────────────────────────────
function startOpacityDrag(e, layer) {
  e.preventDefault()
  const startX  = e.clientX
  const startOp = layer.opacity ?? 1

  const onMove = (ev) => {
    const delta  = (ev.clientX - startX) / 150  // 150px = full range
    const newOp  = Math.max(0, Math.min(1, startOp + delta))
    store.updateLayer(layer.id, { opacity: Math.round(newOp * 100) / 100 })
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
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  border: 1px solid transparent;
}

.layer-item:hover { background: var(--bg-hover); }
.layer-item.active { background: var(--bg-tertiary); }
.layer-item.drag-over { border-color: var(--accent-primary); background: rgba(108,122,255,0.08); }

.layer-drag-handle {
  font-size: 10px;
  color: var(--text-muted);
  cursor: grab;
  flex-shrink: 0;
  line-height: 1;
  letter-spacing: -1px;
  padding: 0 2px;
  user-select: none;
}
.layer-drag-handle:active { cursor: grabbing; }

.layer-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-name-input {
  flex: 1;
  font-size: 12px;
  padding: 1px 4px;
}

.layer-opacity {
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  cursor: ew-resize;
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid var(--border-subtle);
  user-select: none;
  flex-shrink: 0;
  min-width: 28px;
  text-align: center;
}
.layer-opacity:hover { color: var(--accent-primary); border-color: var(--accent-primary); }

.element-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 11px;
  transition: background var(--transition-fast);
}

.element-item:hover { background: var(--bg-hover); }
.element-item.active { background: var(--bg-active); }

.el-type {
  width: 18px;
  text-align: center;
  flex-shrink: 0;
  font-size: 12px;
}

.el-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}

.el-pos {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.empty-hint {
  font-size: 11px;
  color: var(--text-muted);
  padding: 8px;
}
</style>
