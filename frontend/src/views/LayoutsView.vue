<template>
  <div class="layouts-view">
    <header class="view-header">
      <h1>Layouts</h1>
      <button class="btn-primary" @click="showCreate = true">+ Nouveau layout</button>
    </header>

    <div class="layouts-grid" v-if="layouts.length">
      <div
        v-for="l in layouts" :key="l.id"
        class="layout-card"
        @click="$router.push(`/editor/${l.id}`)"
      >
        <div class="layout-preview" :style="previewStyle(l)">
          <span class="layout-dims">{{ l.width_mm }}×{{ l.height_mm }}mm</span>
        </div>
        <div class="layout-info">
          <div class="layout-name">{{ l.name }}</div>
          <div class="layout-meta">
            <span class="badge">{{ l.card_type }}</span>
          </div>
        </div>
        <div class="layout-actions" @click.stop>
          <button class="btn-icon btn-sm" @click="duplicate(l)" title="Dupliquer">⧉</button>
          <button class="btn-icon btn-sm" @click="confirmDelete(l)" title="Supprimer">✕</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>Aucun layout. Créez-en un pour commencer à designer vos cartes.</p>
    </div>

    <!-- Create Modal -->
    <div class="modal-overlay" v-if="showCreate" @click.self="showCreate = false">
      <div class="modal">
        <h3>Nouveau layout</h3>
        <div class="field-row">
          <label>Nom</label>
          <input v-model="form.name" placeholder="Carte équipement" />
        </div>
        <div class="field-row">
          <label>Type</label>
          <select v-model="form.card_type">
            <option v-for="t in cardTypes" :key="t.code" :value="t.code">{{ t.label }}</option>
          </select>
        </div>
        <div class="field-row">
          <label>Largeur (mm)</label>
          <input type="number" v-model.number="form.width_mm" min="10" max="500" />
        </div>
        <div class="field-row">
          <label>Hauteur (mm)</label>
          <input type="number" v-model.number="form.height_mm" min="10" max="500" />
        </div>
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

const layouts = ref([])
const cardTypes = ref([])
const showCreate = ref(false)

const form = ref({
  name: '',
  card_type: 'equipement',
  width_mm: 63,
  height_mm: 88,
  back_layout_id: null
})

const backLayouts = computed(() => layouts.value.filter(l => l.card_type === 'dos'))

onMounted(async () => {
  [layouts.value, cardTypes.value] = await Promise.all([
    api.getLayouts(),
    api.getCardTypes()
  ])
})

function previewStyle(l) {
  const maxW = 140, maxH = 100
  const scale = Math.min(maxW / l.width_mm, maxH / l.height_mm)
  return {
    width: `${l.width_mm * scale}px`,
    height: `${l.height_mm * scale}px`
  }
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
.layouts-view {
  padding: 24px;
  overflow-y: auto;
  height: 100%;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.view-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.layouts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.layout-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 16px;
  cursor: pointer;
  transition: all var(--transition-default);
  position: relative;
}

.layout-card:hover {
  border-color: var(--accent-primary);
  background: var(--bg-tertiary);
}

.layout-preview {
  background: var(--bg-deep);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-sm);
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.layout-dims {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
}

.layout-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.layout-meta {
  display: flex;
  gap: 6px;
}

.layout-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.layout-card:hover .layout-actions {
  opacity: 1;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}
</style>
