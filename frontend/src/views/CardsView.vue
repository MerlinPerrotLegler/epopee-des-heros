<template>
  <div class="cards-view">
    <header class="view-header">
      <h1>Cartes</h1>
      <div class="header-actions">
        <select v-model="selectedLayout" @change="loadCards" class="layout-select">
          <option :value="null">— Tous les layouts —</option>
          <option v-for="l in layouts" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
        <button v-if="selectedLayout" class="btn-ghost btn-sm" @click="exportCsv" title="Exporter en CSV">⤓ CSV</button>
        <button class="btn-ghost btn-sm" @click="showImportWizard = true">↑ Import CSV</button>
        <button class="btn-primary btn-sm" @click="createCard" :disabled="!selectedLayout">+ Nouvelle carte</button>
      </div>
    </header>

    <!-- Import jobs banner (if any jobs for this layout) -->
    <div v-if="activeJobs.length" class="jobs-bar">
      <span class="jobs-label">⟳ Sources liées :</span>
      <div v-for="job in activeJobs" :key="job.id" class="job-chip">
        <span class="job-name">{{ job.label }}</span>
        <span class="job-count">{{ job.instance_count }} cartes</span>
        <span v-if="job.last_synced_at" class="job-sync">
          Sync {{ formatDate(job.last_synced_at) }}
        </span>
        <button class="btn-icon btn-xs" @click="syncJob(job)" :disabled="syncing === job.id" title="Synchroniser">
          <span :class="{ spinning: syncing === job.id }">↺</span>
        </button>
        <button class="btn-icon btn-xs danger" @click="confirmDeleteJob(job)" title="Supprimer ce job">×</button>
      </div>
    </div>

    <!-- Card table -->
    <div class="table-wrap" v-if="cards.length">
      <table class="cards-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Layout</th>
            <th>Source</th>
            <th>Bindings</th>
            <th class="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="card in cards" :key="card.id">
            <td>
              <input v-model="card.name" @blur="saveCard(card)" class="inline-input" />
            </td>
            <td class="td-meta">{{ getLayoutName(card.layout_id) }}</td>
            <td class="td-source">
              <span v-if="card.import_job_id" class="import-badge" :title="getJobLabel(card.import_job_id)">
                ⟳ import
              </span>
            </td>
            <td class="td-data">
              <code>{{ Object.keys(card.data || {}).length }}</code>
            </td>
            <td class="td-actions">
              <button class="btn-icon" title="Éditer les données" @click="editCard(card)">✎</button>
              <button class="btn-icon btn-danger" title="Supprimer" @click="deleteTarget = card">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-state">
      <p v-if="selectedLayout">Aucune carte pour ce layout.</p>
      <p v-else>Sélectionnez un layout ou importez des cartes.</p>
    </div>

    <!-- Data editor modal -->
    <div class="modal-overlay" v-if="editingCard" @click.self="editingCard = null">
      <div class="modal data-modal">
        <div class="modal-header">
          <h3>{{ editingCard.name }}</h3>
          <button class="btn-icon" @click="editingCard = null">×</button>
        </div>

        <div class="data-fields">
          <div v-for="(val, key) in editingCard.data" :key="key" class="data-field">
            <label class="field-key">{{ key }}</label>
            <input :value="val" @input="editingCard.data[key] = $event.target.value" class="field-val" />
            <button class="btn-icon btn-danger btn-xs" @click="removeBinding(key)">×</button>
          </div>
          <div v-if="!Object.keys(editingCard.data).length" class="empty-data">Aucune donnée.</div>
        </div>

        <div class="add-binding">
          <input v-model="newKey" placeholder="chemin.binding" class="new-key-input"
            list="binding-paths-list"
            @keyup.enter="addBinding" />
          <datalist id="binding-paths-list">
            <option v-for="p in editingCardPaths" :key="p.path" :value="p.path" />
          </datalist>
          <button class="btn-ghost btn-sm" @click="addBinding" :disabled="!newKey">+ Ajouter</button>
        </div>

        <div class="modal-actions">
          <button class="btn-ghost" @click="editingCard = null">Annuler</button>
          <button class="btn-primary" @click="saveEditingCard">Sauvegarder</button>
        </div>
      </div>
    </div>

    <!-- Delete card confirmation -->
    <div class="modal-overlay" v-if="deleteTarget" @click.self="deleteTarget = null">
      <div class="modal modal-sm">
        <h3>Supprimer cette carte ?</h3>
        <p class="modal-text">« {{ deleteTarget.name }} » sera définitivement supprimée.</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="deleteTarget = null">Annuler</button>
          <button class="btn-danger" @click="confirmDelete">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Delete job confirmation -->
    <div class="modal-overlay" v-if="deleteJobTarget" @click.self="deleteJobTarget = null">
      <div class="modal modal-sm">
        <h3>Supprimer ce job d'import ?</h3>
        <p class="modal-text">
          Le job « {{ deleteJobTarget.label }} » sera supprimé.
          Les {{ deleteJobTarget.instance_count }} cartes liées <strong>ne seront pas</strong> supprimées.
        </p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="deleteJobTarget = null">Annuler</button>
          <button class="btn-danger" @click="confirmDeleteJobAction">Supprimer le job</button>
        </div>
      </div>
    </div>

    <!-- Import Wizard -->
    <ImportWizard
      v-if="showImportWizard"
      :layouts="layouts"
      @close="showImportWizard = false"
      @imported="onImported"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/api.js'
import { getBindablePaths } from '@/utils/binding.js'
import ImportWizard from '@/components/cards/ImportWizard.vue'

const route = useRoute()

const layouts = ref([])
const cards = ref([])
const importJobs = ref([])
const selectedLayout = ref(null)
const editingCard = ref(null)
const editingCardPaths = ref([])
const newKey = ref('')
const deleteTarget = ref(null)
const deleteJobTarget = ref(null)
const showImportWizard = ref(false)
const syncing = ref(null)

onMounted(async () => {
  layouts.value = await api.getLayouts()
  importJobs.value = await api.getImportJobs()
  selectedLayout.value = route.params.layoutId || null
  await loadCards()
})

const activeJobs = computed(() => {
  if (!selectedLayout.value) return importJobs.value
  return importJobs.value.filter(j => j.layout_id === selectedLayout.value || !j.layout_id)
})

async function loadCards() {
  cards.value = await api.getCards(selectedLayout.value)
}

function getLayoutName(id) {
  return layouts.value.find(l => l.id === id)?.name || id?.slice(0, 8) || '—'
}

function getJobLabel(jobId) {
  return importJobs.value.find(j => j.id === jobId)?.label || jobId?.slice(0, 8)
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

async function createCard() {
  if (!selectedLayout.value) return
  const card = await api.createCard({
    layout_id: selectedLayout.value,
    name: `Carte ${cards.value.length + 1}`,
    data: {}
  })
  cards.value.push(card)
}

async function saveCard(card) {
  await api.updateCard(card.id, { name: card.name })
}

async function editCard(card) {
  editingCard.value = { ...card, data: { ...card.data } }
  // Load binding paths for this card's layout
  try {
    const layout = await api.getLayout(card.layout_id)
    const def = typeof layout.definition === 'string' ? JSON.parse(layout.definition) : layout.definition
    editingCardPaths.value = getBindablePaths(def)
  } catch { editingCardPaths.value = [] }
}

function removeBinding(key) {
  if (!editingCard.value) return
  const d = { ...editingCard.value.data }
  delete d[key]
  editingCard.value = { ...editingCard.value, data: d }
}

function addBinding() {
  if (!newKey.value || !editingCard.value) return
  editingCard.value.data[newKey.value] = ''
  newKey.value = ''
}

async function saveEditingCard() {
  await api.updateCard(editingCard.value.id, { name: editingCard.value.name, data: editingCard.value.data })
  const idx = cards.value.findIndex(c => c.id === editingCard.value.id)
  if (idx > -1) cards.value[idx] = { ...editingCard.value }
  editingCard.value = null
}

async function confirmDelete() {
  const card = deleteTarget.value
  if (!card) return
  deleteTarget.value = null
  await api.deleteCard(card.id)
  cards.value = cards.value.filter(c => c.id !== card.id)
}

async function syncJob(job) {
  syncing.value = job.id
  try {
    const result = await api.syncImportJob(job.id)
    // Refresh jobs list and cards
    importJobs.value = await api.getImportJobs()
    await loadCards()
    // Update job stats inline
    const idx = importJobs.value.findIndex(j => j.id === job.id)
    if (idx > -1) importJobs.value[idx] = { ...importJobs.value[idx], ...result }
  } catch (e) {
    alert(`Erreur sync : ${e.message}`)
  } finally {
    syncing.value = null
  }
}

function confirmDeleteJob(job) {
  deleteJobTarget.value = job
}

async function confirmDeleteJobAction() {
  const job = deleteJobTarget.value
  if (!job) return
  deleteJobTarget.value = null
  await api.deleteImportJob(job.id)
  importJobs.value = importJobs.value.filter(j => j.id !== job.id)
}

async function onImported(result) {
  showImportWizard.value = false
  importJobs.value = await api.getImportJobs()
  await loadCards()
}

function exportCsv() {
  if (!selectedLayout.value) return
  const url = api.exportCardsUrl(selectedLayout.value)
  window.open(url, '_blank')
}
</script>

<style scoped>
.cards-view { padding: 24px; height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 0; }

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.view-header h1 { font-size: 20px; font-weight: 600; }

.header-actions { display: flex; gap: 8px; align-items: center; }

.layout-select {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 12px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  min-width: 180px;
}

.jobs-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  margin-bottom: 16px;
  font-size: 11px;
}

.jobs-label { color: var(--text-muted); font-weight: 600; flex-shrink: 0; }

.job-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
}
.job-name { font-weight: 500; color: var(--text-primary); }
.job-count { color: var(--accent-info, #2196f3); font-family: var(--font-mono); }
.job-sync { color: var(--text-muted); }

.spinning { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.btn-xs { padding: 1px 4px; font-size: 11px; }
.btn-xs.danger { color: var(--accent-danger); }

.table-wrap { flex: 1; overflow-y: auto; }

.cards-table { width: 100%; border-collapse: collapse; }
.cards-table th {
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  background: var(--bg-primary);
}
.cards-table td { padding: 5px 8px; border-bottom: 1px solid var(--border-subtle); font-size: 12px; }
.th-actions { text-align: right; }

.inline-input {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-primary);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
  width: 200px;
}
.inline-input:focus { border-color: var(--accent-primary); background: var(--bg-secondary); outline: none; }

.td-meta { color: var(--text-secondary); }
.td-source { }
.td-data code { font-family: var(--font-mono); font-size: 10px; color: var(--accent-info, #2196f3); }
.td-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }

.import-badge {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  padding: 1px 6px;
  border-radius: 10px;
}

.empty-state { flex: 1; text-align: center; padding: 60px; color: var(--text-muted); }

/* Data editor modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0;
  min-width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.modal-sm { min-width: 340px; max-width: 400px; padding: 20px; }
.modal-sm h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.modal-text { font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; }

.data-modal { }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.modal-header h3 { font-size: 13px; font-weight: 600; margin: 0; }

.data-fields {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.data-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-key {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  min-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.field-val {
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 12px;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
}
.empty-data { color: var(--text-muted); font-size: 12px; padding: 8px 0; }

.add-binding {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.new-key-input {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
