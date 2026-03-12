<template>
  <div class="layer-panel">
    <!-- Header -->
    <div class="panel-section-title lp-header">
      <span>Calques</span>
      <button class="btn-icon btn-sm" @click="store.addGroup()" title="Nouveau groupe">⊞</button>
    </div>

    <!-- Tree -->
    <div
      class="layer-list"
      @dragover.prevent
      @drop.prevent="onListDrop"
    >
      <template v-for="row in flatTree" :key="row.id">
        <!-- Drop zone ABOVE this row -->
        <div
          class="drop-zone"
          :class="{ active: dropTarget === row.id && dropMode === 'above' }"
          @dragover.prevent="setDrop(row.id, 'above')"
          @dragleave="clearDrop"
          @drop.prevent="commitZoneDrop(row.id, 'above')"
        ></div>

        <div
          class="layer-item"
          :class="{
            selected: store.selectedItemId === row.id,
            'drop-inside': dropTarget === row.id && dropMode === 'inside',
            'is-group': row.kind === 'group',
          }"
          :style="{ paddingLeft: `${8 + row._depth * 14}px` }"
          draggable="true"
          @dragstart="onDragStart($event, row.id)"
          @dragend="onDragEnd"
          @dragover.prevent="onItemDragOver(row.id, row.kind)"
          @dragleave="clearDrop"
          @drop.prevent="onItemDrop(row.id, row.kind)"
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
            @blur="finishRename(row)"
            @keydown.enter="finishRename(row)"
            @keydown.escape="editingId = null"
            @click.stop
            autofocus
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
              <!-- Closed shackle -->
              <path
                v-if="row.locked"
                d="M3 5V3.5a2 2 0 0 1 4 0V5"
                fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
              />
              <!-- Open shackle (right side detached) -->
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
            @click.stop="store.removeItem(row.id)"
            title="Supprimer"
          >✕</button>
        </div>

        <!-- Drop zone BELOW the last child of a group (bottom of group's children) -->
        <div
          v-if="isLastChildInGroup(row)"
          class="drop-zone"
          :class="{ active: dropTarget === row.id && dropMode === 'below-last' }"
          @dragover.prevent="setDrop(row.id, 'below-last')"
          @dragleave="clearDrop"
          @drop.prevent="commitZoneDrop(row.id, 'below-last')"
        ></div>
      </template>

      <!-- Drop zone at the very bottom of the top-level list -->
      <div
        class="drop-zone"
        :class="{ active: dropMode === 'list-bottom' }"
        @dragover.prevent="setDrop(null, 'list-bottom')"
        @dragleave="clearDrop"
        @drop.prevent="onListBottomDrop"
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

// True for the bottom-most visual child of a group (= index 0 in children array)
function isLastChildInGroup(row) {
  if (!row._parentId) return false
  const siblings = flatTree.value.filter(r => r._parentId === row._parentId)
  return siblings[siblings.length - 1]?.id === row.id
}

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

function finishRename(row) {
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

const dragSrcId  = ref(null)
const dropTarget = ref(null)
const dropMode   = ref(null)   // 'above' | 'inside' | 'below-last' | 'list-bottom'

function onDragStart(e, id) {
  dragSrcId.value = id
  e.dataTransfer.effectAllowed = 'move'
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

// Hovering directly over a row (not a zone) — offer 'inside' for groups
function onItemDragOver(id, kind) {
  if (!dragSrcId.value || dragSrcId.value === id) return
  dropTarget.value = id
  dropMode.value   = kind === 'group' ? 'inside' : null
}

function onItemDrop(id, kind) {
  if (!dragSrcId.value || dragSrcId.value === id) { onDragEnd(); return }
  if (kind === 'group') store.moveItemToGroup(dragSrcId.value, id)
  onDragEnd()
}

// Drop zone commit.
// Because the UI is REVERSED, 'above' visually = 'after' in array, 'below-last' = 'before' in array.
function commitZoneDrop(id, mode) {
  if (!dragSrcId.value) { onDragEnd(); return }
  if (mode === 'above') {
    // Visual "above" item → insert after it in array (higher index = higher in visual)
    store.reorderItemAroundTarget(dragSrcId.value, id, 'after')
  } else if (mode === 'below-last') {
    // Bottom of group children → insert before first child (index 0)
    store.reorderItemAroundTarget(dragSrcId.value, id, 'before')
  }
  onDragEnd()
}

// Drop on the empty area at the very bottom of the list
function onListBottomDrop() {
  if (!dragSrcId.value) { onDragEnd(); return }
  // Bottom of visual list = index 0 in array = insert before the first item in array
  const topLevel = flatTree.value.filter(r => r._parentId === null)
  const lowestRow = topLevel[topLevel.length - 1] // last in flatTree = index 0 in array
  if (lowestRow && lowestRow.id !== dragSrcId.value) {
    store.reorderItemAroundTarget(dragSrcId.value, lowestRow.id, 'before')
  }
  onDragEnd()
}

// Drop on empty space (unnest to top level)
function onListDrop() {
  if (!dragSrcId.value) return
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
}

.layer-list {
  display: flex;
  flex-direction: column;
  min-height: 20px;
}

.drop-zone {
  height: 3px;
  border-radius: 2px;
  transition: background 60ms;
  flex-shrink: 0;
}
.drop-zone.active { background: var(--accent-primary); }

.layer-item {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
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
