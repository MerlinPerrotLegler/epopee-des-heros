<template>
  <div class="items-view">
    <header class="view-header">
      <h1>Layouts</h1>
      <div class="header-controls">
        <input class="search-input" v-model="search" placeholder="Filtrer…" />
        <select class="sort-select" v-model="sortKey">
          <option value="name">Nom ↑</option>
          <option value="name_desc">Nom ↓</option>
          <option value="type">Type</option>
          <option value="updated">Modifié</option>
        </select>
        <button class="btn-primary" @click="showCreate = true">+ Nouveau</button>
      </div>
    </header>

    <div class="items-grid" v-if="filtered.length">
      <div
        v-for="l in filtered" :key="l.id"
        class="item-tile"
        @click="$router.push(`/editor/${l.id}`)"
      >
        <!-- Thumbnail -->
        <div class="tile-thumb" :style="thumbStyle(l)">
          <img v-if="l.thumbnail" :src="l.thumbnail" class="thumb-img" />
          <div v-else class="thumb-placeholder">
            <span class="ph-dims">{{ l.width_mm }}×{{ l.height_mm }}</span>
            <span class="ph-hint">Ouvrir et sauvegarder pour générer</span>
          </div>
        </div>

        <!-- Info -->
        <div class="tile-info">
          <!-- Rename inline -->
          <input
            v-if="renamingId === l.id"
            class="tile-rename-input"
            v-model="renameValue"
            @blur="commitRename(l, 'layout')"
            @keyup.enter="commitRename(l, 'layout')"
            @keyup.escape="renamingId = null"
            @click.stop
            autofocus
          />
          <div v-else class="tile-name" @dblclick.stop="startRename(l)">{{ l.name }}</div>
          <div class="tile-meta">
            <span class="badge">{{ l.card_type }}</span>
            <span class="tile-size">{{ l.width_mm }}×{{ l.height_mm }} mm</span>
          </div>
        </div>

        <!-- Actions toujours visibles en bas à droite -->
        <div class="tile-actions" @click.stop>
          <button class="act-btn" title="Renommer" @click="startRename(l)">✎</button>
          <button class="act-btn" title="Dupliquer" @click="duplicate(l)">⧉</button>
          <button class="act-btn act-del" title="Supprimer" @click="confirmDelete(l)">✕</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p v-if="search">Aucun layout correspondant à « {{ search }} ».</p>
      <p v-else>Aucun layout. Créez-en un pour commencer à designer vos cartes.</p>
    </div>

    <!-- Create Modal -->
    <div class="modal-overlay" v-if="showCreate" @click.self="showCreate = false">
      <div class="modal">
        <h3>Nouveau layout</h3>
        <div class="field-row"><label>Nom</label><input v-model="form.name" placeholder="Carte équipement" /></div>
        <div class="field-row">
          <label>Type</label>
          <select v-model="form.card_type">
            <option v-for="t in cardTypes" :key="t.code" :value="t.code">{{ t.label }}</option>
          </select>
        </div>
        <div class="field-row"><label>Largeur (mm)</label><input type="number" v-model.number="form.width_mm" min="10" max="500" /></div>
        <div class="field-row"><label>Hauteur (mm)</label><input type="number" v-model.number="form.height_mm" min="10" max="500" /></div>
        <div class="field-row">
          <label>Dos</label>
          <select v-model="form.back_layout_id">
            <option :value="null">— Aucun —</option>
            <option v-for="bl in backLayouts" :key="bl.id" :value="bl.id">{{ bl.name }}</option>
          </select>
        </div>
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

const layouts   = ref([])
const cardTypes = ref([])
const showCreate = ref(false)
const search    = ref('')
const sortKey   = ref('name')

const form = ref({ name: '', card_type: 'equipement', width_mm: 63, height_mm: 88, back_layout_id: null })
const backLayouts = computed(() => layouts.value.filter(l => l.card_type === 'dos'))

// Inline rename
const renamingId  = ref(null)
const renameValue = ref('')

function startRename(item) {
  renamingId.value  = item.id
  renameValue.value = item.name
}

async function commitRename(item, kind) {
  if (!renamingId.value) return
  renamingId.value = null
  const name = renameValue.value.trim()
  if (!name || name === item.name) return
  await api.updateLayout(item.id, { name })
  item.name = name
}

const filtered = computed(() => {
  let list = layouts.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(l => l.name.toLowerCase().includes(q) || l.card_type.toLowerCase().includes(q))
  }
  return [...list].sort((a, b) => {
    if (sortKey.value === 'name')      return a.name.localeCompare(b.name)
    if (sortKey.value === 'name_desc') return b.name.localeCompare(a.name)
    if (sortKey.value === 'type')      return a.card_type.localeCompare(b.card_type) || a.name.localeCompare(b.name)
    if (sortKey.value === 'updated')   return (b.updated_at || '').localeCompare(a.updated_at || '')
    return 0
  })
})

onMounted(async () => {
  [layouts.value, cardTypes.value] = await Promise.all([api.getLayouts(), api.getCardTypes()])
})

// Proportions de la carte : max 120px de large, fond blanc
function thumbStyle(l) {
  const MAX = 120
  const ratio = l.height_mm / l.width_mm
  const w = MAX
  const h = Math.round(MAX * ratio)
  return { width: `${w}px`, height: `${h}px` }
}

async function create() {
  const layout = await api.createLayout(form.value)
  layouts.value.push(layout)
  showCreate.value = false
  form.value = { name: '', card_type: 'equipement', width_mm: 63, height_mm: 88, back_layout_id: null }
}

async function duplicate(l) {
  const dup = await api.duplicateLayout(l.id, { with_instances: true })
  layouts.value.push(dup)
}

async function confirmDelete(l) {
  if (confirm(`Supprimer "${l.name}" ?`)) {
    await api.deleteLayout(l.id)
    layouts.value = layouts.value.filter(x => x.id !== l.id)
  }
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

/* Thumbnail */
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

/* Info */
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

/* Actions toujours visibles en bas à droite */
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
