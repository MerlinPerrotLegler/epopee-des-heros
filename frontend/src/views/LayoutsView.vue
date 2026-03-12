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
            @blur="commitRename(l)"
            @keyup.enter="commitRename(l)"
            @keyup.escape="renamingId = null"
            @click.stop
            autofocus
          />
          <div v-else class="tile-name" @dblclick.stop="startRename(l)">{{ l.name }}</div>
          <div class="tile-meta">
            <span class="badge">{{ l.card_type }}</span>
            <span class="tile-size">{{ l.width_mm }}×{{ l.height_mm }} mm</span>
          </div>

          <!-- Verso link config (recto tiles only) -->
          <div v-if="!l.is_back" class="tile-verso-config" @click.stop>
            <span class="verso-label">Verso :</span>
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
          <div v-else class="tile-verso-badge">DOS</div>
        </div>

        <!-- Actions -->
        <div class="tile-actions" @click.stop>
          <button class="act-btn" title="Renommer" @click="startRename(l)">✎</button>
          <button class="act-btn" title="Dupliquer" @click="duplicate(l)">⧉</button>
          <button class="act-btn act-del" title="Supprimer" @click="confirmDelete(l)">✕</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p v-if="search">Aucun layout correspondant à « {{ search }} ».</p>
      <p v-else-if="faceTab === 'verso'">Aucun layout verso. Créez-en un via le sélecteur "Verso" d'un layout recto.</p>
      <p v-else>Aucun layout. Créez-en un pour commencer à designer vos cartes.</p>
    </div>

    <!-- Create Layout Modal -->
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
        <div class="field-row">
          <label>Dimensions</label>
          <div class="dims-row">
            <input type="number" v-model.number="form.width_mm" min="10" max="500" class="dim-input" placeholder="Larg." />
            <span class="dim-sep">×</span>
            <input type="number" v-model.number="form.height_mm" min="10" max="500" class="dim-input" placeholder="Haut." />
            <span class="dim-unit">mm</span>
            <button type="button" class="btn-swap" title="Échanger largeur / hauteur" @click="swapDims(form)">⇄</button>
          </div>
        </div>
        <div class="field-row">
          <label>Dos de carte</label>
          <input type="checkbox" v-model="form.is_back" style="width:auto;cursor:pointer" />
        </div>
        <div v-if="!form.is_back" class="field-row">
          <label>Verso lié</label>
          <select v-model="form.back_layout_id">
            <option :value="null">— Aucun —</option>
            <option v-for="bl in versoLayouts" :key="bl.id" :value="bl.id">{{ bl.name }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showCreate = false">Annuler</button>
          <button class="btn-primary" @click="create" :disabled="!form.name">Créer</button>
        </div>
      </div>
    </div>

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
import { api } from '@/utils/api.js'

const layouts    = ref([])
const cardTypes  = ref([])
const showCreate = ref(false)
const search     = ref('')
const sortKey    = ref('name')
const faceTab    = ref('recto')

const form = ref({ name: '', card_type: 'equipement', width_mm: 63, height_mm: 88, is_back: false, back_layout_id: null })

const rectoLayouts = computed(() => layouts.value.filter(l => !l.is_back))
const versoLayouts = computed(() => layouts.value.filter(l => l.is_back))

// ── Inline rename ─────────────────────────────────────────────────────────────
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
  await api.updateLayout(item.id, { name })
  item.name = name
}

// ── Filter / sort ─────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function thumbStyle(l) {
  const MAX = 120
  const ratio = l.height_mm / l.width_mm
  return { width: `${MAX}px`, height: `${Math.round(MAX * ratio)}px` }
}

function swapDims(obj) {
  const tmp = obj.width_mm
  obj.width_mm = obj.height_mm
  obj.height_mm = tmp
}

// ── Create layout (main modal) ────────────────────────────────────────────────
async function create() {
  const layout = await api.createLayout({
    name: form.value.name,
    card_type: form.value.card_type,
    width_mm: form.value.width_mm,
    height_mm: form.value.height_mm,
    is_back: form.value.is_back,
    back_layout_id: form.value.is_back ? null : form.value.back_layout_id,
  })
  layouts.value.push(layout)
  showCreate.value = false
  form.value = { name: '', card_type: 'equipement', width_mm: 63, height_mm: 88, is_back: false, back_layout_id: null }
}

// ── Verso link + quick-create ─────────────────────────────────────────────────
const versoCreateTarget = ref(null) // the recto layout we're creating a verso for
const versoForm = ref({ name: '', card_type: 'dos', width_mm: 63, height_mm: 88 })

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
  // Link the recto to the new verso
  await api.updateLayout(recto.id, { back_layout_id: verso.id })
  recto.back_layout_id = verso.id
  versoCreateTarget.value = null
}

async function linkVerso(l, versoId) {
  await api.updateLayout(l.id, { back_layout_id: versoId || null })
  l.back_layout_id = versoId || null
}

// ── Duplicate / delete ────────────────────────────────────────────────────────
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

.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
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

/* Recto / Verso tabs */
.face-tabs { display: flex; gap: 4px; margin-bottom: 16px; }
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

/* Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

/* Tile */
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
.tile-info { flex: 1; min-width: 0; padding-top: 2px; padding-bottom: 28px; display: flex; flex-direction: column; gap: 4px; }
.tile-name {
  font-weight: 600; font-size: 13px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  cursor: text;
}
.tile-rename-input {
  font-size: 13px; font-weight: 600; width: 100%;
  background: var(--bg-deep); color: var(--text-primary);
  border: 1px solid var(--accent-primary); border-radius: 3px;
  padding: 1px 4px; outline: none;
}
.tile-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tile-size { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }

/* Verso config (recto tiles) */
.tile-verso-config { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.verso-label { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.verso-select {
  flex: 1; min-width: 0; font-size: 10px; padding: 2px 4px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: 3px; color: var(--text-secondary); cursor: pointer; outline: none;
}
.verso-select:focus { border-color: var(--accent-primary); }

/* Verso badge (verso tiles) */
.tile-verso-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--accent-primary); font-family: var(--font-mono);
  margin-top: 2px;
}

/* Actions */
.tile-actions { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 2px; }
.act-btn {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: 3px; cursor: pointer; font-size: 12px; color: var(--text-muted);
  transition: color 80ms, border-color 80ms, background 80ms;
}
.act-btn:hover { color: var(--text-primary); border-color: var(--accent-primary); background: var(--bg-tertiary); }
.act-del:hover { color: #ef4444; border-color: #ef4444; }

/* Dimensions row (modals) */
.dims-row { display: flex; align-items: center; gap: 5px; }
.dim-input {
  width: 58px; padding: 4px 6px; font-size: 12px; text-align: center;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); outline: none;
}
.dim-input:focus { border-color: var(--accent-primary); }
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

/* Modal hint */
.modal-hint { font-size: 11px; color: var(--text-muted); margin: -4px 0 8px; line-height: 1.5; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
</style>
