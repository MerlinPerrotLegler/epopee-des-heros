<template>
  <div class="crud-view">
    <header class="view-header">
      <h1>Instances de cartes</h1>
      <div style="display:flex; gap:8px; align-items:center">
        <select v-model="selectedLayout" @change="loadCards" style="width:200px">
          <option :value="null">— Tous les layouts —</option>
          <option v-for="l in layouts" :key="l.id" :value="l.id">{{ l.name }} ({{ l.card_type }})</option>
        </select>
        <button class="btn-primary" @click="createCard" :disabled="!selectedLayout">+ Nouvelle carte</button>
      </div>
    </header>

    <table class="cards-table" v-if="cards.length">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Layout</th>
          <th>Données (clés)</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="card in cards" :key="card.id">
          <td>
            <input v-model="card.name" @blur="saveCard(card)" class="inline-input" />
          </td>
          <td class="td-meta">{{ getLayoutName(card.layout_id) }}</td>
          <td class="td-data">
            <code>{{ Object.keys(card.data || {}).length }} bindings</code>
            <button class="btn-icon btn-sm" @click="editData(card)">✎</button>
          </td>
          <td>
            <button class="btn-danger btn-sm" @click="remove(card)">Supprimer</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty-state"><p>Aucune instance. Sélectionnez un layout et créez des cartes.</p></div>

    <!-- Data editor modal -->
    <div class="modal-overlay" v-if="editingCard" @click.self="editingCard = null">
      <div class="modal" style="min-width:500px">
        <h3>Données — {{ editingCard.name }}</h3>
        <div v-for="(val, key) in editingCard.data" :key="key" class="field-row">
          <label style="font-family:var(--font-mono); font-size:10px; min-width:180px">{{ key }}</label>
          <input :value="val" @input="editingCard.data[key] = $event.target.value" style="flex:1" />
        </div>
        <div class="field-row" style="margin-top:12px">
          <input v-model="newKey" placeholder="nouveau.binding.path" style="flex:1; font-family:var(--font-mono); font-size:10px" />
          <button class="btn-ghost btn-sm" @click="addBinding">+ Ajouter</button>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="editingCard = null">Fermer</button>
          <button class="btn-primary" @click="saveEditingCard">Sauvegarder</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/api.js'

const route = useRoute()
const layouts = ref([])
const cards = ref([])
const selectedLayout = ref(null)
const editingCard = ref(null)
const newKey = ref('')

onMounted(async () => {
  layouts.value = await api.getLayouts()
  selectedLayout.value = route.params.layoutId || null
  await loadCards()
})

async function loadCards() {
  cards.value = await api.getCards(selectedLayout.value)
}

function getLayoutName(id) {
  return layouts.value.find(l => l.id === id)?.name || id?.slice(0, 8)
}

async function createCard() {
  if (!selectedLayout.value) return
  const card = await api.createCard({ layout_id: selectedLayout.value, name: `Carte ${cards.value.length + 1}`, data: {} })
  cards.value.push(card)
}

async function saveCard(card) {
  await api.updateCard(card.id, { name: card.name, data: card.data })
}

function editData(card) {
  editingCard.value = { ...card, data: { ...card.data } }
}

function addBinding() {
  if (!newKey.value || !editingCard.value) return
  editingCard.value.data[newKey.value] = ''
  newKey.value = ''
}

async function saveEditingCard() {
  await api.updateCard(editingCard.value.id, { name: editingCard.value.name, data: editingCard.value.data })
  const idx = cards.value.findIndex(c => c.id === editingCard.value.id)
  if (idx > -1) cards.value[idx] = editingCard.value
  editingCard.value = null
}

async function remove(card) {
  if (!confirm(`Supprimer "${card.name}" ?`)) return
  await api.deleteCard(card.id)
  cards.value = cards.value.filter(c => c.id !== card.id)
}
</script>

<style scoped>
.crud-view { padding: 24px; height: 100%; overflow-y: auto; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.cards-table { width: 100%; border-collapse: collapse; }
.cards-table th { text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; padding: 8px; border-bottom: 1px solid var(--border-subtle); }
.cards-table td { padding: 6px 8px; border-bottom: 1px solid var(--border-subtle); font-size: 12px; }
.inline-input { background: transparent; border: 1px solid transparent; color: var(--text-primary); padding: 2px 4px; border-radius: 3px; font-size: 12px; width: 200px; }
.inline-input:focus { border-color: var(--accent-primary); background: var(--bg-secondary); }
.td-meta { color: var(--text-secondary); }
.td-data { display: flex; align-items: center; gap: 6px; }
.td-data code { font-family: var(--font-mono); font-size: 10px; color: var(--accent-info); }
.empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
</style>
