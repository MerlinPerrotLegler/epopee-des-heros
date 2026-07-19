<template>
  <div class="chemin-panel">
    <div v-if="loading" class="ch-loading">Chargement…</div>
    <div v-else-if="loadError" class="ch-load-error">{{ loadError }}</div>
    <div v-else class="ch-layout">
      <aside class="ch-sidebar">
        <div class="ch-sidebar-header">
          <span class="panel-section-title">Types</span>
        </div>
        <button
          class="ch-filter-item"
          :class="{ active: !activeType }"
          @click="activeType = ''"
        >Tous</button>
        <button
          v-for="type in types"
          :key="type.id"
          class="ch-filter-item"
          :class="{ active: activeType === type.name }"
          @click="activeType = type.name"
        >
          <span class="ch-dot" :style="{ background: type.color }"></span>
          <span>{{ type.name }}</span>
        </button>

        <div class="ch-sidebar-header ch-tags-title">
          <span class="panel-section-title">Tags</span>
        </div>
        <div v-if="!tags.length" class="ch-muted">Aucun tag.</div>
        <button
          v-for="tag in tags"
          :key="tag.id"
          class="ch-filter-item"
          :class="{ active: activeTagIds.includes(tag.id) }"
          @click="toggleTag(tag.id)"
        >
          <span class="ch-dot" :style="{ background: tag.color }"></span>
          <span>{{ tag.name }}</span>
        </button>
      </aside>

      <div class="ch-main">
        <div class="ch-toolbar">
          <p class="ch-hint">
            Textures Track — dossier système <code>Chemin/Track</code>.
            Orientation : droit L→R · coin haut→gauche · impasse haut.
          </p>
          <div class="ch-toolbar-actions">
            <button class="btn-primary btn-sm" :disabled="uploading" @click="uploadInput?.click()">
              {{ uploading ? 'Upload…' : '+ Upload texture' }}
            </button>
            <input
              ref="uploadInput"
              type="file"
              accept="image/*"
              multiple
              style="display:none"
              @change="onUpload"
            />
          </div>
        </div>

        <div class="media-grid">
          <div v-for="t in filteredTracks" :key="t.id" class="media-card">
            <div class="media-thumb" @click="preview = t">
              <img :src="`/uploads/${t.filename}`" :alt="t.original_name" />
            </div>
            <div class="media-body">
              <code class="ch-id">#{{ t.track_meta?.id ?? '—' }}</code>
              <span class="ch-label">{{ t.track_meta?.label || t.original_name }}</span>
              <span class="ch-type">{{ t.track_meta?.type || 'droit' }} · {{ t.track_meta?.alignment || 'both' }}</span>
              <div class="ch-tag-chips">
                <span
                  v-for="tag in (t.tags || [])"
                  :key="tag.id"
                  class="ch-mini-chip"
                  :style="{ borderColor: tag.color, color: tag.color }"
                >{{ tag.name }}</span>
              </div>
              <div class="media-actions">
                <button class="btn-icon btn-sm" title="Éditer" @click="preview = t">✎</button>
                <button class="btn-icon btn-sm act-del" title="Supprimer" @click="confirmDelete = t">✕</button>
              </div>
            </div>
          </div>
          <div v-if="!filteredTracks.length" class="empty-state">
            <p>Aucune texture{{ activeType || activeTagIds.length ? ' pour ce filtre' : '' }}.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview + meta -->
    <div class="modal-overlay" v-if="preview" @click.self="preview = null">
      <div class="preview-modal">
        <button class="preview-close" @click="preview = null">✕</button>
        <div class="preview-thumb-wrap">
          <img :src="`/uploads/${preview.filename}`" :alt="preview.original_name" />
        </div>
        <div class="preview-meta">
          <strong>{{ preview.original_name }}</strong>
          <code>{{ preview.id }}</code>
        </div>
        <TrackMetaForm
          :media="preview"
          @saved="onTrackSaved"
          @catalogs-changed="reloadCatalogs"
        />
      </div>
    </div>

    <!-- Delete -->
    <div class="modal-overlay" v-if="confirmDelete" @click.self="confirmDelete = null">
      <div class="modal modal-danger">
        <h3>Supprimer la texture ?</h3>
        <p class="modal-hint">
          « {{ confirmDelete.track_meta?.label || confirmDelete.original_name }} »
          (#{{ confirmDelete.track_meta?.id }}) sera définitivement supprimée.
        </p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="confirmDelete = null">Annuler</button>
          <button class="btn-danger" :disabled="deleting" @click="doDelete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '@/utils/api.js'
import { reloadTrackTextures } from '@/composables/useTrackTextures.js'
import TrackMetaForm from '@/components/media/TrackMetaForm.vue'

const TRACK_FOLDER = 'chemin-track'

const loading = ref(true)
const loadError = ref('')
const tracks = ref([])
const types = ref([])
const tags = ref([])
const activeType = ref('')
const activeTagIds = ref([])
const uploadInput = ref(null)
const uploading = ref(false)
const preview = ref(null)
const confirmDelete = ref(null)
const deleting = ref(false)

const filteredTracks = computed(() => {
  return tracks.value.filter((t) => {
    if (activeType.value && t.track_meta?.type !== activeType.value) return false
    if (activeTagIds.value.length) {
      const ids = (t.tags || []).map((tag) => tag.id)
      if (!activeTagIds.value.every((id) => ids.includes(id))) return false
    }
    return true
  })
})

function toggleTag(id) {
  const i = activeTagIds.value.indexOf(id)
  if (i === -1) activeTagIds.value = [...activeTagIds.value, id]
  else activeTagIds.value = activeTagIds.value.filter((x) => x !== id)
}

async function reloadCatalogs() {
  ;[types.value, tags.value] = await Promise.all([
    api.getTrackTypes(),
    api.getTrackTags(),
  ])
}

async function loadTracks() {
  tracks.value = await api.getTrackTextures()
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    await Promise.all([loadTracks(), reloadCatalogs()])
  } catch (err) {
    loadError.value = err.message || 'Impossible de charger les textures Track'
  } finally {
    loading.value = false
  }
}

async function onUpload(e) {
  const files = e.target.files
  if (!files?.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    fd.append('folder_id', TRACK_FOLDER)
    const results = await api.uploadMedia(fd)
    await loadTracks()
    await reloadTrackTextures()
    const first = (Array.isArray(results) ? results : []).find((r) => !r.duplicate)
      || (Array.isArray(results) ? results[0] : null)
    if (first?.id) {
      const refreshed = tracks.value.find((t) => t.id === first.id)
      if (refreshed) preview.value = refreshed
    }
  } catch (err) {
    loadError.value = err.message || 'Upload échoué'
  } finally {
    uploading.value = false
    if (uploadInput.value) uploadInput.value.value = ''
  }
}

function onTrackSaved(updated) {
  const idx = tracks.value.findIndex((t) => t.id === updated.id)
  if (idx !== -1) tracks.value[idx] = updated
  preview.value = updated
}

async function doDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await api.deleteMedia(confirmDelete.value.id)
    tracks.value = tracks.value.filter((t) => t.id !== confirmDelete.value.id)
    if (preview.value?.id === confirmDelete.value.id) preview.value = null
    confirmDelete.value = null
    await reloadTrackTextures()
  } catch (err) {
    loadError.value = err.message || 'Suppression échouée'
  } finally {
    deleting.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.chemin-panel { padding: 8px 0; }
.ch-loading, .ch-load-error { padding: 24px; color: var(--text-muted); }
.ch-load-error { color: var(--danger, #c44); }
.ch-layout { display: flex; gap: 16px; align-items: flex-start; }
.ch-sidebar {
  width: 180px; flex-shrink: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 8px;
}
.ch-sidebar-header { margin: 4px 0 8px; }
.ch-tags-title { margin-top: 16px; }
.ch-filter-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  background: none; border: none; text-align: left;
  padding: 6px 8px; border-radius: var(--radius-sm);
  cursor: pointer; font-size: 12px; color: var(--text-primary);
}
.ch-filter-item:hover { background: var(--bg-hover); }
.ch-filter-item.active { background: var(--bg-tertiary); color: var(--accent-primary); font-weight: 600; }
.ch-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ch-muted { font-size: 11px; color: var(--text-muted); padding: 4px 8px; }
.ch-main { flex: 1; min-width: 0; }
.ch-toolbar {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
}
.ch-hint { margin: 0; font-size: 12px; color: var(--text-muted); max-width: 520px; line-height: 1.4; }
.ch-hint code { font-size: 11px; }
.ch-toolbar-actions { display: flex; gap: 8px; align-items: center; }
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.media-card {
  background: var(--bg-secondary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); overflow: hidden;
}
.media-thumb {
  aspect-ratio: 1; background: var(--bg-tertiary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.media-thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
.media-body { padding: 8px; display: flex; flex-direction: column; gap: 2px; }
.ch-id { font-size: 11px; color: var(--accent-primary); }
.ch-label { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ch-type { font-size: 10px; color: var(--text-muted); }
.ch-tag-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.ch-mini-chip {
  font-size: 9px; padding: 1px 5px; border: 1px solid; border-radius: 999px;
}
.media-actions { display: flex; gap: 2px; margin-top: 6px; }
.empty-state { grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-muted); }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.preview-modal {
  background: var(--bg-primary); border-radius: var(--radius-lg);
  padding: 16px; max-width: min(560px, 94vw); max-height: 90vh; overflow: auto;
  position: relative; display: flex; flex-direction: column; gap: 12px;
}
.preview-close {
  position: absolute; top: 8px; right: 8px; background: none; border: none;
  cursor: pointer; font-size: 16px; color: var(--text-muted);
}
.preview-thumb-wrap {
  background: var(--bg-tertiary); border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center; min-height: 160px;
}
.preview-thumb-wrap img { max-width: 100%; max-height: 240px; object-fit: contain; }
.preview-meta { display: flex; flex-direction: column; gap: 4px; }
.preview-meta code { font-size: 11px; color: var(--text-muted); }
.modal {
  background: var(--bg-primary); border-radius: var(--radius-lg);
  padding: 20px; max-width: 400px; width: 90%;
}
.modal-danger h3 { margin-top: 0; }
.modal-hint { color: var(--text-muted); font-size: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
