import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api, acquireLayoutLock } from '@/utils/api.js'
import { BACKGROUND_ATOM_TYPES } from '@/atoms/index.js'
import { migrateDefinitionSizing, REF_HEIGHT_MM } from '@/utils/migrateSizing.js'
import { computeAlignmentGuides } from '@/utils/alignmentGuides.js'
import { cloneLayerItem } from '@/utils/cloneLayerItem.js'

const MAX_HISTORY = 0
const AUTO_SAVE_DELAY_MS = 1500
const AUTO_SAVE_LS_KEY = 'card-designer:autoSave'

function readAutoSavePref() {
  try {
    const v = localStorage.getItem(AUTO_SAVE_LS_KEY)
    if (v === null) return true // activé par défaut
    return v === '1' || v === 'true'
  } catch {
    return true
  }
}

export const useEditorStore = defineStore('editor', () => {
  // === State ===
  const layout = ref(null)
  const loading = ref(false)
  const dirty = ref(false)
  const saving = ref(false)
  const mode = ref('layout') // 'layout' | 'component'
  /** Sauvegarde automatique (debounce) — activée par défaut */
  const autoSave = ref(readAutoSavePref())
  let autoSaveTimer = null
  /** Incrémenté à chaque modif — évite d’effacer dirty si on a édité pendant le save */
  let editVersion = 0

  /** Édition layout verrouillée par un autre utilisateur (lecture seule) */
  const readOnly = ref(false)
  /** Qui détient le verrou si lecture seule */
  const layoutLockHolder = ref(null)
  /** true si cette session a le verrou (sauvegarde autorisée côté client) */
  const layoutLockHeld = ref(false)
  let lockHeartbeatId = null
  let lockPollId = null

  function assertEditable() {
    return !readOnly.value
  }

  function stopLockTimers() {
    if (lockHeartbeatId) {
      clearInterval(lockHeartbeatId)
      lockHeartbeatId = null
    }
    if (lockPollId) {
      clearInterval(lockPollId)
      lockPollId = null
    }
  }

  // === Undo history ===
  const history = ref([])

  // Selection
  const selectedElementId = ref(null) // canvas selection (element only)
  const selectedItemId    = ref(null) // layers panel selection (element or group)
  const activeCellIdx     = ref(null)

  // Canvas
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const snapGrid = ref(1)
  const showGrid = ref(true)
  const requestFit = ref(null)

  const GUIDE_OPTIONS_KEY = 'card-designer.guideOptions'
  const DEFAULT_GUIDE_OPTIONS = {
    layoutCenters: true,
    elementEdges: true,
    elementCenters: true,
    margins: true,
    frames: true,
  }

  function _loadGuideOptions() {
    try {
      const raw = localStorage.getItem(GUIDE_OPTIONS_KEY)
      if (!raw) return { ...DEFAULT_GUIDE_OPTIONS }
      return { ...DEFAULT_GUIDE_OPTIONS, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULT_GUIDE_OPTIONS }
    }
  }

  const guideOptions = ref(_loadGuideOptions())
  const guidesActive = ref(false)
  const activeGuides = ref([])
  let guidesClearTimer = null

  function setGuideOption(key, value) {
    if (!(key in guideOptions.value)) return
    guideOptions.value = { ...guideOptions.value, [key]: !!value }
    localStorage.setItem(GUIDE_OPTIONS_KEY, JSON.stringify(guideOptions.value))
  }

  function scheduleGuidesClear() {
    clearTimeout(guidesClearTimer)
    guidesClearTimer = setTimeout(() => {
      guidesClearTimer = null
      clearGuides()
    }, 300)
  }

  function refreshGuides(activeEl) {
    clearTimeout(guidesClearTimer)
    guidesClearTimer = null
    if (!assertEditable() || !activeEl) { clearGuides(); return }
    const opts = guideOptions.value
    if (!opts.layoutCenters && !opts.elementEdges && !opts.elementCenters && !opts.margins && !opts.frames) {
      clearGuides()
      return
    }
    const candidates = allElements.value.filter(e =>
      e.id !== activeEl.id && !e._layerLocked
    )
    const layoutW = layout.value?.width_mm || 63
    const layoutH = Number(layout.value?.height_mm) || 88
    activeGuides.value = computeAlignmentGuides({
      active: activeEl,
      candidates,
      layoutW,
      layoutH,
      snapGrid: snapGrid.value || 1,
      options: opts,
    })
    guidesActive.value = true
  }

  function clearGuides() {
    clearTimeout(guidesClearTimer)
    guidesClearTimer = null
    guidesActive.value = false
    activeGuides.value = []
  }

  // Preview
  const previewData = ref(null)

  // Thumbnail capture callback (non-reactive)
  let captureCallback = null

  // Components cache
  const componentsCache = ref({})

  // ── Tree helpers ──────────────────────────────────────────────────────────

  function _findItem(items, id) {
    for (const item of items) {
      if (item.id === id) return item
      if (item.kind === 'group') {
        const found = _findItem(item.children || [], id)
        if (found) return found
      }
    }
    return null
  }

  // Returns the array that directly contains itemId
  function _findParentArray(items, id) {
    for (const item of items) {
      if (item.id === id) return items
      if (item.kind === 'group') {
        const found = _findParentArray(item.children || [], id)
        if (found) return found
      }
    }
    return null
  }

  function _collectAllElements(items, result = []) {
    for (const item of items) {
      if (item.kind === 'group') _collectAllElements(item.children || [], result)
      else result.push(item)
    }
    return result
  }

  // ── Migration (old format: layers[].elements[] → new tree format) ─────────

  function _migrateDefinition(def) {
    if (!def) return { layers: [], dataSchema: {} }
    const layers = def.layers || []
    // Already new format: items have 'kind' field or layers is empty
    if (!layers.length || layers[0].kind !== undefined) return def

    const newLayers = []
    for (const layer of layers) {
      const elements = layer.elements || []
      if (elements.length === 0) continue

      if (elements.length === 1) {
        const el = elements[0]
        newLayers.push({
          ...el,
          kind: 'element',
          name: el.nameInLayout || '',
          locked: layer.locked || false,
          visible: layer.visible !== false,
          opacity: layer.opacity ?? 1,
        })
      } else {
        newLayers.push({
          id: layer.id,
          kind: 'group',
          name: layer.name,
          locked: layer.locked || false,
          visible: layer.visible !== false,
          opacity: layer.opacity ?? 1,
          children: elements.map(el => ({
            ...el,
            kind: 'element',
            name: el.nameInLayout || '',
            locked: false,
            visible: true,
            opacity: 1,
          })),
        })
      }
    }
    return { ...def, layers: newLayers }
  }

  function _applyDefinitionMigrations(def, heightMm) {
    const structural = _migrateDefinition(def)
    const { definition, changed } = migrateDefinitionSizing(
      structural,
      heightMm ?? REF_HEIGHT_MM,
    )
    return { definition, sizingChanged: changed }
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const definition = computed(() => layout.value?.definition || { layers: [], dataSchema: {} })

  const layers = computed(() => definition.value.layers || [])

  const selectedItem = computed(() => {
    if (!selectedItemId.value) return null
    return _findItem(definition.value.layers || [], selectedItemId.value)
  })

  const selectedElement = computed(() => {
    if (!selectedElementId.value) return null
    const item = _findItem(definition.value.layers || [], selectedElementId.value)
    return item?.kind !== 'group' ? item : null
  })

  const allElements = computed(() => {
    const bg = [], rest = []
    function collect(items, parentLocked, parentOpacity) {
      for (const item of items) {
        if (item.visible === false) continue
        const locked  = parentLocked || (item.locked || false)
        const opacity = parentOpacity * (item.opacity ?? 1)
        if (item.kind === 'group') {
          collect(item.children || [], locked, opacity)
        } else {
          const el = { ...item, _layerLocked: locked, _layerOpacity: opacity }
          if (el.type === 'atom' && BACKGROUND_ATOM_TYPES.has(el.atomType)) bg.push(el)
          else rest.push(el)
        }
      }
    }
    collect(definition.value.layers || [], false, 1)
    return [...bg, ...rest]
  })

  const dataSchema = computed(() => definition.value.dataSchema || {})

  const bindingNames = computed(() => {
    const names = []
    function collect(items) {
      for (const item of items) {
        if (item.kind === 'group') collect(item.children || [])
        else if (item.nameInLayout) names.push(item.nameInLayout)
      }
    }
    collect(definition.value.layers || [])
    return names
  })

  const backgroundElement = computed(() => {
    function find(items) {
      for (const item of items) {
        if (item.kind === 'group') { const f = find(item.children || []); if (f) return f }
        else if (item.type === 'atom' && BACKGROUND_ATOM_TYPES.has(item.atomType)) return item
      }
      return null
    }
    return find(definition.value.layers || [])
  })

  // ── Undo ──────────────────────────────────────────────────────────────────

  function _snapshot() {
    if (!layout.value) return
    history.value.push(JSON.parse(JSON.stringify(layout.value.definition)))
    if (MAX_HISTORY > 0 && history.value.length > MAX_HISTORY) history.value.shift()
  }

  const canUndo = computed(() => history.value.length > 0)

  function undo() {
    if (!assertEditable()) return
    if (!history.value.length || !layout.value) return
    layout.value.definition = history.value.pop()
    dirty.value = true
    editVersion += 1
  }

  // ── Load / Save ───────────────────────────────────────────────────────────

  async function enterLayoutEditor(layoutId) {
    stopLockTimers()
    readOnly.value = false
    layoutLockHolder.value = null
    layoutLockHeld.value = false

    let ac
    try {
      ac = await acquireLayoutLock(layoutId)
    } catch (e) {
      console.warn('[editor] acquire lock', e)
      readOnly.value = true
      layoutLockHolder.value = null
      await loadLayout(layoutId)
      return
    }

    if (ac.acquired) {
      layoutLockHeld.value = true
      readOnly.value = false
      lockHeartbeatId = window.setInterval(() => {
        api.heartbeatLayoutLock(layoutId).catch(() => {})
      }, 20_000)
    } else {
      readOnly.value = true
      layoutLockHolder.value = ac.lockedBy || null
      lockPollId = window.setInterval(async () => {
        try {
          const st = await api.getLayoutLock(layoutId)
          if (!st.locked) {
            const again = await acquireLayoutLock(layoutId)
            if (again.acquired) {
              readOnly.value = false
              layoutLockHeld.value = true
              layoutLockHolder.value = null
              if (lockPollId) {
                clearInterval(lockPollId)
                lockPollId = null
              }
              lockHeartbeatId = window.setInterval(() => {
                api.heartbeatLayoutLock(layoutId).catch(() => {})
              }, 20_000)
            }
          } else if (st.holder) {
            layoutLockHolder.value = st.holder
          }
        } catch {
          /* ignore */
        }
      }, 8_000)
    }

    await loadLayout(layoutId)
  }


  async function leaveLayoutEditor(layoutId) {
    cancelAutoSave()
    if (dirty.value && !readOnly.value && (mode.value !== 'layout' || layoutLockHeld.value)) {
      try {
        await saveDefinition()
      } catch (e) {
        console.warn('[editor] flush auto-save on leave', e)
      }
    }
    stopLockTimers()
    if (layoutId && layoutLockHeld.value) {
      try {
        await api.releaseLayoutLock(layoutId)
      } catch {
        /* ignore */
      }
    }
    readOnly.value = false
    layoutLockHolder.value = null
    layoutLockHeld.value = false
  }

  function cancelAutoSave() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function scheduleAutoSave() {
    cancelAutoSave()
    if (!autoSave.value || !dirty.value) return
    if (mode.value === 'layout' && (readOnly.value || !layoutLockHeld.value)) return
    autoSaveTimer = window.setTimeout(() => {
      autoSaveTimer = null
      if (dirty.value && autoSave.value) saveDefinition()
    }, AUTO_SAVE_DELAY_MS)
  }

  function setAutoSave(enabled) {
    autoSave.value = !!enabled
    try {
      localStorage.setItem(AUTO_SAVE_LS_KEY, autoSave.value ? '1' : '0')
    } catch { /* ignore */ }
    if (autoSave.value) scheduleAutoSave()
    else cancelAutoSave()
  }

  watch(dirty, (isDirty) => {
    if (isDirty) scheduleAutoSave()
    else cancelAutoSave()
  })

  watch(autoSave, (on) => {
    if (on) scheduleAutoSave()
    else cancelAutoSave()
  })

  async function loadLayout(id) {
    loading.value = true
    mode.value = 'layout'
    try {
      const raw = await api.getLayout(id)
      const { definition, sizingChanged } = _applyDefinitionMigrations(
        raw.definition,
        raw.height_mm,
      )
      raw.definition = definition
      layout.value = raw
      dirty.value = sizingChanged
      editVersion = 0
      history.value = []
      selectedElementId.value = null
      selectedItemId.value = layers.value[0]?.id || null
      requestFit.value = 'fit'
      await _preloadComponents({ force: true })
    } finally {
      loading.value = false
    }
  }

  /** Met à jour les métadonnées du layout ouvert (nom, dims, type…) sans toucher à la definition. */
  function applyLayoutMeta(meta) {
    if (!layout.value || !meta) return
    const keys = ['name', 'card_type', 'width_mm', 'height_mm', 'is_back', 'back_layout_id', 'shape', 'updated_at']
    for (const k of keys) {
      if (meta[k] !== undefined) layout.value[k] = meta[k]
    }
  }

  async function _preloadComponents({ force = false } = {}) {
    const ids = new Set()
    for (const el of allElements.value) {
      if (el.type === 'component' && el.componentId) ids.add(el.componentId)
    }
    const toLoad = force
      ? [...ids]
      : [...ids].filter(id => !componentsCache.value[id])
    if (!toLoad.length) return
    const results = await Promise.allSettled(toLoad.map(id => api.getComponent(id)))
    const next = { ...componentsCache.value }
    for (let i = 0; i < toLoad.length; i++) {
      if (results[i].status === 'fulfilled') next[toLoad[i]] = results[i].value
    }
    componentsCache.value = next
  }

  function invalidateComponentCache(id) {
    if (!id) {
      componentsCache.value = {}
      return
    }
    if (!componentsCache.value[id]) return
    const next = { ...componentsCache.value }
    delete next[id]
    componentsCache.value = next
  }

  async function loadComponent(id) {
    stopLockTimers()
    readOnly.value = false
    layoutLockHolder.value = null
    layoutLockHeld.value = false
    loading.value = true
    mode.value = 'component'
    try {
      const comp = await api.getComponent(id)
      let def
      if (comp.definition?.layers) {
        def = _migrateDefinition(comp.definition)
      } else if (comp.definition?.elements) {
        // Old flat format
        def = {
          layers: comp.definition.elements.map(el => ({
            ...el,
            kind: 'element',
            name: el.nameInLayout || '',
            locked: false,
            visible: true,
            opacity: 1,
          })),
          dataSchema: {}
        }
      } else {
        def = { layers: [], dataSchema: {} }
      }
      const { definition, sizingChanged } = _applyDefinitionMigrations(
        def,
        comp.height_mm || REF_HEIGHT_MM,
      )
      def = definition
      layout.value = {
        id: comp.id,
        name: comp.name,
        width_mm: comp.width_mm || 60,
        height_mm: comp.height_mm || 40,
        card_type: null,
        definition: def
      }
      dirty.value = sizingChanged
      editVersion = 0
      history.value = []
      selectedElementId.value = null
      selectedItemId.value = null
      requestFit.value = 'fit'
    } finally {
      loading.value = false
    }
  }

  async function saveDefinition() {
    if (!layout.value) return false
    if (!dirty.value) return true
    if (mode.value === 'layout' && (readOnly.value || !layoutLockHeld.value)) return false
    cancelAutoSave()
    const versionAtSave = editVersion
    saving.value = true
    try {
      const thumbnail = captureCallback ? await captureCallback() : null
      if (mode.value === 'component') {
        await api.updateComponent(layout.value.id, {
          width_mm: layout.value.width_mm,
          height_mm: layout.value.height_mm,
          definition: layout.value.definition,
          ...(thumbnail ? { thumbnail } : {})
        })
        // Invalider le cache pour que les layouts rechargent la version à jour
        invalidateComponentCache(layout.value.id)
        componentsCache.value = {
          ...componentsCache.value,
          [layout.value.id]: {
            id: layout.value.id,
            name: layout.value.name,
            width_mm: layout.value.width_mm,
            height_mm: layout.value.height_mm,
            definition: JSON.parse(JSON.stringify(layout.value.definition)),
          },
        }
      } else {
        await api.updateLayoutDefinition(layout.value.id, { definition: layout.value.definition, thumbnail })
      }
      // Ne clear dirty que si aucune nouvelle modif n’est arrivée pendant le save
      if (editVersion === versionAtSave) dirty.value = false
      return !dirty.value
    } catch (e) {
      console.error('saveDefinition failed', e)
      return false
    } finally {
      saving.value = false
      if (dirty.value && autoSave.value) scheduleAutoSave()
    }
  }

  function registerCaptureCallback(fn) { captureCallback = fn }
  function unregisterCaptureCallback()  { captureCallback = null }

  watch(selectedElementId, () => { activeCellIdx.value = null })

  function markDirty() {
    if (!assertEditable()) return
    dirty.value = true
    editVersion += 1
  }

  // ── Item operations (groups & elements) ──────────────────────────────────

  function addGroup(name) {
    if (!assertEditable()) return
    if (!layout.value) return
    _snapshot()
    const id = crypto.randomUUID()
    const groupCount = definition.value.layers.filter(i => i.kind === 'group').length
    definition.value.layers.push({
      id, kind: 'group',
      name: name || `Groupe ${groupCount + 1}`,
      locked: false, visible: true, opacity: 1,
      children: []
    })
    selectedItemId.value = id
    markDirty()
  }

  function updateItem(id, updates) {
    if (!assertEditable()) return
    const item = _findItem(definition.value.layers, id)
    if (!item) return
    _snapshot()
    Object.assign(item, updates)
    markDirty()
  }

  function removeItem(id) {
    if (!assertEditable()) return
    const parentArr = _findParentArray(definition.value.layers, id)
    if (!parentArr) return
    const idx = parentArr.findIndex(i => i.id === id)
    if (idx === -1) return
    _snapshot()
    parentArr.splice(idx, 1)
    if (selectedItemId.value === id) selectedItemId.value = null
    if (selectedElementId.value === id) selectedElementId.value = null
    markDirty()
  }

  // Move itemId before/after targetId in potentially different containers
  function reorderItemAroundTarget(srcId, targetId, position /* 'before'|'after' */) {
    if (!assertEditable()) return
    if (srcId === targetId) return
    const srcParent = _findParentArray(definition.value.layers, srcId)
    if (!srcParent) return

    _snapshot()
    const srcIdx = srcParent.findIndex(i => i.id === srcId)
    const [srcItem] = srcParent.splice(srcIdx, 1)

    const tgtParent = _findParentArray(definition.value.layers, targetId)
    if (!tgtParent) {
      // Fallback: restore
      srcParent.splice(srcIdx, 0, srcItem)
      return
    }
    let tgtIdx = tgtParent.findIndex(i => i.id === targetId)
    const insertIdx = position === 'before' ? tgtIdx : tgtIdx + 1
    tgtParent.splice(insertIdx, 0, srcItem)
    markDirty()
  }

  /**
   * Remonter / descendre d’un cran dans la pile (parmi les frères).
   * 'forward'  = Cmd+] = plus haut dans le panneau = index +1 dans l’array
   * 'backward' = Cmd+[ = plus bas dans le panneau = index -1
   */
  function nudgeItemInStack(id, direction /* 'forward'|'backward' */) {
    if (!assertEditable()) return
    const parentArr = _findParentArray(definition.value.layers, id)
    if (!parentArr) return
    const idx = parentArr.findIndex(i => i.id === id)
    if (idx === -1) return
    const newIdx = direction === 'forward' ? idx + 1 : idx - 1
    if (newIdx < 0 || newIdx >= parentArr.length) return
    _snapshot()
    const [item] = parentArr.splice(idx, 1)
    parentArr.splice(newIdx, 0, item)
    markDirty()
  }

  // Move itemId into a group's children (or to top-level if groupId===null)
  function moveItemToGroup(itemId, groupId) {
    if (!assertEditable()) return
    if (itemId === groupId) return
    const parentArr = _findParentArray(definition.value.layers, itemId)
    if (!parentArr) return
    const idx = parentArr.findIndex(i => i.id === itemId)
    if (idx === -1) return

    _snapshot()
    const [item] = parentArr.splice(idx, 1)

    if (groupId === null) {
      definition.value.layers.push(item)
    } else {
      const targetGroup = _findItem(definition.value.layers, groupId)
      if (targetGroup?.kind === 'group') {
        targetGroup.children.push(item)
      } else {
        parentArr.splice(idx, 0, item)
        return
      }
    }
    markDirty()
  }

  // Move all elements inside a group by a delta
  function moveGroupBy(groupId, dx_mm, dy_mm) {
    if (!assertEditable()) return
    const group = _findItem(definition.value.layers, groupId)
    if (!group || group.kind !== 'group') return
    _snapshot()
    function shift(items) {
      for (const item of items) {
        if (item.kind === 'group') shift(item.children || [])
        else { item.x_mm += dx_mm; item.y_mm += dy_mm }
      }
    }
    shift(group.children || [])
    markDirty()
  }

  // ── Element operations ────────────────────────────────────────────────────

  function addElement(element, targetGroupId = null) {
    if (!assertEditable()) return
    if (!layout.value) return
    _snapshot()

    if (element.type === 'atom' && BACKGROUND_ATOM_TYPES.has(element.atomType)) {
      element = {
        ...element,
        x_mm: 0, y_mm: 0,
        width_mm: layout.value.width_mm,
        height_mm: layout.value.height_mm,
        rotation: 0,
      }
    }

    const el = {
      id: crypto.randomUUID(),
      kind: 'element',
      name: '',
      locked: false,
      visible: true,
      opacity: 1,
      x_mm: 0, y_mm: 0,
      width_mm: 20, height_mm: 10,
      rotation: 0,
      nameInLayout: '',
      ...element
    }

    // Target: explicit > selected group > top level
    const resolvedTarget = targetGroupId
      ?? (selectedItem.value?.kind === 'group' ? selectedItem.value.id : null)

    if (resolvedTarget) {
      const group = _findItem(definition.value.layers, resolvedTarget)
      if (group?.kind === 'group') {
        group.children.push(el)
      } else {
        definition.value.layers.push(el)
      }
    } else {
      definition.value.layers.push(el)
    }

    selectedElementId.value = el.id
    selectedItemId.value = el.id
    markDirty()

    if (el.type === 'component' && el.componentId && !componentsCache.value[el.componentId]) {
      api.getComponent(el.componentId).then(comp => {
        componentsCache.value = { ...componentsCache.value, [el.componentId]: comp }
      }).catch(() => {})
    }
    return el
  }

  function updateElement(elementId, updates, { noHistory = false } = {}) {
    if (!assertEditable()) return
    const item = _findItem(definition.value.layers || [], elementId)
    if (!item || item.kind === 'group') return
    if (!noHistory) _snapshot()
    Object.assign(item, updates)
    markDirty()
  }

  function removeElement(elementId) {
    if (!assertEditable()) return
    const parentArr = _findParentArray(definition.value.layers, elementId)
    if (!parentArr) return
    const idx = parentArr.findIndex(i => i.id === elementId)
    if (idx === -1) return
    _snapshot()
    parentArr.splice(idx, 1)
    if (selectedElementId.value === elementId) selectedElementId.value = null
    if (selectedItemId.value === elementId) selectedItemId.value = null
    markDirty()
  }

  function duplicateItem(id) {
    if (!assertEditable()) return
    const parentArr = _findParentArray(definition.value.layers, id)
    if (!parentArr) return
    const item = parentArr.find(i => i.id === id)
    if (!item) return
    _snapshot()
    const clone = cloneLayerItem(item)
    const idx = parentArr.indexOf(item)
    parentArr.splice(idx + 1, 0, clone)
    selectedItemId.value = clone.id
    if (clone.kind === 'group') {
      selectedElementId.value = null
    } else {
      selectedElementId.value = clone.id
    }
    markDirty()
    return clone
  }

  function duplicateElement(elementId) {
    return duplicateItem(elementId)
  }

  // ── Data schema ───────────────────────────────────────────────────────────

  function addSchemaField(name, type = 'string') {
    if (!assertEditable()) return
    _snapshot()
    if (!layout.value.definition.dataSchema) layout.value.definition.dataSchema = {}
    layout.value.definition.dataSchema[name] = { type, default: '' }
    markDirty()
  }

  function removeSchemaField(name) {
    if (!assertEditable()) return
    _snapshot()
    delete layout.value.definition.dataSchema[name]
    markDirty()
  }

  function snap(value) {
    if (!snapGrid.value) return value
    return Math.round(value / snapGrid.value) * snapGrid.value
  }

  // Move the currently selected item (element or group) by a delta in mm
  function moveSelected(dx_mm, dy_mm) {
    if (!assertEditable()) return
    const item = selectedItem.value
    if (!item || item.locked) return
    if (item.kind === 'group') {
      moveGroupBy(item.id, dx_mm, dy_mm)
    } else {
      updateElement(item.id, { x_mm: item.x_mm + dx_mm, y_mm: item.y_mm + dy_mm })
    }
  }

  // ── Backward-compat aliases ───────────────────────────────────────────────
  const selectedLayerId = selectedItemId // same ref
  const activeLayer     = selectedItem   // same computed (element OR group)
  const addLayer        = addGroup
  const updateLayer     = updateItem
  const removeLayer     = removeItem

  return {
    layout, loading, dirty, saving, autoSave,
    selectedElementId, selectedItemId, selectedLayerId,
    activeCellIdx, backgroundElement,
    zoom, panX, panY, snapGrid, showGrid, requestFit,
    guideOptions, guidesActive, activeGuides, setGuideOption, refreshGuides, clearGuides, scheduleGuidesClear,
    previewData,
    componentsCache,
    definition, layers, selectedItem, activeLayer,
    selectedElement, allElements, dataSchema, bindingNames,
    mode,
    readOnly, layoutLockHolder, layoutLockHeld,
    enterLayoutEditor, leaveLayoutEditor,
    history, canUndo, undo, _snapshot,
    loadLayout, loadComponent, saveDefinition, markDirty, applyLayoutMeta, setAutoSave,
    // Group/item ops
    addGroup, addLayer, updateItem, updateLayer, removeItem, removeLayer,
    moveItemToGroup, moveGroupBy, reorderItemAroundTarget, nudgeItemInStack,
    // Move selected
    moveSelected,
    // Element ops
    addElement, updateElement, removeElement, duplicateElement, duplicateItem,
    // Data schema
    addSchemaField, removeSchemaField,
    snap, _preloadComponents, invalidateComponentCache,
    registerCaptureCallback, unregisterCaptureCallback
  }
})
