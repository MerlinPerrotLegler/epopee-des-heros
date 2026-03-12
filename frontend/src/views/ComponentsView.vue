<template>
  <div class="items-view">
    <header class="view-header">
      <h1>Composants</h1>
      <div class="header-controls">
        <input class="search-input" v-model="search" placeholder="Filtrer…" />
        <select class="sort-select" v-model="sortKey">
          <option value="name">Nom ↑</option>
          <option value="name_desc">Nom ↓</option>
          <option value="updated">Modifié</option>
        </select>
        <button class="btn-primary" @click="showCreate = true">+ Nouveau</button>
      </div>
    </header>

    <div class="items-grid" v-if="filtered.length">
      <div
        v-for="item in filtered" :key="item.id"
        class="item-tile"
        @click="$router.push(`/components/${item.id}/editor`)"
      >
        <!-- Thumbnail -->
        <div class="tile-thumb" :style="thumbStyle(item)">
          <img v-if="item.thumbnail" :src="item.thumbnail" class="thumb-img" />
          <div v-else class="thumb-placeholder">
            <span class="ph-dims">{{ item.width_mm || '?' }}×{{ item.height_mm || '?' }}</span>
            <span class="ph-hint">Ouvrir et sauvegarder pour générer</span>
          </div>
        </div>

        <!-- Info -->
        <div class="tile-info">
          <input
            v-if="renamingId === item.id"
            class="tile-rename-input"
            v-model="renameValue"
            @blur="commitRename(item)"
            @keyup.enter="commitRename(item)"
            @keyup.escape="renamingId = null"
            @click.stop
            autofocus
          />
          <div v-else class="tile-name" @dblclick.stop="startRename(item)">{{ item.name }}</div>
          <div class="tile-meta">
            <span class="badge">Composant</span>
            <span v-if="item.width_mm" class="tile-size">{{ item.width_mm }}×{{ item.height_mm }} mm</span>
            <span class="tile-size">{{ countElements(item.definition) }} élém.</span>
          </div>
        </div>

        <!-- Actions toujours visibles en bas à droite -->
        <div class="tile-actions" @click.stop>
          <button class="act-btn" title="Renommer" @click="startRename(item)">✎</button>
          <button class="act-btn" title="Dupliquer" @click="duplicate(item)">⧉</button>
          <button class="act-btn act-del" title="Supprimer" @click="remove(item)">✕</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p v-if="search">Aucun composant correspondant à « {{ search }} ».</p>
      <p v-else>Aucun composant créé.</p>
    </div>

    <!-- Create Modal -->
    <div class="modal-overlay" v-if="showCreate" @click.self="showCreate = false">
      <div class="modal">
        <h3>Nouveau composant</h3>
        <div class="field-row"><label>Nom</label><input v-model="form.name" /></div>
        <div class="field-row"><label>Description</label><input v-model="form.description" /></div>
        <div class="field-row"><label>Largeur (mm)</label><input type="number" v-model.number="form.width_mm" /></div>
        <div class="field-row"><label>Hauteur (mm)</label><input type="number" v-model.number="form.height_mm" /></div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showCreate = false">Annuler</button>
          <button class="btn-primary" @click="create" :disabled="!form.name">Créer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api.js'

const items      = ref([])
const showCreate = ref(false)
const search     = ref('')
const sortKey    = ref('name')
const form       = ref({ name: '', description: '', width_mm: 30, height_mm: 20 })

// Inline rename
const renamingId  = ref(null)
const renameValue = ref('')

function startRename(item) {
  renamingId.value  = item.id
  renameValue.value = item.name
}

async function commitRename(item) {
  if (!renamingId.value) return
  renamingId.value = null
  const name = renameValue.value.trim()
  if (!name || name === item.name) return
  const updated = await api.patchComponent(item.id, { name })
  item.name = updated.name
}

const filtered = computed(() => {
  let list = items.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(i => i.name.toLowerCase().includes(q))
  }
  return [...list].sort((a, b) => {
    if (sortKey.value === 'name')      return a.name.localeCompare(b.name)
    if (sortKey.value === 'name_desc') return b.name.localeCompare(a.name)
    if (sortKey.value === 'updated')   return (b.updated_at || '').localeCompare(a.updated_at || '')
    return 0
  })
})

onMounted(async () => { items.value = await api.getComponents() })

function thumbStyle(item) {
  const MAX = 120
  const w_mm = item.width_mm  || 30
  const h_mm = item.height_mm || 20
  const ratio = h_mm / w_mm
  return { width: `${MAX}px`, height: `${Math.round(MAX * ratio)}px` }
}

async function create() {
  const created = await api.createComponent({ ...form.value, definition: { elements: [] } })
  items.value.push(created)
  showCreate.value = false
  form.value = { name: '', description: '', width_mm: 30, height_mm: 20 }
}

async function duplicate(item) {
  const dup = await api.duplicateComponent(item.id)
  items.value.push(dup)
}

function countElements(def) {
  if (!def) return 0
  if (def.elements) return def.elements.length
  let n = 0
  function walk(items) { for (const i of items) { if (i.kind === 'group') walk(i.children || []); else n++ } }
  walk(def.layers || [])
  return n
}

async function remove(item) {
  if (!confirm(`Supprimer "${item.name}" ?`)) return
  await api.deleteComponent(item.id)
  items.value = items.value.filter(i => i.id !== item.id)
}
</script>

<style scoped>
.items-view { padding: 24px; overflow-y: auto; height: 100%; }

.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.header-controls { display: flex; gap: 8px; align-items: center; }

.search-input {
  padding: 5px 10px; font-size: 12px;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); outline: none; width: 160px;
}
.search-input:focus { border-color: var(--accent-primary); }

.sort-select {
  padding: 5px 8px; font-size: 12px;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); outline: none; cursor: pointer;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.item-tile {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 12px;
  cursor: pointer;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  position: relative;
  transition: border-color 120ms, background 120ms;
}
.item-tile:hover { border-color: var(--accent-primary); background: var(--bg-tertiary); }

.tile-thumb {
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 6px; width: 100%; height: 100%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(108,122,255,0.04) 4px,
    rgba(108,122,255,0.04) 8px
  );
}
.ph-dims { font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); font-weight: 600; }
.ph-hint { font-size: 8px; color: var(--text-muted); text-align: center; line-height: 1.3; }

.tile-info { flex: 1; min-width: 0; padding-top: 2px; padding-bottom: 24px; }
.tile-name {
  font-weight: 600; font-size: 13px; margin-bottom: 6px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  cursor: text;
}
.tile-rename-input {
  font-size: 13px; font-weight: 600; width: 100%; margin-bottom: 6px;
  background: var(--bg-deep); color: var(--text-primary);
  border: 1px solid var(--accent-primary); border-radius: 3px;
  padding: 1px 4px; outline: none;
}
.tile-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tile-size { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }

.tile-actions {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 2px;
}
.act-btn {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: 3px; cursor: pointer; font-size: 12px; color: var(--text-muted);
  transition: color 80ms, border-color 80ms, background 80ms;
}
.act-btn:hover { color: var(--text-primary); border-color: var(--accent-primary); background: var(--bg-tertiary); }
.act-del:hover { color: #ef4444; border-color: #ef4444; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
</style>
