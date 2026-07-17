<template>
  <div class="items-view">
    <header class="view-header">
      <h1>Layouts</h1>
      <div class="header-controls">
        <select class="sort-select" v-model="sortKey">
          <option value="name">Nom ↑</option>
          <option value="name_desc">Nom ↓</option>
          <option value="type">Type</option>
          <option value="updated">Modifié</option>
        </select>
        <button class="btn-primary" @click="showCreate = true">+ Nouveau</button>
      </div>
    </header>

    <div class="search-bar">
      <input
        class="search-input"
        v-model="search"
        type="search"
        placeholder="Rechercher un layout (nom, type…)"
        autofocus
      />
    </div>

    <!-- Recto / Verso tabs -->
    <div class="face-tabs">
      <button :class="['face-tab', { active: faceTab === 'recto' }]" @click="faceTab = 'recto'">
        Recto
        <span class="tab-count">{{ rectoLayouts.length }}</span>
      </button>
      <button :class="['face-tab', { active: faceTab === 'verso' }]" @click="faceTab = 'verso'">
        Verso
        <span class="tab-count">{{ versoLayouts.length }}</span>
      </button>
    </div>

    <div class="items-list" v-if="filtered.length">
      <div
        v-for="l in filtered" :key="l.id"
        class="item-row"
        @click="openEditor(l)"
      >
        <div class="row-thumb" :style="thumbStyle(l)">
          <img v-if="l.thumbnail" :src="l.thumbnail" class="thumb-img" alt="" />
          <div v-else class="thumb-placeholder">
            <span class="ph-dims">{{ l.width_mm }}×{{ l.height_mm }}</span>
          </div>
        </div>

        <div class="row-main" @click.stop>
          <input
            v-if="renamingId === l.id"
            :ref="renameRef"
            class="tile-rename-input"
            v-model="renameValue"
            @blur="onRenameBlur(l)"
            @keydown.enter.prevent="commitRename(l)"
            @keydown.escape="cancelRename"
            @click.stop
          />
          <div v-else class="row-name" @dblclick.stop="startRename(l)" :title="l.name">{{ l.name }}</div>
          <div class="row-meta">
            <span class="badge">{{ l.card_type }}</span>
            <span v-if="isHexLayout(l)" class="badge badge-hex" title="Layout hexagonal">⬡</span>
            <span class="row-dims">{{ l.width_mm }} × {{ l.height_mm }} mm</span>
            <span v-if="l.is_back" class="tile-verso-badge">DOS</span>
          </div>
        </div>

        <div v-if="!l.is_back" class="row-verso" @click.stop>
          <span class="verso-label">Verso</span>
          <select
            class="verso-select"
            :value="l.back_layout_id || ''"
            @change="onVersoSelectChange(l, $event.target.value)"
          >
            <option value="">— Aucun —</option>
            <option v-for="bl in versoLayouts" :key="bl.id" :value="bl.id">{{ bl.name }}</option>
            <option value="__create__">+ Créer…</option>
          </select>
        </div>

        <div class="row-actions" @click.stop>
          <button type="button" class="act-btn" title="Configurer" @mousedown.prevent @click="openEdit(l)">⚙</button>
          <button type="button" class="act-btn" title="Renommer" @mousedown.prevent @click="startRename(l)">✎</button>
          <button type="button" class="act-btn" title="Dupliquer" @mousedown.prevent @click="duplicate(l)">⧉</button>
          <button type="button" class="act-btn act-del" title="Supprimer" @mousedown.prevent @click="confirmDelete(l)">✕</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p v-if="search">Aucun layout correspondant à « {{ search }} ».</p>
      <p v-else-if="faceTab === 'verso'">Aucun layout verso. Créez-en un via le sélecteur "Verso" d'un layout recto.</p>
      <p v-else>Aucun layout. Créez-en un pour commencer à designer vos cartes.</p>
    </div>

    <LayoutSettingsModal
      :open="showCreate"
      :layout="null"
      :card-types="cardTypes"
      :verso-layouts="versoLayouts"
      :save-fn="createFromPayload"
      @close="showCreate = false"
    />

    <LayoutSettingsModal
      :open="!!editingLayout"
      :layout="editingLayout"
      :card-types="cardTypes"
      :verso-layouts="versoLayouts"
      :save-fn="saveEditFromPayload"
      @close="editingLayout = null"
    />

    <!-- Create Verso Modal (from recto tile) -->
    <div class="modal-overlay" v-if="versoCreateTarget" @click.self="cancelCreateVerso">
      <div class="modal">
        <h3>Nouveau verso</h3>
        <p class="modal-hint">Le layout verso sera automatiquement lié à « {{ versoCreateTarget.name }} ».</p>
        <div class="field-row"><label>Nom</label><input v-model="versoForm.name" autofocus /></div>
        <div class="field-row">
          <label>Type</label>
          <select v-model="versoForm.card_type">
            <option v-for="t in cardTypes" :key="t.code" :value="t.code">{{ t.label }}</option>
          </select>
        </div>
        <div class="field-row">
          <label>Dimensions</label>
          <div class="dims-row">
            <span class="dim-fixed">{{ versoForm.width_mm }}</span>
            <span class="dim-sep">×</span>
            <span class="dim-fixed">{{ versoForm.height_mm }}</span>
            <span class="dim-unit">mm</span>
            <button type="button" class="btn-swap" title="Échanger largeur / hauteur" @click="swapDims(versoForm)">⇄</button>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="cancelCreateVerso">Annuler</button>
          <button class="btn-primary" @click="createVerso" :disabled="!versoForm.name">Créer et lier</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/utils/api.js'
import { isHexLayout } from '@/utils/hexGeometry.js'
import { useInlineRename } from '@/composables/useInlineRename.js'
import LayoutSettingsModal from '@/components/layouts/LayoutSettingsModal.vue'

const router = useRouter()
const layouts    = ref([])
const cardTypes  = ref([])
const showCreate = ref(false)
const editingLayout = ref(null)
const search     = ref('')
const sortKey    = ref('name')
const faceTab    = ref('recto')

const rectoLayouts = computed(() => layouts.value.filter(l => !l.is_back))
const versoLayouts = computed(() => layouts.value.filter(l => l.is_back))

const {
  renamingId,
  renameValue,
  startRename,
  cancelRename,
  renameRef,
  onRenameBlur,
  commitRename,
} = useInlineRename(
  (item) => item.name,
  async (item, name) => {
    const updated = await api.updateLayout(item.id, { name })
    item.name = updated.name ?? name
  },
)

function openEditor(l) {
  if (renamingId.value) return
  router.push(`/editor/${l.id}`)
}

const filtered = computed(() => {
  let list = faceTab.value === 'verso' ? versoLayouts.value : rectoLayouts.value
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

function thumbStyle(l) {
  const MAX = 48
  const ratio = l.height_mm / l.width_mm
  return { width: `${MAX}px`, height: `${Math.round(MAX * ratio)}px` }
}

function openEdit(l) {
  editingLayout.value = l
}

async function createFromPayload(payload) {
  const layout = await api.createLayout(payload)
  layouts.value.push(layout)
  return layout
}

async function saveEditFromPayload(payload) {
  const id = editingLayout.value?.id
  if (!id) throw new Error('Layout introuvable')
  const updated = await api.updateLayout(id, payload)
  const idx = layouts.value.findIndex(x => x.id === id)
  if (idx !== -1) {
    layouts.value[idx] = { ...layouts.value[idx], ...updated }
  }
  return updated
}

const versoCreateTarget = ref(null)
const versoForm = ref({ name: '', card_type: 'dos', width_mm: 63, height_mm: 88 })

function swapDims(obj) {
  const tmp = obj.width_mm
  obj.width_mm = obj.height_mm
  obj.height_mm = tmp
}

function onVersoSelectChange(l, value) {
  if (value === '__create__') {
    versoCreateTarget.value = l
    versoForm.value = {
      name: `${l.name} (dos)`,
      card_type: l.card_type,
      width_mm: l.width_mm,
      height_mm: l.height_mm,
    }
  } else {
    linkVerso(l, value)
  }
}

function cancelCreateVerso() {
  versoCreateTarget.value = null
}

async function createVerso() {
  const recto = versoCreateTarget.value
  const verso = await api.createLayout({
    name: versoForm.value.name,
    card_type: versoForm.value.card_type,
    width_mm: versoForm.value.width_mm,
    height_mm: versoForm.value.height_mm,
    is_back: true,
    back_layout_id: null,
  })
  layouts.value.push(verso)
  await api.updateLayout(recto.id, { back_layout_id: verso.id })
  recto.back_layout_id = verso.id
  versoCreateTarget.value = null
}

async function linkVerso(l, versoId) {
  await api.updateLayout(l.id, { back_layout_id: versoId || null })
  l.back_layout_id = versoId || null
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

.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.search-bar { margin-bottom: 14px; }
.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 13px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  outline: none;
}
.search-input:focus { border-color: var(--accent-primary); }
.search-input::placeholder { color: var(--text-muted); }

.sort-select {
  padding: 5px 8px; font-size: 12px;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); outline: none; cursor: pointer;
}

.face-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.face-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 12px; font-weight: 500;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-muted); cursor: pointer;
  transition: color 100ms, border-color 100ms, background 100ms;
}
.face-tab:hover { color: var(--text-primary); border-color: var(--border-default); }
.face-tab.active { color: var(--accent-primary); border-color: var(--accent-primary); background: rgba(108,122,255,0.08); }
.tab-count {
  font-size: 10px; font-family: var(--font-mono);
  background: var(--bg-deep); border-radius: 10px;
  padding: 1px 5px; color: var(--text-muted);
}
.face-tab.active .tab-count { background: rgba(108,122,255,0.15); color: var(--accent-primary); }

.items-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 120ms, background 120ms;
  min-width: 0;
}
.item-row:hover { border-color: var(--accent-primary); background: var(--bg-tertiary); }

.row-thumb {
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
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(108,122,255,0.04) 4px,
    rgba(108,122,255,0.04) 8px
  );
}
.ph-dims { font-family: var(--font-mono); font-size: 9px; color: var(--text-secondary); font-weight: 600; }

.row-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.row-name {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
}
.row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.row-dims {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}

.row-verso {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 1 220px;
  min-width: 140px;
}
.verso-label { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.verso-select {
  flex: 1; min-width: 0; font-size: 11px; padding: 4px 6px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: 3px; color: var(--text-secondary); cursor: pointer; outline: none;
}
.verso-select:focus { border-color: var(--accent-primary); }

.tile-verso-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--accent-primary); font-family: var(--font-mono);
}

.row-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
}
.act-btn {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: 3px; cursor: pointer; font-size: 12px; color: var(--text-muted);
  transition: color 80ms, border-color 80ms, background 80ms;
}
.act-btn:hover { color: var(--text-primary); border-color: var(--accent-primary); background: var(--bg-tertiary); }
.act-del:hover { color: #ef4444; border-color: #ef4444; }

.tile-rename-input {
  width: 100%;
  font-size: 13px; font-weight: 600; box-sizing: border-box;
  background: var(--bg-deep); color: var(--text-primary);
  border: 1px solid var(--accent-primary); border-radius: 3px;
  padding: 2px 6px; outline: none;
}

.dim-fixed {
  width: 40px; text-align: center; font-size: 12px;
  font-family: var(--font-mono); color: var(--text-secondary);
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); padding: 4px 6px;
}
.dim-sep { font-size: 12px; color: var(--text-muted); }
.dim-unit { font-size: 11px; color: var(--text-muted); }
.btn-swap {
  padding: 3px 8px; font-size: 14px; line-height: 1;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary);
  transition: color 80ms, border-color 80ms;
}
.btn-swap:hover { color: var(--accent-primary); border-color: var(--accent-primary); }

.modal-hint { font-size: 11px; color: var(--text-muted); margin: -4px 0 8px; line-height: 1.5; }
.dims-row { display: flex; align-items: center; gap: 5px; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
</style>
