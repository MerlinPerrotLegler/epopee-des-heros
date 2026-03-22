<template>
  <div class="editor-panel">
    <!-- Tab navigation -->
    <div class="panel-tabs">
      <button
        v-for="tab in tabs" :key="tab.id"
        class="panel-tab" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- Layers Tab -->
    <div v-if="activeTab === 'layers'" class="panel-content">
      <LayerPanel />
    </div>

    <!-- Add Elements Tab -->
    <div v-if="activeTab === 'add'" class="panel-content">
      <div class="panel-section">
        <div class="panel-section-title">Atomes</div>
        <div class="atom-palette">
          <button
            v-for="(atom, type) in ATOM_TYPES" :key="type"
            class="atom-btn"
            @click="addAtom(type)"
            draggable="true"
            @dragstart="onAtomDragStart($event, type)"
            :title="atom.label"
          >
            <span class="atom-icon">{{ atom.icon }}</span>
            <span class="atom-label">{{ atom.label }}</span>
          </button>
        </div>
      </div>

      <div class="panel-section" v-if="components.length">
        <div class="panel-section-title">Composants</div>
        <div class="component-list">
          <button
            v-for="comp in components" :key="comp.id"
            class="component-btn"
            @click="addComponent(comp)"
            draggable="true"
            @dragstart="onComponentDragStart($event, comp)"
          >
            <span>◧</span>
            <span>{{ comp.name }}</span>
            <span class="comp-size" v-if="comp.width_mm">{{ comp.width_mm }}×{{ comp.height_mm }}</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Properties Tab -->
    <div v-if="activeTab === 'props'" class="panel-content">
      <PropertiesPanel />
    </div>

    <!-- Data Binding Tab -->
    <div v-if="activeTab === 'data'" class="panel-content">
      <DataPanel />
    </div>

    <!-- Global Config Tab -->
    <div v-if="activeTab === 'config'" class="panel-content">
      <ConfigPanel />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { ATOM_TYPES, getAtomDefaults } from '@/atoms/index.js'
import { api } from '@/utils/api.js'
import LayerPanel from './LayerPanel.vue'
import PropertiesPanel from './PropertiesPanel.vue'
import DataPanel from './DataPanel.vue'
import ConfigPanel from './ConfigPanel.vue'

const store = useEditorStore()

const tabs = [
  { id: 'layers', label: 'Calques' },
  { id: 'add', label: 'Ajouter' },
  { id: 'props', label: 'Propriétés' },
  { id: 'data', label: 'Data' },
  { id: 'config', label: 'Config' },
]

const activeTab = ref('layers')
const components = ref([])

onMounted(async () => {
  components.value = await api.getComponents()
})

// Auto-switch to props when element selected
watch(() => store.selectedElementId, (id) => {
  if (id) activeTab.value = 'props'
})

function addAtom(type) {
  const defaults = getAtomDefaults(type)
  store.addElement(defaults)
}

function addComponent(comp) {
  store.addElement({
    type: 'component',
    componentId: comp.id,
    width_mm: comp.width_mm || 30,
    height_mm: comp.height_mm || 20,
    params: {}
  })
}

function onAtomDragStart(e, type) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/x-card-designer-add', JSON.stringify({
    kind: 'atom',
    atomType: type,
  }))
}

function onComponentDragStart(e, comp) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('application/x-card-designer-add', JSON.stringify({
    kind: 'component',
    componentId: comp.id,
    width_mm: comp.width_mm || 30,
    height_mm: comp.height_mm || 20,
  }))
}

</script>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.panel-tab {
  flex: 1;
  padding: 8px 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.panel-tab:hover { color: var(--text-secondary); }
.panel-tab.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.atom-palette {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.atom-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.atom-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.atom-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.atom-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.component-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.component-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent-primary);
  color: var(--text-primary);
}

.comp-size {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
}
</style>
