<template>
  <div class="media-view">

    <!-- Model download progress banner -->
    <Transition name="banner">
      <div v-if="downloadProgress" class="model-banner">
        <span class="model-banner-label">
          Chargement du modèle IA (première utilisation)… {{ downloadPct }}%
        </span>
        <div class="model-progress-track">
          <div class="model-progress-fill" :style="{ width: downloadPct + '%' }"></div>
        </div>
      </div>
    </Transition>

    <!-- Toasts -->
    <div class="toast-area">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.msg }}</div>
      </TransitionGroup>
    </div>

    <header class="view-header">
      <h1>Bibliothèque média</h1>
      <div style="display:flex; gap:8px">
        <button class="btn-ghost" @click="showNewFolder = true">+ Dossier</button>
        <button class="btn-primary" @click="fileInput.click()">⤒ Upload</button>
        <input ref="fileInput" type="file" multiple accept="image/*" style="display:none" @change="upload" />
      </div>
    </header>

    <div class="media-layout">
      <!-- Folders -->
      <div class="folder-tree">
        <div
          v-for="f in folders" :key="f.id"
          class="folder-item"
          :class="{ active: currentFolder === f.id, 'drop-target': dragOver === f.id }"
          @click="currentFolder = f.id"
          @dragover.prevent="dragOver = f.id"
          @dragleave="dragOver = null"
          @drop.prevent="onDropToFolder(f.id)"
        >
          <span>📁</span>
          <span>{{ f.name }}</span>
          <button v-if="f.id !== 'root' && f.id !== 'default' && f.id !== 'builtin'" class="btn-icon btn-sm" @click.stop="deleteFolder(f)">✕</button>
        </div>
      </div>

      <!-- Grid -->
      <div class="media-grid">
        <div
          v-for="m in filteredMedia" :key="m.id"
          class="media-card"
          :class="{ processing: processingId === m.id }"
          draggable="true"
          @dragstart="onDragStart(m)"
          @dragend="draggedMedia = null"
        >
          <!-- Thumbnail -->
          <div class="media-thumb" @click="preview = m">
            <img v-if="isImage(m)" :src="`/uploads/${m.filename}`" :alt="m.original_name" />
            <span v-else class="file-icon">{{ fileExt(m) }}</span>
            <div v-if="processingId === m.id" class="thumb-processing">
              <div class="thumb-spinner"></div>
              <span class="thumb-processing-label">Traitement…</span>
            </div>
          </div>

          <!-- Name + actions -->
          <div class="media-body">
            <div class="media-name-wrap">
              <input
                v-if="renamingId === m.id"
                class="media-name-input"
                v-model="renameValue"
                @blur="commitRename(m)"
                @keyup.enter="commitRename(m)"
                @keyup.escape="renamingId = null"
                @click.stop
                autofocus
              />
              <span v-else class="media-name" :title="m.original_name">{{ m.original_name }}</span>
            </div>
            <div class="media-actions">
              <button v-if="canRemoveBg(m)" class="btn-icon btn-sm btn-rembg" :disabled="!!processingId" @click.stop="removeBgFor(m)" title="Supprimer le fond">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                  <line x1="1" y1="11" x2="6.5" y2="5.5"/><line x1="6" y1="6" x2="11" y2="1" stroke-width="1.8"/>
                  <line x1="9" y1="4.5" x2="9" y2="3"/><line x1="8.2" y1="3.8" x2="9.8" y2="3.8"/>
                  <line x1="3.5" y1="9.5" x2="3.5" y2="8"/><line x1="2.8" y1="8.8" x2="4.2" y2="8.8"/>
                </svg>
              </button>
              <button class="btn-icon btn-sm" @click.stop="startRename(m)" title="Renommer">✎</button>
              <button class="btn-icon btn-sm" @click.stop="copyId(m.id)" title="Copier l'ID">⧉</button>
              <button class="btn-icon btn-sm act-del" @click.stop="deleteMedia(m)" title="Supprimer">✕</button>
            </div>
          </div>
        </div>

        <div v-if="!filteredMedia.length" class="empty-state"><p>Aucun fichier dans ce dossier.</p></div>
      </div>
    </div>

    <!-- Preview lightbox -->
    <div class="modal-overlay" v-if="preview" @click.self="preview = null">
      <div class="preview-modal">
        <button class="preview-close" @click="preview = null">✕</button>
        <div class="preview-thumb-wrap">
          <img v-if="isImage(preview)" :src="`/uploads/${preview.filename}`" />
        </div>
        <div class="preview-meta">
          <strong>{{ preview.original_name }}</strong>
          <code>{{ preview.id }}</code>
          <div style="display:flex; gap:8px; margin-top:4px">
            <button v-if="canRemoveBg(preview)" class="btn-ghost btn-sm" :disabled="!!processingId" @click="removeBgFor(preview); preview = null">✦ Supprimer le fond</button>
            <button class="btn-primary btn-sm" @click="copyId(preview.id); preview = null">⧉ Copier l'ID</button>
          </div>
        </div>
      </div>
    </div>

    <!-- New folder modal -->
    <div class="modal-overlay" v-if="showNewFolder" @click.self="showNewFolder = false">
      <div class="modal">
        <h3>Nouveau dossier</h3>
        <div class="field-row"><label>Nom</label><input v-model="newFolderName" @keyup.enter="createFolder" /></div>
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

const folders       = ref([])
const media         = ref([])
const currentFolder = ref('root')
const showNewFolder = ref(false)
const newFolderName = ref('')
const fileInput     = ref(null)
const preview       = ref(null)
const draggedMedia  = ref(null)
const dragOver      = ref(null)

const filteredMedia = computed(() => {
  if (currentFolder.value === 'root') return media.value
  return media.value.filter(m => m.folder_id === currentFolder.value)
})

// ── Inline rename ─────────────────────────────────────────────────────────────
const renamingId  = ref(null)
const renameValue = ref('')

function startRename(m) { renamingId.value = m.id; renameValue.value = m.original_name }

async function commitRename(m) {
  if (!renamingId.value) return
  renamingId.value = null
  const name = renameValue.value.trim()
  if (!name || name === m.original_name) return
  try {
    const updated = await api.updateMedia(m.id, { original_name: name })
    const idx = media.value.findIndex(x => x.id === m.id)
    if (idx !== -1) media.value[idx] = { ...media.value[idx], original_name: updated.original_name }
  } catch (e) { console.error('Rename failed', e) }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isImage(m)     { return m.mime_type?.startsWith('image/') }
function isSvg(m)       { return m.mime_type === 'image/svg+xml' }
function canRemoveBg(m) { return isImage(m) && !isSvg(m) }
function fileExt(m)     { return m.original_name?.split('.').pop()?.toUpperCase() || 'FILE' }

// ── Load ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    [folders.value, media.value] = await Promise.all([api.getFolders(), api.getMedia()])
  } catch (e) { console.error('Failed to load media', e) }
})

// ── Upload ────────────────────────────────────────────────────────────────────
async function upload(e) {
  const files = e.target.files
  if (!files.length) return
  const fd = new FormData()
  for (const f of files) fd.append('files', f)
  fd.append('folder_id', currentFolder.value === 'root' ? 'default' : currentFolder.value)
  try {
    const results = await api.uploadMedia(fd)
    if (Array.isArray(results)) media.value.push(...results)
  } catch (e) { console.error('Upload failed', e) }
  finally { if (fileInput.value) fileInput.value.value = '' }
}

// ── Remove background ─────────────────────────────────────────────────────────
const processingId     = ref(null)
const downloadProgress = ref(null)

const downloadPct = computed(() => {
  if (!downloadProgress.value?.total) return 0
  return Math.round((downloadProgress.value.current / downloadProgress.value.total) * 100)
})

async function removeBgFor(m) {
  if (processingId.value) return
  processingId.value = m.id
  downloadProgress.value = null
  try {
    const { removeBg } = await import('@/utils/removeBackground.js')
    const blob = await removeBg(`/uploads/${m.filename}`, {
      onProgress(key, current, total) {
        if (key.includes('fetch') && total > 0) {
          downloadProgress.value = { current, total }
        } else {
          downloadProgress.value = null
        }
      },
    })
    downloadProgress.value = null

    const baseName = m.original_name.replace(/\.[^.]+$/, '')
    const outName  = `${baseName}_nobg.png`
    const fd = new FormData()
    fd.append('files', new File([blob], outName, { type: 'image/png' }))
    fd.append('folder_id', m.folder_id || 'default')
    const results = await api.uploadMedia(fd)
    if (Array.isArray(results) && results.length > 0) {
      media.value.unshift(results[0])
      showToast(`Fond supprimé → ${outName}`)
    }
  } catch (e) {
    console.error('Remove background failed', e)
    showToast('Échec du traitement', 'error')
  } finally {
    processingId.value = null
    downloadProgress.value = null
  }
}

// ── Toasts ────────────────────────────────────────────────────────────────────
const toasts = ref([])
let toastId = 0
function showToast(msg, type = 'success') {
  const id = ++toastId
  toasts.value.push({ id, type, msg })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 4000)
}

// ── Folders / media CRUD ──────────────────────────────────────────────────────
async function createFolder() {
  if (!newFolderName.value) return
  const f = await api.createFolder({ name: newFolderName.value, parent_id: 'root' })
  folders.value.push(f)
  showNewFolder.value = false
  newFolderName.value = ''
}

async function deleteFolder(f) {
  if (!confirm('Supprimer le dossier "' + f.name + '" ?')) return
  await api.deleteFolder(f.id)
  folders.value = folders.value.filter(x => x.id !== f.id)
  if (currentFolder.value === f.id) currentFolder.value = 'root'
}

async function deleteMedia(m) {
  if (!confirm('Supprimer "' + m.original_name + '" ?')) return
  await api.deleteMedia(m.id)
  media.value = media.value.filter(x => x.id !== m.id)
  if (preview.value?.id === m.id) preview.value = null
}

function copyId(id) { navigator.clipboard.writeText(id) }
function onDragStart(m) { draggedMedia.value = m }

async function onDropToFolder(targetFolderId) {
  dragOver.value = null
  if (!draggedMedia.value) return
  if (draggedMedia.value.folder_id === targetFolderId) return
  const updated = await api.updateMedia(draggedMedia.value.id, { folder_id: targetFolderId })
  const idx = media.value.findIndex(m => m.id === updated.id)
  if (idx !== -1) media.value[idx] = updated
  draggedMedia.value = null
}
</script>

<style scoped>
.media-view { padding: 24px; height: 100%; overflow-y: auto; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.media-layout { display: flex; gap: 16px; }

/* Model download banner */
.model-banner {
  position: sticky; top: 0; z-index: 10;
  background: var(--bg-tertiary); border: 1px solid var(--accent-primary);
  border-radius: var(--radius-sm); padding: 8px 12px;
  margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;
}
.model-banner-label { font-size: 11px; color: var(--accent-primary); }
.model-progress-track { height: 4px; border-radius: 2px; background: var(--bg-deep); overflow: hidden; }
.model-progress-fill { height: 100%; border-radius: 2px; background: var(--accent-primary); transition: width 200ms; }
.banner-enter-active, .banner-leave-active { transition: opacity 200ms, transform 200ms; }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translateY(-8px); }

/* Toasts */
.toast-area { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; pointer-events: none; }
.toast { background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 10px 16px; font-size: 12px; color: var(--text-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: auto; }
.toast.success { border-color: #22c55e; color: #22c55e; }
.toast.error   { border-color: #ef4444; color: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: opacity 250ms, transform 250ms; }
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to   { opacity: 0; transform: translateX(20px); }

/* Folders */
.folder-tree { width: 200px; flex-shrink: 0; }
.folder-item { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; border: 2px solid transparent; transition: border-color 100ms, background 100ms; }
.folder-item:hover { background: var(--bg-hover); }
.folder-item.active { background: var(--bg-tertiary); color: var(--accent-primary); }
.folder-item.drop-target { border-color: var(--accent-primary); background: rgba(108,122,255,0.12); }

/* Grid */
.media-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; align-content: start; }

/* Card */
.media-card { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; cursor: grab; display: flex; flex-direction: column; transition: border-color 100ms; }
.media-card:hover { border-color: var(--border-default); }
.media-card:active { cursor: grabbing; }
.media-card.processing { border-color: var(--accent-primary); }

/* Thumbnail — Photoshop checkerboard + no crop */
.media-thumb {
  height: 110px; position: relative;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; cursor: pointer; flex-shrink: 0;
  background-color: #b0b0b0;
  background-image: linear-gradient(45deg,#888 25%,transparent 25%), linear-gradient(-45deg,#888 25%,transparent 25%), linear-gradient(45deg,transparent 75%,#888 75%), linear-gradient(-45deg,transparent 75%,#888 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}
.media-thumb:hover { opacity: 0.9; }
.media-thumb img { max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; }
.file-icon { color: var(--accent-primary); font-weight: 700; font-size: 13px; font-family: var(--font-mono); }

/* Processing overlay */
.thumb-processing { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.thumb-spinner { width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.25); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
.thumb-processing-label { font-size: 10px; color: rgba(255,255,255,0.85); font-family: var(--font-mono); }
@keyframes spin { to { transform: rotate(360deg); } }

/* Name + actions */
.media-body { flex: 1; display: flex; flex-direction: column; padding: 7px 8px 6px; }
.media-name-wrap { flex: 1; min-width: 0; margin-bottom: 5px; }
.media-name { font-size: 11px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); }
.media-name-input { font-size: 11px; display: block; width: 100%; box-sizing: border-box; background: var(--bg-deep); color: var(--text-primary); border: 1px solid var(--accent-primary); border-radius: 3px; padding: 1px 4px; outline: none; }
.media-actions { display: flex; gap: 2px; justify-content: flex-end; }
.act-del:hover { color: #ef4444 !important; }

/* Remove-bg wand button */
.btn-rembg { color: var(--text-muted); display: flex; align-items: center; justify-content: center; }
.btn-rembg:hover:not(:disabled) { color: var(--accent-primary); }
.btn-rembg:disabled { opacity: 0.35; cursor: not-allowed; }

.empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); }

/* Preview */
.preview-modal { background: var(--bg-primary); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; max-width: 80vw; max-height: 80vh; display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative; }
.preview-thumb-wrap {
  background-color: #b0b0b0;
  background-image: linear-gradient(45deg,#888 25%,transparent 25%), linear-gradient(-45deg,#888 25%,transparent 25%), linear-gradient(45deg,transparent 75%,#888 75%), linear-gradient(-45deg,transparent 75%,#888 75%);
  background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; max-width: 100%;
}
.preview-thumb-wrap img { max-width: 100%; max-height: 60vh; object-fit: contain; display: block; border-radius: var(--radius-sm); }
.preview-close { position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px; }
.preview-close:hover { color: var(--text-primary); }
.preview-meta { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; }
.preview-meta strong { color: var(--text-primary); }
.preview-meta code { color: var(--text-muted); font-size: 10px; }
.btn-sm { font-size: 11px; padding: 4px 10px; }
</style>
