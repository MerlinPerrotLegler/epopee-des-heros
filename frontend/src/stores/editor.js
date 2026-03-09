import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api } from '@/utils/api.js'

export const useEditorStore = defineStore('editor', () => {
  // === State ===
  const layout = ref(null)
  const loading = ref(false)
  const dirty = ref(false)
  const saving = ref(false)
  const mode = ref('layout') // 'layout' | 'component'

  // Selection
  const selectedElementId = ref(null)
  const selectedLayerId = ref(null)

  // Canvas
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const snapGrid = ref(1) // mm
  const showGrid = ref(true)

  // Preview mode (with card instance data)
  const previewData = ref(null) // null = edit mode, {} = preview with data

  // === Computed ===
  const definition = computed(() => layout.value?.definition || { layers: [], dataSchema: {} })

  const layers = computed(() => definition.value.layers || [])

  const activeLayer = computed(() => {
    if (!selectedLayerId.value && layers.value.length) {
      return layers.value[0]
    }
    return layers.value.find(l => l.id === selectedLayerId.value) || null
  })

  const selectedElement = computed(() => {
    if (!selectedElementId.value) return null
    for (const layer of layers.value) {
      const el = layer.elements?.find(e => e.id === selectedElementId.value)
      if (el) return el
    }
    return null
  })

  const allElements = computed(() => {
    const result = []
    for (const layer of layers.value) {
      if (!layer.visible) continue
      for (const el of (layer.elements || [])) {
        result.push({ ...el, _layerId: layer.id, _layerLocked: layer.locked })
      }
    }
    return result
  })

  const dataSchema = computed(() => definition.value.dataSchema || {})

  // Collect all nameInLayout from all elements for data binding
  const bindingNames = computed(() => {
    const names = []
    for (const layer of layers.value) {
      for (const el of (layer.elements || [])) {
        if (el.nameInLayout) names.push(el.nameInLayout)
      }
    }
    return names
  })

  // === Actions ===
  async function loadLayout(id) {
    loading.value = true
    mode.value = 'layout'
    try {
      layout.value = await api.getLayout(id)
      dirty.value = false
      selectedElementId.value = null
      selectedLayerId.value = layers.value[0]?.id || null
    } finally {
      loading.value = false
    }
  }

  async function loadComponent(id) {
    loading.value = true
    mode.value = 'component'
    try {
      const comp = await api.getComponent(id)
      // Wrap elements in a single-layer structure compatible with the canvas
      layout.value = {
        id: comp.id,
        name: comp.name,
        width_mm: comp.width_mm || 60,
        height_mm: comp.height_mm || 40,
        card_type: null,
        definition: {
          layers: [{
            id: 'default',
            name: 'Éléments',
            locked: false,
            visible: true,
            elements: comp.definition?.elements || []
          }],
          dataSchema: {}
        }
      }
      dirty.value = false
      selectedElementId.value = null
      selectedLayerId.value = 'default'
    } finally {
      loading.value = false
    }
  }

  async function saveDefinition() {
    if (!layout.value || !dirty.value) return
    saving.value = true
    try {
      if (mode.value === 'component') {
        // Extract elements from the single layer and save as component definition
        const elements = layers.value[0]?.elements || []
        await api.updateComponent(layout.value.id, {
          width_mm: layout.value.width_mm,
          height_mm: layout.value.height_mm,
          definition: { elements }
        })
      } else {
        await api.updateLayoutDefinition(layout.value.id, layout.value.definition)
      }
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  function markDirty() {
    dirty.value = true
  }

  // Layer operations
  function addLayer(name) {
    const id = crypto.randomUUID()
    layout.value.definition.layers.push({
      id, name: name || `Calque ${layers.value.length + 1}`,
      locked: false, visible: true, elements: []
    })
    selectedLayerId.value = id
    markDirty()
  }

  function removeLayer(id) {
    const idx = layout.value.definition.layers.findIndex(l => l.id === id)
    if (idx > -1) {
      layout.value.definition.layers.splice(idx, 1)
      if (selectedLayerId.value === id) {
        selectedLayerId.value = layers.value[0]?.id || null
      }
      markDirty()
    }
  }

  function reorderLayers(fromIdx, toIdx) {
    const arr = layout.value.definition.layers
    const [item] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, item)
    markDirty()
  }

  function updateLayer(id, updates) {
    const layer = layout.value.definition.layers.find(l => l.id === id)
    if (layer) {
      Object.assign(layer, updates)
      markDirty()
    }
  }

  // Element operations
  function addElement(layerId, element) {
    const layer = layout.value.definition.layers.find(l => l.id === layerId)
    if (!layer) return
    const el = {
      id: crypto.randomUUID(),
      x_mm: 0,
      y_mm: 0,
      width_mm: 20,
      height_mm: 10,
      rotation: 0,
      nameInLayout: '',
      ...element
    }
    layer.elements.push(el)
    selectedElementId.value = el.id
    markDirty()
    return el
  }

  function updateElement(elementId, updates) {
    for (const layer of layout.value.definition.layers) {
      const el = layer.elements?.find(e => e.id === elementId)
      if (el) {
        Object.assign(el, updates)
        markDirty()
        return
      }
    }
  }

  function removeElement(elementId) {
    for (const layer of layout.value.definition.layers) {
      const idx = layer.elements?.findIndex(e => e.id === elementId)
      if (idx > -1) {
        layer.elements.splice(idx, 1)
        if (selectedElementId.value === elementId) selectedElementId.value = null
        markDirty()
        return
      }
    }
  }

  function duplicateElement(elementId) {
    for (const layer of layout.value.definition.layers) {
      const el = layer.elements?.find(e => e.id === elementId)
      if (el) {
        const clone = JSON.parse(JSON.stringify(el))
        clone.id = crypto.randomUUID()
        clone.x_mm += 2
        clone.y_mm += 2
        clone.nameInLayout = clone.nameInLayout ? `${clone.nameInLayout}_copy` : ''
        layer.elements.push(clone)
        selectedElementId.value = clone.id
        markDirty()
        return clone
      }
    }
  }

  // Data schema operations
  function addSchemaField(name, type = 'string') {
    if (!layout.value.definition.dataSchema) layout.value.definition.dataSchema = {}
    layout.value.definition.dataSchema[name] = { type, default: '' }
    markDirty()
  }

  function removeSchemaField(name) {
    delete layout.value.definition.dataSchema[name]
    markDirty()
  }

  // Snap helper
  function snap(value) {
    if (!snapGrid.value) return value
    return Math.round(value / snapGrid.value) * snapGrid.value
  }

  return {
    layout, loading, dirty, saving,
    selectedElementId, selectedLayerId,
    zoom, panX, panY, snapGrid, showGrid,
    previewData,
    definition, layers, activeLayer, selectedElement, allElements, dataSchema, bindingNames,
    mode,
    loadLayout, loadComponent, saveDefinition, markDirty,
    addLayer, removeLayer, reorderLayers, updateLayer,
    addElement, updateElement, removeElement, duplicateElement,
    addSchemaField, removeSchemaField,
    snap
  }
})
