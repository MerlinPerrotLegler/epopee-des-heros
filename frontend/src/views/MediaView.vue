<template>
  <div class="media-view">
    <header class="view-header">
      <h1>Bibliothèque média</h1>
      <div style="display:flex; gap:8px">
        <button class="btn-ghost" @click="showNewFolder = true">+ Dossier</button>
        <label class="btn-primary" style="cursor:pointer">
          ⤒ Upload
          <input type="file" multiple accept="image/*,.svg" @change="upload" style="display:none" />
        </label>
      </div>
    </header>

    <div class="media-layout">
      <!-- Folders -->
      <div class="folder-tree">
        <div
          v-for="f in folders" :key="f.id"
          class="folder-item"
          :class="{ active: currentFolder === f.id }"
          @click="currentFolder = f.id"
        >
          <span>📁</span>
          <span>{{ f.name }}</span>
          <button v-if="f.id !== 'root' && f.id !== 'default'" class="btn-icon btn-sm" @click.stop="deleteFolder(f)">✕</button>
        </div>
      </div>

      <!-- Files -->
      <div class="media-grid">
        <div v-for="m in filteredMedia" :key="m.id" class="media-card">
          <div class="media-thumb">
            <img v-if="m.mime_type?.startsWith('image/')" :src="`/uploads/${m.filename}`" />
            <span v-else class="svg-icon">SVG</span>
          </div>
          <div class="media-info">
            <span class="media-name" :title="m.original_name">{{ m.original_name }}</span>
            <code class="media-id">{{ m.id.slice(0, 8) }}</code>
          </div>
          <div class="media-actions">
            <button class="btn-icon btn-sm" @click="copyId(m.id)" title="Copier l'ID">📋</button>
            <button class="btn-icon btn-sm" @click="deleteMedia(m)" title="Supprimer">✕</button>
          </div>
        </div>
        <div v-if="!filteredMedia.length" class="empty-state"><p>Aucun fichier dans ce dossier.</p></div>
      </div>
    </div>

    <div class="modal-overlay" v-if="showNewFolder" @click.self="showNewFolder = false">
      <div class="modal">
        <h3>Nouveau dossier</h3>
        <div class="field-row"><label>Nom</label><input v-model="newFolderName" /></div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showNewFolder = false">Annuler</button>
          <button class="btn-primary" @click="createFolder">Créer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/api.js'

const folders = ref([])
const media = ref([])
const currentFolder = ref('root')
const showNewFolder = ref(false)
const newFolderName = ref('')

const filteredMedia = computed(() => {
  if (currentFolder.value === 'root') return media.value
  return media.value.filter(m => m.folder_id === currentFolder.value)
})

onMounted(async () => {
  [folders.value, media.value] = await Promise.all([api.getFolders(), api.getMedia()])
})

async function upload(e) {
  const files = e.target.files
  if (!files.length) return
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  fd.append('folder_id', currentFolder.value === 'root' ? 'default' : currentFolder.value)
  const results = await api.uploadMedia(fd)
  media.value.push(...results)
}

async function createFolder() {
  if (!newFolderName.value) return
  const f = await api.createFolder({ name: newFolderName.value, parent_id: currentFolder.value === 'root' ? 'root' : currentFolder.value })
  folders.value.push(f)
  showNewFolder.value = false
  newFolderName.value = ''
}

async function deleteFolder(f) {
  if (!confirm(`Supprimer le dossier "${f.name}" ?`)) return
  await api.deleteFolder(f.id)
  folders.value = folders.value.filter(x => x.id !== f.id)
}

async function deleteMedia(m) {
  if (!confirm(`Supprimer "${m.original_name}" ?`)) return
  await api.deleteMedia(m.id)
  media.value = media.value.filter(x => x.id !== m.id)
}

function copyId(id) {
  navigator.clipboard.writeText(id)
}
</script>

<style scoped>
.media-view { padding: 24px; height: 100%; overflow-y: auto; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.media-layout { display: flex; gap: 16px; }
.folder-tree { width: 200px; flex-shrink: 0; }
.folder-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; }
.folder-item:hover { background: var(--bg-hover); }
.folder-item.active { background: var(--bg-tertiary); color: var(--accent-primary); }
.media-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; align-content: start; }
.media-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
.media-thumb { height: 100px; background: var(--bg-deep); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.media-thumb img { width: 100%; height: 100%; object-fit: cover; }
.svg-icon { color: var(--accent-primary); font-weight: 700; font-size: 18px; }
.media-info { padding: 8px; }
.media-name { font-size: 11px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-id { font-size: 9px; color: var(--text-muted); }
.media-actions { display: flex; gap: 4px; padding: 0 8px 8px; }
.empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); }
</style>
