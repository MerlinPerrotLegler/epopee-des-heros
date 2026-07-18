<template>
  <div class="layer-panel">
    <!-- Header -->
    <div class="panel-section-title lp-header">
      <span>Calques</span>
      <span class="lp-hint" title="⌘/Ctrl+[ descendre · ⌘/Ctrl+] monter">⌘[ ⌘]</span>
      <button class="btn-icon btn-sm" @click="store.addGroup()" title="Nouveau groupe">⊞</button>
    </div>

    <!-- Tree -->
    <div
      class="layer-list"
      @dragover.prevent
      @drop.prevent="onListDrop"
    >
      <div
        v-for="row in flatTree"
        :key="row.id"
        class="layer-item"
        :class="{
          selected: store.selectedItemId === row.id,
          'drop-above': dropTarget === row.id && dropMode === 'above',
          'drop-below': dropTarget === row.id && dropMode === 'below',
          'drop-inside': dropTarget === row.id && dropMode === 'inside',
          'is-group': row.kind === 'group',
        }"
        :style="{ paddingLeft: `${8 + row._depth * 14}px` }"
        draggable="true"
        @dragstart="onDragStart($event, row.id)"
        @dragend="onDragEnd"
        @dragover.prevent="onItemDragOver($event, row)"
        @dragleave="onItemDragLeave"
        @drop.prevent.stop="onItemDrop(row)"
        @click="selectItem(row)"
      >
        <!-- Expand toggle for groups -->
        <button
          v-if="row.kind === 'group'"
          class="expand-btn"
          @click.stop="toggleExpand(row.id)"
          :title="expanded.has(row.id) ? 'Réduire' : 'Développer'"
        >{{ expanded.has(row.id) ? '▾' : '▸' }}</button>
        <span v-else class="expand-spacer"></span>

        <!-- Visibility -->
        <button
          class="btn-icon btn-sm"
          @click.stop="store.updateItem(row.id, { visible: row.visible === false })"
          :title="row.visible !== false ? 'Masquer' : 'Afficher'"
        >{{ row.visible !== false ? '◉' : '○' }}</button>

        <!-- Icon -->
        <span class="layer-icon">{{ getIcon(row) }}</span>

        <!-- Name (editable) -->
        <span
          v-if="editingId !== row.id"
          class="layer-name"
          @dblclick.stop="startRename(row)"
        >{{ getDisplayName(row) }}</span>
        <input
          v-else
          class="layer-name-input"
          v-model="editName"
          :ref="layerRenameRef"
          @blur="onLayerRenameBlur(row)"
          @keydown.enter.prevent="finishRename(row)"
          @keydown.escape="editingId = null"
          @click.stop
        />

        <!-- Opacity badge -->
        <span
          class="layer-opacity"
          :class="{ 'opacity-faded': (row.opacity ?? 1) >= 1 }"
          :title="`Opacité : ${Math.round((row.opacity ?? 1) * 100)}%\nGlisser gauche/droite`"
          @mousedown.stop="startOpacityDrag($event, row)"
        >{{ Math.round((row.opacity ?? 1) * 100) }}%</span>

        <!-- Lock (SVG, CSS-colorable) -->
        <button
          class="btn-icon btn-sm btn-lock"
          :class="{ 'is-locked': row.locked }"
          @click.stop="store.updateItem(row.id, { locked: !row.locked })"
          :title="row.locked ? 'Déverrouiller' : 'Verrouiller'"
        >
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
            <rect x="1" y="5" width="8" height="7" rx="1.2" />
            <path
              v-if="row.locked"
              d="M3 5V3.5a2 2 0 0 1 4 0V5"
              fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
            />
            <path
              v-else
              d="M3 5V3.5a2 2 0 0 1 4 0"
              fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
            />
          </svg>
        </button>

        <!-- Delete -->
        <button
          class="btn-icon btn-sm act-del"
          @mousedown.prevent
          @click.stop="store.removeItem(row.id)"
          title="Supprimer"
        >✕</button>
      </div>

      <!-- Drop zone at the very bottom of the top-level list -->
      <div
        class="drop-zone-end"
        :class="{ active: dropMode === 'list-bottom' }"
        @dragover.prevent="setDrop(null, 'list-bottom')"
        @dragleave="clearDrop"
        @drop.prevent.stop="onListBottomDrop"
      ></div>

      <div v-if="!flatTree.length" class="empty-hint">
        Utilisez "Ajouter" pour placer des éléments.
      </div>
    </div>

    <!-- Group properties -->
    <div class="panel-section" v-if="selectedGroup">
      <div class="panel-section-title">Groupe — {{ selectedGroup.name }}</div>
      <div class="field-row">
        <label>Δ X</label>
        <input type="number" step="0.5" value="0"
          @change="store.moveGroupBy(selectedGroup.id, +$event.target.value, 0); $event.target.value = 0" />
        <span class="unit">mm</span>
      </div>
      <div class="field-row">
        <label>Δ Y</label>
        <input type="number" step="0.5" value="0"
          @change="store.moveGroupBy(selectedGroup.id, 0, +$event.target.value); $event.target.value = 0" />
        <span class="unit">mm</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { ATOM_TYPES } from '@/atoms/index.js'

const store = useEditorStore()

// ── Expanded state (persisted in localStorage) ────────────────────────────────
const expanded = ref(new Set())

const storageKey = computed(() => `layer-expanded-${store.layout?.id || 'default'}`)

function saveExpanded() {
  try { localStorage.setItem(storageKey.value, JSON.stringify([...expanded.value])) } catch {}
}

function loadExpanded() {
  try {
    const saved = localStorage.getItem(storageKey.value)
    expanded.value = saved ? new Set(JSON.parse(saved)) : new Set()
  } catch { expanded.value = new Set() }
}

onMounted(loadExpanded)
watch(() => store.layout?.id, loadExpanded)

function toggleExpand(id) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
  saveExpanded()
}

// ── Flatten tree for rendering (reversed: last in array = top in UI) ──────────
const flatTree = computed(() => {
  const rows = []
  function walk(items, depth, parentId) {
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      rows.push({ ...item, _depth: depth, _parentId: parentId ?? null })
      if (item.kind === 'group' && expanded.value.has(item.id)) {
        walk(item.children || [], depth + 1, item.id)
      }
    }
  }
  walk(store.layers, 0, null)
  return rows
})

// ── Names & icons ─────────────────────────────────────────────────────────────
function getIcon(row) {
  if (row.kind === 'group') return '▤'
  if (row.type === 'atom' && ATOM_TYPES[row.atomType]) return ATOM_TYPES[row.atomType].icon
  if (row.type === 'component') return '◧'
  return '?'
}

function getDisplayName(row) {
  if (row.kind === 'group') return row.name || 'Groupe'
  return row.name || row.nameInLayout || ATOM_TYPES[row.atomType]?.label || row.type || '?'
}

// ── Rename ────────────────────────────────────────────────────────────────────
const editingId = ref(null)
const editName  = ref('')

function startRename(row) {
  editingId.value = row.id
  editName.value  = getDisplayName(row)
}

function layerRenameRef(el) {
  if (!el) return
  requestAnimationFrame(() => {
    el.focus()
    const len = el.value?.length ?? 0
    el.setSelectionRange(len, len)
  })
}

function onLayerRenameBlur(row) {
  setTimeout(() => {
    if (editingId.value === row.id) finishRename(row)
  }, 0)
}

function finishRename(row) {
  if (editingId.value !== row.id) return
  if (editName.value.trim()) store.updateItem(row.id, { name: editName.value.trim() })
  editingId.value = null
}

// ── Selection ─────────────────────────────────────────────────────────────────
function selectItem(row) {
  store.selectedItemId = row.id
  if (row.kind !== 'group') {
    store.selectedElementId = row.id
  } else {
    store.selectedElementId = null
    if (!expanded.value.has(row.id)) toggleExpand(row.id)
  }
}

const selectedGroup = computed(() => {
  const item = store.selectedItem
  return item?.kind === 'group' ? item : null
})

// ── Opacity drag ──────────────────────────────────────────────────────────────
function startOpacityDrag(e, row) {
  e.preventDefault()
  const startX  = e.clientX
  const startOp = row.opacity ?? 1
  const onMove = (ev) => {
    const newOp = Math.max(0, Math.min(1, startOp + (ev.clientX - startX) / 150))
    store.updateItem(row.id, { opacity: Math.round(newOp * 100) / 100 })
  }
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
// IMPORTANT: The UI reverses the array order (last item in array = top in UI).
// So "above" in the visual = "after" in the array, and vice-versa.
// Zones = haut / bas (et milieu pour groupes) de chaque ligne — large zone de drop.

const dragSrcId  = ref(null)
const dropTarget = ref(null)
const dropMode   = ref(null)   // 'above' | 'below' | 'inside' | 'list-bottom'

function onDragStart(e, id) {
  dragSrcId.value = id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', id)
}

function onDragEnd() {
  dragSrcId.value = null
  dropTarget.value = null
  dropMode.value   = null
}

function setDrop(id, mode) {
  if (!dragSrcId.value) return
  dropTarget.value = id
  dropMode.value   = mode
}

function clearDrop() {
  dropTarget.value = null
  dropMode.value   = null
}

function onItemDragLeave(e) {
  // Ne clear que si on quitte vraiment la ligne (pas un enfant interne)
  if (e.currentTarget.contains(e.relatedTarget)) return
  clearDrop()
}

/**
 * Découpe la ligne en zones larges selon la position Y du pointeur :
 *  - élément : 50 % haut = above, 50 % bas = below
 *  - groupe  : 30 % haut = above, 40 % milieu = inside, 30 % bas = below
 */
function onItemDragOver(e, row) {
  if (!dragSrcId.value || dragSrcId.value === row.id) return
  const rect = e.currentTarget.getBoundingClientRect()
  const y = (e.clientY - rect.top) / Math.max(rect.height, 1)

  let mode
  if (row.kind === 'group') {
    if (y < 0.30) mode = 'above'
    else if (y > 0.70) mode = 'below'
    else mode = 'inside'
  } else {
    mode = y < 0.5 ? 'above' : 'below'
  }
  setDrop(row.id, mode)
}

function onItemDrop(row) {
  if (!dragSrcId.value || dragSrcId.value === row.id) { onDragEnd(); return }
  const mode = dropMode.value
  if (mode === 'inside' && row.kind === 'group') {
    store.moveItemToGroup(dragSrcId.value, row.id)
  } else if (mode === 'above') {
    // Visuel au-dessus → after dans l’array
    store.reorderItemAroundTarget(dragSrcId.value, row.id, 'after')
  } else if (mode === 'below') {
    // Visuel en-dessous → before dans l’array
    store.reorderItemAroundTarget(dragSrcId.value, row.id, 'before')
  }
  onDragEnd()
}

function onListBottomDrop() {
  if (!dragSrcId.value) { onDragEnd(); return }
  const topLevel = flatTree.value.filter(r => r._parentId === null)
  const lowestRow = topLevel[topLevel.length - 1]
  if (lowestRow && lowestRow.id !== dragSrcId.value) {
    store.reorderItemAroundTarget(dragSrcId.value, lowestRow.id, 'before')
  }
  onDragEnd()
}

// Drop on empty space (unnest to top level) — ignore si une zone précise est active
function onListDrop() {
  if (!dragSrcId.value) return
  if (dropMode.value && dropMode.value !== 'list-bottom') {
    onDragEnd()
    return
  }
  if (dropMode.value === 'list-bottom') {
    onListBottomDrop()
    return
  }
  store.moveItemToGroup(dragSrcId.value, null)
  onDragEnd()
}
</script>

<style scoped>
.layer-panel { display: flex; flex-direction: column; }

.lp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}
.lp-hint {
  margin-left: auto;
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  opacity: 0.7;
  letter-spacing: 0.02em;
  user-select: none;
}

.layer-list {
  display: flex;
  flex-direction: column;
  min-height: 20px;
}

/* Zone large en bas de liste (pas les 3 px d’avant) */
.drop-zone-end {
  min-height: 28px;
  border-radius: 2px;
  transition: background 60ms;
  flex-shrink: 0;
}
.drop-zone-end.active { background: rgba(108, 122, 255, 0.25); }

.layer-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  border: 1px solid transparent;
  min-width: 0;
}
.layer-item:hover { background: var(--bg-hover); }
.layer-item.selected { background: var(--bg-tertiary); }
.layer-item.is-group { background: rgba(108,122,255,0.04); }
.layer-item.is-group.selected { background: rgba(108,122,255,0.12); }
.layer-item.drop-inside { border-color: var(--accent-primary); background: rgba(108,122,255,0.1); }

/* Indicateurs de drop haut / bas (ligne accent sur toute la largeur) */
.layer-item.drop-above::before,
.layer-item.drop-below::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 3px;
  border-radius: 2px;
  background: var(--accent-primary);
  pointer-events: none;
  z-index: 2;
}
.layer-item.drop-above::before { top: -1px; }
.layer-item.drop-below::after { bottom: -1px; }

.expand-btn {
  width: 14px; height: 14px;
  background: none; border: none;
  color: var(--text-muted); cursor: pointer;
  font-size: 9px; padding: 0; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.expand-btn:hover { color: var(--accent-primary); }

.expand-spacer { width: 14px; flex-shrink: 0; }

.layer-icon {
  font-size: 12px; width: 16px;
  text-align: center; flex-shrink: 0;
}

.layer-name {
  flex: 1; font-size: 11px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}

.layer-name-input { flex: 1; font-size: 11px; padding: 1px 4px; min-width: 0; }

.layer-opacity {
  font-size: 9px; font-family: var(--font-mono);
  color: var(--text-muted); cursor: ew-resize;
  padding: 1px 3px; border-radius: 3px;
  border: 1px solid var(--border-subtle);
  user-select: none; flex-shrink: 0; min-width: 26px; text-align: center;
  transition: opacity 80ms;
}
.layer-opacity:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
.layer-opacity.opacity-faded { opacity: 0; pointer-events: none; }
.layer-item:hover .layer-opacity.opacity-faded { opacity: 1; pointer-events: auto; }

/* Lock button — monochrome SVG icon */
.btn-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);   /* unlocked = accent color (same as active tab text) */
  flex-shrink: 0;
  transition: color 80ms;
}
.btn-lock:hover { color: var(--accent-primary); opacity: 0.7; }
.btn-lock.is-locked { color: #ef4444; opacity: 1; }
.btn-lock.is-locked:hover { color: #dc2626; }

/* Hide lock when unlocked until row is hovered */
.layer-item:not(:hover) .btn-lock:not(.is-locked) { opacity: 0; pointer-events: none; }
.layer-item:hover .btn-lock { opacity: 1; pointer-events: auto; }

.act-del:hover { color: #ef4444 !important; }

.empty-hint {
  font-size: 11px; color: var(--text-muted);
  padding: 12px 8px; text-align: center;
}

/* Group properties */
.panel-section { border-top: 1px solid var(--border-subtle); padding: 8px; }
.panel-section-title {
  font-size: 10px; font-weight: 600; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 6px 8px 4px;
}
.field-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 11px; }
.field-row label { font-size: 10px; color: var(--text-muted); min-width: 32px; }
.field-row input[type=number] { width: 56px; font-family: var(--font-mono); font-size: 10px; padding: 2px 4px; }
.unit { font-family: var(--font-mono); font-size: 9px; color: var(--text-muted); }
</style>
