<template>
  <div class="mp-wrap" ref="wrapRef">
    <button type="button" class="mp-btn" @click.stop="toggle" :title="modelValue || 'Choisir un média'">
      <img v-if="previewUrl" :src="previewUrl" class="mp-thumb" />
      <span v-else class="mp-btn-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
          <circle cx="5.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
          <path d="M1.5 11.5 5.5 8l2.5 2.5 2-1.5 4.5 3.5" />
        </svg>
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="mp-popover"
        :style="popoverStyle"
        ref="popoverRef"
        @click.stop
      >
        <input
          v-model="search"
          class="mp-search"
          placeholder="Rechercher par nom…"
          autofocus
        />
        <select v-model="folderId" class="mp-folder">
          <option value="">Tous les dossiers</option>
          <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>

        <div v-if="uploading" class="mp-status">{{ uploadStatus }}</div>

        <div class="mp-grid">
          <div
            v-for="m in filtered" :key="m.id"
            class="mp-item"
            :class="{ active: m.id === modelValue || m.filename === modelValue }"
            @click="select(m)"
            :title="`${m.original_name}${folderLabel(m) ? ' — ' + folderLabel(m) : ''}`"
          >
            <img v-if="isImage(m)" :src="`/uploads/${m.filename}`" />
            <span v-else class="mp-svg">SVG</span>
            <span class="mp-name">{{ m.original_name }}</span>
          </div>
          <div v-if="!filtered.length" class="mp-empty">Aucun fichier</div>
        </div>

        <div class="mp-footer">
          <div class="mp-footer-left">
            <button
              type="button"
              class="mp-clear"
              :class="{ 'is-blocked': !canUpload }"
              :aria-disabled="!canUpload || !!uploading"
              :title="addImageTitle"
              @click="pickFile(false)"
            >
              <svg class="mp-ico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3" />
                <circle cx="5.2" cy="6" r="1.1" fill="currentColor" />
                <path d="M1.5 11.5 5.2 8.2l2.3 2.2 2-1.4 4.5 3.2" fill="none" stroke="currentColor" stroke-width="1.3" />
                <path d="M12.2 4.2v3.2M10.6 5.8h3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
              </svg>
              Image
            </button>
            <button
              type="button"
              class="mp-clear"
              :class="{ 'is-blocked': !canUpload }"
              :aria-disabled="!canUpload || !!uploading"
              :title="addNobgTitle"
              @click="pickFile(true)"
            >
              <svg class="mp-ico" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M2 3.5h7.5a1 1 0 0 1 1 1V12H3a1 1 0 0 1-1-1V3.5Z" fill="none" stroke="currentColor" stroke-width="1.3" />
                <path d="M5.5 7.2 8 9.5l2.8-3.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M10.5 3.2 14 6.7M14 3.2 10.5 6.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
              </svg>
              Sans fond
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display:none"
              @change="onFileChosen"
            />
          </div>
          <button type="button" class="mp-clear" @click="select(null)">✕ Effacer</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/utils/api.js'

const props = defineProps({
  modelValue: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const search = ref('')
const folderId = ref('')
const media = ref([])
const folders = ref([])
const wrapRef = ref(null)
const popoverRef = ref(null)
const fileInput = ref(null)
const uploading = ref(false)
const uploadStatus = ref('')
const removeBgNext = ref(false)
const popoverStyle = ref({})

const canUpload = computed(() => !!folderId.value && !uploading.value)

const folderById = computed(() => {
  const map = {}
  for (const f of folders.value) map[f.id] = f
  return map
})

const addBlockedTitle = 'Sélectionner un dossier pour y ajouter une image'

const addImageTitle = computed(() => {
  if (!folderId.value) return addBlockedTitle
  const name = folderById.value[folderId.value]?.name || folderId.value
  return `Ajouter une image dans « ${name} »`
})

const addNobgTitle = computed(() => {
  if (!folderId.value) return addBlockedTitle
  const name = folderById.value[folderId.value]?.name || folderId.value
  return `Ajouter une image sans fond dans « ${name} »`
})

const previewUrl = computed(() => {
  if (!props.modelValue) return null
  const hit = media.value.find((m) => m.id === props.modelValue || m.filename === props.modelValue)
  return `/uploads/${hit?.filename || props.modelValue}`
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return media.value.filter((m) => {
    if (folderId.value && m.folder_id !== folderId.value) return false
    if (!q) return true
    const name = (m.original_name || '').toLowerCase()
    const file = (m.filename || '').toLowerCase()
    const folder = (folderById.value[m.folder_id]?.name || '').toLowerCase()
    return name.includes(q) || file.includes(q) || folder.includes(q)
  })
})

function folderLabel(m) {
  return folderById.value[m.folder_id]?.name || ''
}

function isImage(m) {
  return m.mime_type?.startsWith('image/')
}

function findPanelEl() {
  return wrapRef.value?.closest('.editor-panel')
    || wrapRef.value?.closest('.properties-panel')
    || wrapRef.value?.closest('.editor-panel-left')
}

function updatePopoverPosition() {
  if (!open.value || !wrapRef.value) return
  const btn = wrapRef.value.querySelector('.mp-btn') || wrapRef.value
  const panel = findPanelEl()
  const btnRect = btn.getBoundingClientRect()
  const panelRect = panel?.getBoundingClientRect()
  if (!panelRect) {
    popoverStyle.value = {
      position: 'fixed',
      top: `${btnRect.top}px`,
      left: `${btnRect.right + 8}px`,
      width: '280px',
      zIndex: 5000,
    }
    return
  }
  const maxH = Math.max(160, window.innerHeight - btnRect.top - 12)
  popoverStyle.value = {
    position: 'fixed',
    top: `${btnRect.top}px`,
    left: `${panelRect.left}px`,
    width: `${panelRect.width}px`,
    maxHeight: `${maxH}px`,
    zIndex: 5000,
  }
}

async function loadLists({ force = false } = {}) {
  const [m, f] = await Promise.all([
    force || !media.value.length ? api.getMedia() : Promise.resolve(media.value),
    force || !folders.value.length ? api.getFolders() : Promise.resolve(folders.value),
  ])
  media.value = m
  folders.value = (f || []).filter((x) => x.id !== 'root')
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await loadLists()
    await nextTick()
    updatePopoverPosition()
  }
}

function pickFile(withRemoveBg) {
  if (!canUpload.value) return
  removeBgNext.value = withRemoveBg
  fileInput.value?.click()
}

async function onFileChosen(e) {
  const raw = e.target.files
  const targetFolder = folderId.value
  if (!raw?.length || !targetFolder) {
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  uploading.value = true
  uploadStatus.value = removeBgNext.value ? 'Suppression du fond…' : 'Upload…'
  try {
    const { applyRemoveBgToFiles } = await import('@/utils/applyRemoveBgToFiles.js')
    const files = await applyRemoveBgToFiles(raw, {
      enabled: removeBgNext.value,
      onProgress(key, current, total) {
        if (key.includes('fetch') && total > 0) {
          uploadStatus.value = `Modèle rembg ${Math.round((100 * current) / total)}%…`
        } else if (removeBgNext.value) {
          uploadStatus.value = 'Suppression du fond…'
        }
      },
    })
    uploadStatus.value = 'Envoi…'
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    fd.append('folder_id', targetFolder)
    const results = await api.uploadMedia(fd)
    await loadLists({ force: true })
    const created = Array.isArray(results)
      ? results.find((r) => !r.duplicate) || results[0]
      : null
    if (created?.id) select(created)
  } catch (err) {
    console.error('MediaPicker upload failed', err)
    uploadStatus.value = err.message || 'Échec upload'
    setTimeout(() => { if (!uploading.value) uploadStatus.value = '' }, 2500)
  } finally {
    uploading.value = false
    if (!uploadStatus.value.startsWith('Échec')) uploadStatus.value = ''
    if (fileInput.value) fileInput.value.value = ''
    removeBgNext.value = false
  }
}

function select(m) {
  emit('update:modelValue', m ? m.id : null)
  open.value = false
}

function onOutsideClick(e) {
  if (!open.value) return
  const inWrap = wrapRef.value?.contains(e.target)
  const inPop = popoverRef.value?.contains(e.target)
  if (!inWrap && !inPop) open.value = false
}

function onViewportChange() {
  if (open.value) updatePopoverPosition()
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    updatePopoverPosition()
  }
})

onMounted(() => {
  document.addEventListener('mousedown', onOutsideClick)
  window.addEventListener('resize', onViewportChange)
  window.addEventListener('scroll', onViewportChange, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideClick)
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})
</script>

<style scoped>
.mp-wrap {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.mp-btn {
  width: 28px;
  height: 24px;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1px;
  color: var(--text-muted);
}
.mp-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); }

.mp-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mp-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

<!-- Popover teleported to body — unscoped layout styles -->
<style>
.mp-popover {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 28px rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
}

.mp-popover .mp-search,
.mp-popover .mp-folder {
  width: 100%;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-sizing: border-box;
}

.mp-popover .mp-folder {
  cursor: pointer;
}

.mp-popover .mp-status {
  font-size: 10px;
  color: var(--text-muted);
  padding: 0 2px;
}

.mp-popover .mp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 4px;
  overflow-y: auto;
  flex: 1;
  min-height: 80px;
}

.mp-popover .mp-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid transparent;
}
.mp-popover .mp-item:hover { background: var(--bg-hover); }
.mp-popover .mp-item.active {
  border-color: var(--accent-primary);
  background: rgba(108,122,255,0.1);
}

.mp-popover .mp-item img {
  width: 48px;
  height: 40px;
  object-fit: cover;
  border-radius: 2px;
}

.mp-popover .mp-svg {
  width: 48px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  font-weight: 700;
  font-size: 10px;
  background: var(--bg-secondary);
  border-radius: 2px;
}

.mp-popover .mp-name {
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  max-width: 56px;
}

.mp-popover .mp-empty {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 10px;
  color: var(--text-muted);
  padding: 12px;
}

.mp-popover .mp-footer {
  border-top: 1px solid var(--border-subtle);
  padding-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mp-popover .mp-footer-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.mp-popover .mp-clear {
  background: none;
  border: none;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.mp-popover .mp-clear:hover:not(.is-blocked) { color: #ef4444; }
.mp-popover .mp-footer-left .mp-clear:hover:not(.is-blocked) {
  color: var(--accent-primary);
}
.mp-popover .mp-clear.is-blocked {
  opacity: 0.45;
  cursor: not-allowed;
}
.mp-popover .mp-clear.is-blocked:hover {
  color: var(--text-muted);
}

.mp-popover .mp-ico {
  flex-shrink: 0;
}
</style>
