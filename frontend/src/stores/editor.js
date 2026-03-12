import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api } from '@/utils/api.js'
import { BACKGROUND_ATOM_TYPES } from '@/atoms/index.js'

// Nombre max d'entrées dans l'historique undo. 0 = illimité (retour jusqu'au début de session).
const MAX_HISTORY = 0

export const useEditorStore = defineStore('editor', () => {
  // === State ===
  const layout = ref(null)
  const loading = ref(false)
  const dirty = ref(false)
  const saving = ref(false)
  const mode = ref('layout') // 'layout' | 'component'

  // === Undo history ===
  const history = ref([]) // snapshots de layout.value.definition

  // Selection
  const selectedElementId = ref(null)
  const selectedLayerId = ref(null)
  const activeCellIdx = ref(null) // index de la case CardTrack active (édition par case)

  // Canvas
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const snapGrid = ref(1) // mm
  const showGrid = ref(true)
  // 'fit' | '1:1' | null — EditorCanvas écoute et exécute le calcul (accès container)
  const requestFit = ref(null)

  // Preview mode (with card instance data)
  const previewData = ref(null) // null = edit mode, {} = preview with data

  // Cache des composants référencés dans le layout courant { [id]: compDef }
  const componentsCache = ref({})

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
    const bg = []
    const rest = []
    for (const layer of layers.value) {
      if (!layer.visible) continue
      for (const el of (layer.elements || [])) {
        const item = { ...el, _layerId: layer.id, _layerLocked: layer.locked, _layerOpacity: layer.opacity ?? 1 }
        if (el.type === 'atom' && BACKGROUND_ATOM_TYPES.has(el.atomType)) bg.push(item)
        else rest.push(item)
      }
    }
    return [...bg, ...rest]   // fond toujours en premier (z-order le plus bas)
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

  // === Undo ===
  function _snapshot() {
    if (!layout.value) return
    history.value.push(JSON.parse(JSON.stringify(layout.value.definition)))
    if (MAX_HISTORY > 0 && history.value.length > MAX_HISTORY) {
      history.value.shift()
    }
  }

  const canUndo = computed(() => history.value.length > 0)

  function undo() {
    if (!history.value.length || !layout.value) return
    layout.value.definition = history.value.pop()
    dirty.value = true
  }

  // === Actions ===
  async function loadLayout(id) {
    loading.value = true
    mode.value = 'layout'
    try {
      layout.value = await api.getLayout(id)
      dirty.value = false
      history.value = []
      selectedElementId.value = null
      selectedLayerId.value = layers.value[0]?.id || null
      requestFit.value = 'fit'
      // Pré-charger les composants référencés dans le layout
      await _preloadComponents()
    } finally {
      loading.value = false
    }
  }

  async function _preloadComponents() {
    const ids = new Set()
    for (const layer of layers.value) {
      for (const el of (layer.elements || [])) {
        if (el.type === 'component' && el.componentId) ids.add(el.componentId)
      }
    }
    const missing = [...ids].filter(id => !componentsCache.value[id])
    if (!missing.length) return
    const results = await Promise.allSettled(missing.map(id => api.getComponent(id)))
    for (let i = 0; i < missing.length; i++) {
      if (results[i].status === 'fulfilled') {
        componentsCache.value[missing[i]] = results[i].value
      }
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
      history.value = []
      selectedElementId.value = null
      selectedLayerId.value = 'default'
      requestFit.value = 'fit'
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

  // Réinitialise la case active quand l'élément sélectionné change
  watch(selectedElementId, () => { activeCellIdx.value = null })

  function markDirty() {
    dirty.value = true
  }

  // Layer operations
  function addLayer(name) {
    _snapshot()
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
      _snapshot()
      layout.value.definition.layers.splice(idx, 1)
      if (selectedLayerId.value === id) {
        selectedLayerId.value = layers.value[0]?.id || null
      }
      markDirty()
    }
  }

  function reorderLayers(fromIdx, toIdx) {
    _snapshot()
    const arr = layout.value.definition.layers
    const [item] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, item)
    markDirty()
  }

  function updateLayer(id, updates) {
    const layer = layout.value.definition.layers.find(l => l.id === id)
    if (layer) {
      _snapshot()
      Object.assign(layer, updates)
      markDirty()
    }
  }

  // Trouve le fond de carte existant dans n'importe quel calque
  const backgroundElement = computed(() => {
    for (const layer of layers.value) {
      const bg = layer.elements?.find(e => e.type === 'atom' && BACKGROUND_ATOM_TYPES.has(e.atomType))
      if (bg) return bg
    }
    return null
  })

  // Element operations
  function addElement(layerId, element) {
    const layer = layout.value.definition.layers.find(l => l.id === layerId)
    if (!layer) return
    _snapshot()

    // Les fonds couvrent toujours la totalité du layout, position (0,0), sans rotation
    if (element.type === 'atom' && BACKGROUND_ATOM_TYPES.has(element.atomType)) {
      element = {
        ...element,
        x_mm:      0,
        y_mm:      0,
        width_mm:  layout.value.width_mm,
        height_mm: layout.value.height_mm,
        rotation:  0,
      }
    }

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
    // Charger le composant en cache si nécessaire
    if (el.type === 'component' && el.componentId && !componentsCache.value[el.componentId]) {
      api.getComponent(el.componentId).then(comp => {
        componentsCache.value[el.componentId] = comp
      }).catch(() => {})
    }
    return el
  }

  // noHistory: true pour les updates en continu (drag/resize) — snapshot géré en amont
  function updateElement(elementId, updates, { noHistory = false } = {}) {
    for (const layer of layout.value.definition.layers) {
      const el = layer.elements?.find(e => e.id === elementId)
      if (el) {
        if (!noHistory) _snapshot()
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
        _snapshot()
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
        _snapshot()
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
    _snapshot()
    if (!layout.value.definition.dataSchema) layout.value.definition.dataSchema = {}
    layout.value.definition.dataSchema[name] = { type, default: '' }
    markDirty()
  }

  function removeSchemaField(name) {
    _snapshot()
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
    selectedElementId, selectedLayerId, activeCellIdx, backgroundElement,
    zoom, panX, panY, snapGrid, showGrid, requestFit,
    previewData,
    componentsCache,
    definition, layers, activeLayer, selectedElement, allElements, dataSchema, bindingNames,
    mode,
    history, canUndo, undo, _snapshot,
    loadLayout, loadComponent, saveDefinition, markDirty,
    addLayer, removeLayer, reorderLayers, updateLayer,
    addElement, updateElement, removeElement, duplicateElement,
    addSchemaField, removeSchemaField,
    snap, _preloadComponents
  }
})
