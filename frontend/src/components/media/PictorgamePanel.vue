<template>
  <div class="pictorgame-panel">
    <div v-if="initialLoading" class="pg-loading">Chargement…</div>
    <div v-else-if="initialLoadError" class="pg-load-error">{{ initialLoadError }}</div>
    <div v-else class="pg-layout">
      <!-- Tags sidebar -->
      <aside class="pg-tags">
        <div class="pg-tags-header">
          <span class="panel-section-title">Tags</span>
          <button class="btn-ghost btn-sm" @click="openNewTag">+ Tag</button>
        </div>
        <div v-if="!pictosStore.tags.length" class="pg-empty-tags">Aucun tag.</div>
        <div
          v-for="tag in pictosStore.tags"
          :key="tag.id"
          class="pg-tag-item"
          :class="{ active: activeFilterTags.includes(tag.id) }"
          @click="toggleFilterTag(tag.id)"
        >
          <span class="pg-tag-dot" :style="{ background: tag.color }"></span>
          <span class="pg-tag-name">{{ tag.name }}</span>
          <div class="pg-tag-actions" @click.stop>
            <button class="btn-icon btn-sm" title="Éditer" @click="openEditTag(tag)">✎</button>
            <button class="btn-icon btn-sm act-del" title="Supprimer" @click="confirmDeleteTag = tag">✕</button>
          </div>
        </div>
      </aside>

      <!-- Main area -->
      <div class="pg-main">
        <div class="pg-toolbar">
          <div class="pg-chips">
            <button
              class="pg-chip"
              :class="{ active: !activeFilterTags.length }"
              @click="activeFilterTags = []"
            >Tous</button>
            <button
              v-for="tag in pictosStore.tags"
              :key="tag.id"
              class="pg-chip"
              :class="{ active: activeFilterTags.includes(tag.id) }"
              :style="chipStyle(tag)"
              @click="toggleFilterTag(tag.id)"
            >{{ tag.name }}</button>
          </div>
          <div class="pg-toolbar-actions">
            <button class="btn-ghost btn-sm" @click="openLinkPicker">+ Lier média</button>
            <label class="rembg-toggle" title="Traiter l'image avant ouverture du formulaire">
              <input type="checkbox" v-model="removeBgOnUpload" :disabled="!!processingId" />
              Supprimer le fond
            </label>
            <button class="btn-primary btn-sm" :disabled="!!processingId" @click="uploadInput?.click()">+ Upload picto</button>
            <input ref="uploadInput" type="file" accept="image/*" style="display:none" @change="onUploadFile" />
          </div>
        </div>

        <div class="media-grid">
          <div v-for="p in filteredPictos" :key="p.id" class="media-card" :class="{ processing: processingId === p.id }">
            <div class="media-thumb" @click="preview = p">
              <img :src="pictoSrc(p)" :alt="p.picto_ref" />
            </div>
            <div class="media-body">
              <code class="pg-ref">{{ p.picto_ref }}</code>
              <span class="pg-label">{{ p.picto_label || '—' }}</span>
              <div class="pg-tag-chips">
                <span
                  v-for="t in p.tags"
                  :key="t.id"
                  class="pg-mini-chip"
                  :style="{ borderColor: t.color, color: t.color }"
                >{{ t.name }}</span>
              </div>
              <div class="media-actions">
                <button
                  class="btn-icon btn-sm btn-rembg"
                  :disabled="!!processingId"
                  title="Supprimer le fond"
                  @click="removeBgFor(p)"
                >
                  ✦
                </button>
                <button class="btn-icon btn-sm" title="Éditer" @click="openEditPicto(p)">✎</button>
                <button class="btn-icon btn-sm act-del" title="Supprimer" @click="confirmDeletePicto = p">✕</button>
              </div>
            </div>
          </div>
          <div v-if="!filteredPictos.length" class="empty-state">
            <p>Aucun picto{{ activeFilterTags.length ? ' pour ce filtre' : '' }}.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div class="modal-overlay" v-if="preview" @click.self="preview = null">
      <div class="preview-modal">
        <button class="preview-close" @click="preview = null">✕</button>
        <div class="preview-thumb-wrap">
          <img :src="pictoSrc(preview)" :alt="preview.picto_ref" />
        </div>
        <div class="preview-meta">
          <code>{{ preview.picto_ref }}</code>
          <strong>{{ preview.picto_label || '—' }}</strong>
          <div class="preview-actions">
            <button
              class="btn-ghost btn-sm"
              :disabled="!!processingId"
              @click="removeBgFor(preview)"
            >✦ Supprimer le fond</button>
          </div>
        </div>
      </div>
    </div>

    <!-- New / edit tag -->
    <div class="modal-overlay" v-if="tagForm" @click.self="tagForm = null">
      <div class="modal">
        <h3>{{ tagForm.id ? 'Éditer le tag' : 'Nouveau tag' }}</h3>
        <div class="field-row"><label>Nom</label><input v-model="tagForm.name" @keyup.enter="saveTag" /></div>
        <div class="field-row">
          <label>Couleur</label>
          <input type="color" v-model="tagForm.color" class="pg-color-input" />
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="tagForm = null">Annuler</button>
          <button class="btn-primary" :disabled="!tagForm.name.trim()" @click="saveTag">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- Delete tag -->
    <div class="modal-overlay" v-if="confirmDeleteTag" @click.self="confirmDeleteTag = null">
      <div class="modal modal-danger">
        <h3>Supprimer le tag ?</h3>
        <p class="modal-hint">« {{ confirmDeleteTag.name }} » sera retiré des pictos.</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="confirmDeleteTag = null">Annuler</button>
          <button class="btn-danger" @click="deleteTag">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Upload / link / edit picto -->
    <div class="modal-overlay" v-if="pictoForm" @click.self="closePictoForm">
      <div class="modal">
        <h3>{{ pictoFormModeTitle }}</h3>
        <div v-if="pictoFormPreviewSrc" class="pg-form-preview">
          <img :src="pictoFormPreviewSrc" alt="" />
        </div>
        <div class="field-row">
          <label>Ref</label>
          <input v-model="pictoForm.picto_ref" placeholder="ex: or, une-main" />
        </div>
        <div class="field-row">
          <label>Label</label>
          <input v-model="pictoForm.picto_label" placeholder="Libellé affiché" />
        </div>
        <div class="field-row pg-tags-field">
          <label>Tags</label>
          <div class="pg-tag-checks">
            <label v-for="tag in pictosStore.tags" :key="tag.id" class="pg-tag-check">
              <input type="checkbox" :value="tag.id" v-model="pictoForm.tagIds" />
              <span class="pg-tag-dot" :style="{ background: tag.color }"></span>
              {{ tag.name }}
            </label>
            <span v-if="!pictosStore.tags.length" class="pg-muted">Créez des tags d'abord.</span>
          </div>
        </div>
        <p v-if="pictoFormError" class="pg-error">{{ pictoFormError }}</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="closePictoForm">Annuler</button>
          <button class="btn-primary" :disabled="savingPicto" @click="savePicto">{{ pictoForm.id ? 'Enregistrer' : 'Créer' }}</button>
        </div>
      </div>
    </div>

    <!-- Link media picker -->
    <div class="modal-overlay" v-if="linkPickerOpen" @click.self="linkPickerOpen = false">
      <div class="modal pg-link-modal">
        <h3>Lier un média</h3>
        <div v-if="linkLoading" class="pg-muted">Chargement…</div>
        <div v-else class="pg-link-grid">
          <button
            v-for="m in linkableMedia"
            :key="m.id"
            type="button"
            class="pg-link-item"
            @click="selectLinkMedia(m)"
          >
            <img v-if="m.mime_type?.startsWith('image/')" :src="`/uploads/${m.filename || m.id}`" :alt="m.original_name" />
            <span v-else class="file-icon">{{ m.original_name?.split('.').pop()?.toUpperCase() }}</span>
            <span class="pg-link-name">{{ m.original_name }}</span>
          </button>
          <div v-if="!linkableMedia.length" class="pg-muted">Aucun média disponible.</div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="linkPickerOpen = false">Annuler</button>
        </div>
      </div>
    </div>

    <!-- Delete picto -->
    <div class="modal-overlay" v-if="confirmDeletePicto" @click.self="confirmDeletePicto = null">
      <div class="modal modal-danger">
        <h3>Supprimer le picto ?</h3>
        <p class="modal-hint">« {{ confirmDeletePicto.picto_ref }} » sera définitivement supprimé.</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="confirmDeletePicto = null">Annuler</button>
          <button class="btn-danger" @click="deletePicto">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Toasts -->
    <div class="toast-area">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.msg }}</div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '@/utils/api.js'
import { usePictosStore } from '@/stores/pictos.js'

const pictosStore = usePictosStore()

const activeFilterTags = ref([])
const preview = ref(null)
const uploadInput = ref(null)
const uploadFile = ref(null)
const linkPickerOpen = ref(false)
const linkLoading = ref(false)
const linkableMedia = ref([])
const linkSourceId = ref(null)

const tagForm = ref(null)
const confirmDeleteTag = ref(null)

const pictoForm = ref(null)
const pictoFormMode = ref('upload') // upload | link | edit
const pictoFormError = ref('')
const savingPicto = ref(false)
const confirmDeletePicto = ref(null)

const initialLoading = ref(true)
const initialLoadError = ref(null)
const uploadBlobUrl = ref(null)

const removeBgOnUpload = ref(false)
const processingId = ref(null)
const downloadProgress = ref(null)
const thumbBust = ref({})

const REF_RE = /^[a-zA-Z0-9_-]+$/

function revokeUploadBlobUrl() {
  if (uploadBlobUrl.value) {
    URL.revokeObjectURL(uploadBlobUrl.value)
    uploadBlobUrl.value = null
  }
}

watch(uploadFile, (file) => {
  revokeUploadBlobUrl()
  if (file) uploadBlobUrl.value = URL.createObjectURL(file)
})

const filteredPictos = computed(() => {
  if (!activeFilterTags.value.length) return pictosStore.pictos
  return pictosStore.pictos.filter((p) =>
    (p.tags || []).some((t) => activeFilterTags.value.includes(t.id)),
  )
})

const pictoFormModeTitle = computed(() => {
  if (pictoFormMode.value === 'edit') return 'Éditer le picto'
  if (pictoFormMode.value === 'link') return 'Lier un média'
  return 'Upload picto'
})

const pictoFormPreviewSrc = computed(() => {
  if (!pictoForm.value) return null
  if (pictoFormMode.value === 'upload' && uploadBlobUrl.value) {
    return uploadBlobUrl.value
  }
  if (pictoFormMode.value === 'link' && linkSourceId.value) {
    const m = linkableMedia.value.find((x) => x.id === linkSourceId.value)
    if (m) return `/uploads/${m.filename || m.id}`
  }
  if (pictoFormMode.value === 'edit' && pictoForm.value.id) {
    return pictoSrc(pictoForm.value)
  }
  return null
})

function pictoSrc(p) {
  const base = `/uploads/${p.filename || p.id}`
  const t = thumbBust.value[p.id]
  return t ? `${base}?t=${t}` : base
}

async function removeBgFor(p) {
  if (!p?.id || processingId.value) return
  processingId.value = p.id
  downloadProgress.value = null
  try {
    const { removeBg } = await import('@/utils/removeBackground.js')
    const imgResp = await fetch(pictoSrc(p).split('?')[0])
    if (!imgResp.ok) throw new Error(`Cannot fetch image: ${imgResp.status}`)
    const imgBlob = await imgResp.blob()
    const blob = await removeBg(imgBlob, {
      onProgress(key, current, total) {
        if (key.includes('fetch') && total > 0) {
          downloadProgress.value = { current, total }
        } else {
          downloadProgress.value = null
        }
      },
    })
    downloadProgress.value = null
    const base = (p.original_name || p.picto_ref || 'picto').replace(/\.[^.]+$/, '')
    const fd = new FormData()
    fd.append('files', new File([blob], `${base}.png`, { type: 'image/png' }))
    await api.replacePictoContent(p.id, fd)
    thumbBust.value = { ...thumbBust.value, [p.id]: Date.now() }
    await pictosStore.load(true)
    showToast('Fond supprimé')
  } catch (e) {
    console.error(e)
    showToast(e.message || 'Échec suppression fond', 'error')
  } finally {
    processingId.value = null
    downloadProgress.value = null
  }
}

function chipStyle(tag) {
  if (!activeFilterTags.value.includes(tag.id)) return {}
  return { borderColor: tag.color, color: tag.color, background: `${tag.color}22` }
}

function toggleFilterTag(tagId) {
  const idx = activeFilterTags.value.indexOf(tagId)
  if (idx === -1) activeFilterTags.value.push(tagId)
  else activeFilterTags.value.splice(idx, 1)
}

function openNewTag() {
  tagForm.value = { name: '', color: '#888888' }
}

function openEditTag(tag) {
  tagForm.value = { id: tag.id, name: tag.name, color: tag.color }
}

async function saveTag() {
  const f = tagForm.value
  if (!f?.name?.trim()) return
  try {
    if (f.id) {
      await api.updatePictoTag(f.id, { name: f.name.trim(), color: f.color })
    } else {
      await api.createPictoTag({ name: f.name.trim(), color: f.color })
    }
    tagForm.value = null
    await pictosStore.load(true)
    showToast('Tag enregistré')
  } catch (e) {
    showToast(e.message || 'Erreur tag', 'error')
  }
}

async function deleteTag() {
  const tag = confirmDeleteTag.value
  if (!tag) return
  confirmDeleteTag.value = null
  try {
    await api.deletePictoTag(tag.id)
    activeFilterTags.value = activeFilterTags.value.filter((id) => id !== tag.id)
    await pictosStore.load(true)
    showToast('Tag supprimé')
  } catch (e) {
    showToast(e.message || 'Erreur suppression', 'error')
  }
}

async function onUploadFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (uploadInput.value) uploadInput.value.value = ''

  processingId.value = '__upload__'
  try {
    const { applyRemoveBgToFiles } = await import('@/utils/applyRemoveBgToFiles.js')
    const [processed] = await applyRemoveBgToFiles([file], {
      enabled: removeBgOnUpload.value,
      onProgress(key, current, total) {
        if (key.includes('fetch') && total > 0) {
          downloadProgress.value = { current, total }
        } else {
          downloadProgress.value = null
        }
      },
    })
    downloadProgress.value = null
    uploadFile.value = processed
    linkSourceId.value = null
    pictoFormMode.value = 'upload'
    pictoFormError.value = ''
    const base = processed.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    pictoForm.value = { picto_ref: base, picto_label: '', tagIds: [] }
  } catch (err) {
    showToast(err.message || 'Échec suppression fond', 'error')
  } finally {
    processingId.value = null
    downloadProgress.value = null
  }
}

async function openLinkPicker() {
  linkPickerOpen.value = true
  linkLoading.value = true
  try {
    linkableMedia.value = await api.getMedia()
  } catch (e) {
    showToast('Impossible de charger les médias', 'error')
    linkPickerOpen.value = false
  } finally {
    linkLoading.value = false
  }
}

function selectLinkMedia(m) {
  linkPickerOpen.value = false
  linkSourceId.value = m.id
  uploadFile.value = null
  pictoFormMode.value = 'link'
  pictoFormError.value = ''
  const base = m.original_name?.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'picto'
  pictoForm.value = { picto_ref: base, picto_label: '', tagIds: [] }
}

function openEditPicto(p) {
  uploadFile.value = null
  linkSourceId.value = null
  pictoFormMode.value = 'edit'
  pictoFormError.value = ''
  pictoForm.value = {
    id: p.id,
    picto_ref: p.picto_ref,
    picto_label: p.picto_label || '',
    tagIds: (p.tags || []).map((t) => t.id),
    filename: p.filename,
    source_media_id: p.source_media_id,
  }
}

function closePictoForm() {
  pictoForm.value = null
  uploadFile.value = null
  linkSourceId.value = null
  pictoFormError.value = ''
  revokeUploadBlobUrl()
}

function validatePictoForm() {
  const ref = String(pictoForm.value?.picto_ref || '').trim()
  if (!ref || !REF_RE.test(ref)) {
    pictoFormError.value = 'Ref invalide (a-z, 0-9, _, - uniquement)'
    return null
  }
  pictoFormError.value = ''
  return ref
}

async function savePicto() {
  const ref = validatePictoForm()
  if (!ref || savingPicto.value) return
  const label = String(pictoForm.value.picto_label || '').trim()
  const tagIds = [...(pictoForm.value.tagIds || [])]
  savingPicto.value = true
  try {
    if (pictoFormMode.value === 'edit') {
      await api.updatePicto(pictoForm.value.id, { picto_ref: ref, picto_label: label, tagIds })
    } else if (pictoFormMode.value === 'upload') {
      if (!uploadFile.value) {
        pictoFormError.value = 'Fichier requis'
        return
      }
      const fd = new FormData()
      fd.append('files', uploadFile.value)
      fd.append('picto_ref', ref)
      fd.append('picto_label', label)
      fd.append('tagIds', JSON.stringify(tagIds))
      await api.createPictoUpload(fd)
    } else {
      if (!linkSourceId.value) {
        pictoFormError.value = 'Média source requis'
        return
      }
      await api.createPictoLink({
        source_media_id: linkSourceId.value,
        picto_ref: ref,
        picto_label: label,
        tagIds,
      })
    }
    closePictoForm()
    await pictosStore.load(true)
    showToast('Picto enregistré')
  } catch (e) {
    pictoFormError.value = e.message || 'Erreur enregistrement'
  } finally {
    savingPicto.value = false
  }
}

async function deletePicto() {
  const p = confirmDeletePicto.value
  if (!p) return
  confirmDeletePicto.value = null
  try {
    await api.deletePicto(p.id)
    if (preview.value?.id === p.id) preview.value = null
    await pictosStore.load(true)
    showToast('Picto supprimé')
  } catch (e) {
    showToast(e.message || 'Erreur suppression', 'error')
  }
}

const toasts = ref([])
let toastId = 0
function showToast(msg, type = 'success') {
  const id = ++toastId
  toasts.value.push({ id, type, msg })
  setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id) }, 4000)
}

onMounted(async () => {
  try {
    await pictosStore.load()
  } catch (e) {
    initialLoadError.value = e.message || 'Impossible de charger les pictos'
  } finally {
    initialLoading.value = false
  }
})

onUnmounted(revokeUploadBlobUrl)
</script>

<style scoped>
.pictorgame-panel { padding: 0; }
.pg-loading, .pg-load-error { text-align: center; padding: 40px; min-height: 200px; color: var(--text-muted); font-size: 12px; }
.pg-load-error { color: #ef4444; }
.pg-layout { display: flex; gap: 16px; min-height: 400px; }

.pg-tags { width: 200px; flex-shrink: 0; }
.pg-tags-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.pg-empty-tags { font-size: 11px; color: var(--text-muted); padding: 8px 0; }
.pg-tag-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: var(--radius-sm); cursor: pointer; font-size: 12px;
  border: 2px solid transparent; margin-bottom: 2px;
}
.pg-tag-item:hover { background: var(--bg-hover); }
.pg-tag-item.active { background: var(--bg-tertiary); border-color: var(--accent-primary); }
.pg-tag-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.pg-tag-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-tag-actions { display: flex; gap: 0; opacity: 0; transition: opacity 100ms; }
.pg-tag-item:hover .pg-tag-actions { opacity: 1; }

.pg-main { flex: 1; min-width: 0; }
.pg-toolbar { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.pg-chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.pg-chip {
  font-size: 11px; padding: 3px 10px; border-radius: 12px; cursor: pointer;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-secondary);
}
.pg-chip:hover { border-color: var(--border-default); color: var(--text-primary); }
.pg-chip.active { font-weight: 600; }
.pg-toolbar-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }

.rembg-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
  cursor: pointer;
}
.rembg-toggle input { cursor: pointer; }

.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; align-content: start; }
.media-card {
  background: var(--bg-secondary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); overflow: hidden; display: flex; flex-direction: column;
}
.media-card:hover { border-color: var(--border-default); }
.media-card.processing { border-color: var(--accent-primary); }
.media-thumb {
  height: 110px; display: flex; align-items: center; justify-content: center;
  overflow: hidden; cursor: pointer; flex-shrink: 0;
  background-color: #b0b0b0;
  background-image: linear-gradient(45deg,#888 25%,transparent 25%), linear-gradient(-45deg,#888 25%,transparent 25%), linear-gradient(45deg,transparent 75%,#888 75%), linear-gradient(-45deg,transparent 75%,#888 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}
.media-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.media-body { padding: 7px 8px 6px; display: flex; flex-direction: column; gap: 3px; }
.pg-ref { font-size: 10px; color: var(--accent-primary); font-family: var(--font-mono); }
.pg-label { font-size: 11px; color: var(--text-secondary); line-height: 1.3; }
.pg-tag-chips { display: flex; flex-wrap: wrap; gap: 4px; min-height: 18px; }
.pg-mini-chip {
  font-size: 9px; padding: 1px 5px; border-radius: 8px;
  border: 1px solid; background: transparent;
}
.media-actions { display: flex; gap: 2px; justify-content: flex-end; margin-top: 4px; }
.btn-rembg { color: var(--text-muted); display: flex; align-items: center; justify-content: center; }
.btn-rembg:hover:not(:disabled) { color: var(--accent-primary); }
.btn-rembg:disabled { opacity: 0.35; cursor: not-allowed; }
.act-del:hover { color: #ef4444 !important; }
.empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); }
.file-icon { color: var(--accent-primary); font-weight: 700; font-size: 13px; font-family: var(--font-mono); }

.preview-modal {
  background: var(--bg-primary); border: 1px solid var(--border-default);
  border-radius: var(--radius-lg); padding: 16px; max-width: 80vw; max-height: 80vh;
  display: flex; flex-direction: column; align-items: center; gap: 12px; position: relative;
}
.preview-thumb-wrap {
  background-color: #b0b0b0;
  background-image: linear-gradient(45deg,#888 25%,transparent 25%), linear-gradient(-45deg,#888 25%,transparent 25%), linear-gradient(45deg,transparent 75%,#888 75%), linear-gradient(-45deg,transparent 75%,#888 75%);
  background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;
}
.preview-thumb-wrap img { max-width: 100%; max-height: 60vh; object-fit: contain; display: block; }
.preview-close { position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px; }
.preview-meta { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; }
.preview-actions { display: flex; gap: 8px; margin-top: 4px; }

.modal-danger h3 { color: #ef4444; }
.modal-hint { font-size: 11px; color: var(--text-muted); margin: -4px 0 8px; line-height: 1.5; }
.btn-danger {
  padding: 6px 14px; font-size: 12px; font-weight: 500; cursor: pointer;
  background: #ef4444; border: 1px solid #ef4444; border-radius: var(--radius-sm); color: #fff;
}
.btn-danger:hover { background: #dc2626; border-color: #dc2626; }

.pg-color-input { width: 48px; height: 28px; padding: 0; border: none; cursor: pointer; flex: 0 0 auto !important; }
.pg-form-preview {
  display: flex; justify-content: center; margin-bottom: 12px;
  background-color: #b0b0b0; border-radius: var(--radius-sm); padding: 8px; max-height: 120px;
}
.pg-form-preview img { max-height: 100px; max-width: 100%; object-fit: contain; }
.pg-tags-field { align-items: flex-start; }
.pg-tag-checks { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.pg-tag-check { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
.pg-tag-check input { flex: 0 0 auto; width: auto; }
.pg-muted { font-size: 11px; color: var(--text-muted); }
.pg-error { font-size: 11px; color: #ef4444; margin: 8px 0 0; }

.pg-link-modal { min-width: 480px; max-width: 640px; }
.pg-link-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px; max-height: 50vh; overflow-y: auto; margin-bottom: 8px;
}
.pg-link-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 6px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
  background: var(--bg-tertiary); cursor: pointer; font-size: 10px;
}
.pg-link-item:hover { border-color: var(--accent-primary); }
.pg-link-item img { width: 64px; height: 64px; object-fit: contain; }
.pg-link-name { text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; color: var(--text-secondary); }

.toast-area { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; pointer-events: none; }
.toast { background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 10px 16px; font-size: 12px; color: var(--text-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: auto; }
.toast.success { border-color: #22c55e; color: #22c55e; }
.toast.error { border-color: #ef4444; color: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: opacity 250ms, transform 250ms; }
.toast-enter-from { opacity: 0; transform: translateX(20px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
