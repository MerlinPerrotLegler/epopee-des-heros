<template>
  <div class="layer-panel">
    <div class="panel-section">
      <div class="panel-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Calques</span>
        <button class="btn-icon btn-sm" @click="store.addLayer()" title="Nouveau calque">+</button>
      </div>

      <div class="layer-list">
        <div
          v-for="(layer, idx) in reversedLayers" :key="layer.id"
          class="layer-item"
          :class="{ active: store.selectedLayerId === layer.id }"
          @click="store.selectedLayerId = layer.id"
        >
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
}

.layer-item:hover { background: var(--bg-hover); }
.layer-item.active { background: var(--bg-tertiary); }

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
