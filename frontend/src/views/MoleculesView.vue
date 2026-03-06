<template>
  <div class="crud-view">
    <header class="view-header">
      <h1>Molécules</h1>
      <button class="btn-primary" @click="showCreate = true">+ Nouvelle molécule</button>
    </header>
    <div class="crud-grid" v-if="items.length">
      <div v-for="item in items" :key="item.id" class="crud-card">
        <div class="crud-name">{{ item.name }}</div>
        <p class="crud-desc" v-if="item.description">{{ item.description }}</p>
        <div class="crud-meta">
          <span class="badge">{{ (item.definition?.atoms || []).length }} atomes</span>
        </div>
        <div class="crud-actions">
          <button class="btn-ghost btn-sm" @click="edit(item)">Éditer</button>
          <button class="btn-ghost btn-sm" @click="duplicate(item)">Dupliquer</button>
          <button class="btn-danger btn-sm" @click="remove(item)">Supprimer</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state"><p>Aucune molécule.</p></div>

    <div class="modal-overlay" v-if="showCreate || editing" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editing ? 'Modifier' : 'Nouvelle' }} molécule</h3>
        <div class="field-row"><label>Nom</label><input v-model="form.name" /></div>
        <div class="field-row"><label>Description</label><input v-model="form.description" /></div>
        <div class="field-row">
          <label>Définition (JSON)</label>
          <textarea v-model="formDefJson" rows="8" style="flex:1; font-family: var(--font-mono); font-size: 10px; min-height: 120px"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="closeModal">Annuler</button>
          <button class="btn-primary" @click="save">{{ editing ? 'Sauvegarder' : 'Créer' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api.js'

const items = ref([])
const showCreate = ref(false)
const editing = ref(null)
const form = ref({ name: '', description: '' })
const formDefJson = ref('{"width_mm":20,"height_mm":10,"atoms":[]}')

onMounted(async () => { items.value = await api.getMolecules() })

function edit(item) {
  editing.value = item.id
  form.value = { name: item.name, description: item.description || '' }
  formDefJson.value = JSON.stringify(item.definition, null, 2)
}

function closeModal() { showCreate.value = false; editing.value = null; form.value = { name: '', description: '' }; formDefJson.value = '{"width_mm":20,"height_mm":10,"atoms":[]}' }

async function save() {
  let def; try { def = JSON.parse(formDefJson.value) } catch { alert('JSON invalide'); return }
  if (editing.value) {
    const updated = await api.updateMolecule(editing.value, { ...form.value, definition: def })
    const idx = items.value.findIndex(i => i.id === editing.value)
    if (idx > -1) items.value[idx] = updated
  } else {
    const created = await api.createMolecule({ ...form.value, definition: def })
    items.value.push(created)
  }
  closeModal()
}

async function duplicate(item) { const d = await api.duplicateMolecule(item.id); items.value.push(d) }
async function remove(item) { if (!confirm(`Supprimer "${item.name}" ?`)) return; await api.deleteMolecule(item.id); items.value = items.value.filter(i => i.id !== item.id) }
</script>

<style scoped>
.crud-view { padding: 24px; overflow-y: auto; height: 100%; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.crud-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.crud-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; }
.crud-name { font-weight: 600; font-size: 14px; margin-bottom: 6px; }
.crud-meta { display: flex; gap: 6px; margin-bottom: 8px; }
.crud-desc { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.crud-actions { display: flex; gap: 6px; }
.empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
</style>
