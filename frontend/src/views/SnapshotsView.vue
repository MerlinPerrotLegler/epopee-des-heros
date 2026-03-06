<template>
  <div class="crud-view">
    <header class="view-header">
      <h1>Versions (Snapshots)</h1>
      <div style="display:flex; gap:8px; align-items:center">
        <input v-model="newLabel" placeholder="Label du snapshot (optionnel)" style="width:240px" />
        <button class="btn-primary" @click="create">Créer un snapshot</button>
      </div>
    </header>

    <table class="cards-table" v-if="snapshots.length">
      <thead>
        <tr>
          <th>Date</th>
          <th>Label</th>
          <th>Version code</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in snapshots" :key="s.id">
          <td style="font-family:var(--font-mono); font-size:11px">{{ formatDate(s.created_at) }}</td>
          <td>{{ s.label || '—' }}</td>
          <td><code>{{ s.code_version }}</code></td>
          <td style="display:flex; gap:6px">
            <button class="btn-ghost btn-sm" @click="restore(s)">Restaurer</button>
            <button class="btn-danger btn-sm" @click="remove(s)">Supprimer</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty-state"><p>Aucun snapshot. Créez-en un pour sauvegarder l'état actuel de la base.</p></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api.js'

const snapshots = ref([])
const newLabel = ref('')

onMounted(async () => { snapshots.value = await api.getSnapshots() })

function formatDate(d) {
  return new Date(d).toLocaleString('fr-FR')
}

async function create() {
  const s = await api.createSnapshot(newLabel.value || undefined)
  snapshots.value.unshift(s)
  newLabel.value = ''
}

async function restore(s) {
  if (!confirm(`Restaurer le snapshot "${s.label || s.created_at}" ?\nATTENTION : toutes les données actuelles seront remplacées.`)) return
  await api.restoreSnapshot(s.id)
  alert('Snapshot restauré. Rechargez la page.')
  window.location.reload()
}

async function remove(s) {
  if (!confirm('Supprimer ce snapshot ?')) return
  await api.deleteSnapshot(s.id)
  snapshots.value = snapshots.value.filter(x => x.id !== s.id)
}
</script>

<style scoped>
.crud-view { padding: 24px; height: 100%; overflow-y: auto; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.cards-table { width: 100%; border-collapse: collapse; }
.cards-table th { text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; padding: 8px; border-bottom: 1px solid var(--border-subtle); }
.cards-table td { padding: 8px; border-bottom: 1px solid var(--border-subtle); font-size: 13px; }
.empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
</style>
