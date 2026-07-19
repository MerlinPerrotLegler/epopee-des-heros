<template>
  <form class="track-meta-form" @submit.prevent="save">
    <div class="tm-heading">
      <strong>Métadonnées de track</strong>
      <span v-if="saved" class="tm-success">Enregistré</span>
    </div>

    <div class="tm-grid">
      <label>
        <span>ID</span>
        <input :value="form.id" readonly />
      </label>
      <label>
        <span>Label</span>
        <input v-model="form.label" placeholder="Libellé optionnel" />
      </label>
      <label>
        <span>Type</span>
        <select v-model="form.type">
          <option v-for="type in types" :key="type.id" :value="type.name">{{ type.name }}</option>
        </select>
      </label>
      <label>
        <span>Alignement</span>
        <select v-model="form.alignment">
          <option value="both">Les deux</option>
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </label>
    </div>

    <p class="tm-hint">{{ orientationHint }}</p>

    <fieldset>
      <legend>Marges (ratio de la taille de case)</legend>
      <div class="tm-margins">
        <label v-for="side in marginSides" :key="side.key">
          <span>{{ side.label }}</span>
          <input v-model.number="form.margins[side.key]" type="number" step="0.01" />
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Voisins compatibles</legend>
      <div class="tm-checks">
        <label v-for="track in neighborChoices" :key="track.id">
          <input v-model="form.voisins" type="checkbox" :value="track.id" />
          <span>#{{ track.id }} — {{ track.label }}</span>
        </label>
        <small v-if="!neighborChoices.length">Aucune autre texture.</small>
      </div>
    </fieldset>

    <fieldset>
      <legend>Tags</legend>
      <div class="tm-checks tm-tag-checks">
        <label v-for="tag in tags" :key="tag.id">
          <input v-model="form.tagIds" type="checkbox" :value="tag.id" />
          <i :style="{ background: tag.color }"></i>
          <span>{{ tag.name }}</span>
        </label>
      </div>
    </fieldset>

    <details class="tm-catalogs">
      <summary>Gérer les types et tags</summary>
      <div class="tm-catalog-grid">
        <CatalogEditor
          title="Types"
          :items="types"
          :create-fn="createType"
          :update-fn="updateType"
          :remove-fn="deleteType"
        />
        <CatalogEditor
          title="Tags"
          :items="tags"
          :create-fn="createTag"
          :update-fn="updateTag"
          :remove-fn="deleteTag"
        />
      </div>
    </details>

    <p v-if="error" class="tm-error">{{ error }}</p>
    <div class="tm-actions">
      <button class="btn-primary btn-sm" type="submit" :disabled="saving">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { reloadTrackTextures } from '@/composables/useTrackTextures.js'
import { api } from '@/utils/api.js'

const props = defineProps({
  media: { type: Object, required: true },
})
const emit = defineEmits(['saved', 'catalogs-changed'])

const types = ref([])
const tags = ref([])
const tracks = ref([])
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const marginSides = [
  { key: 'left', label: 'Gauche' },
  { key: 'right', label: 'Droite' },
  { key: 'top', label: 'Haut' },
  { key: 'bottom', label: 'Bas' },
]

const form = reactive({
  id: 0,
  label: '',
  type: 'droit',
  alignment: 'both',
  voisins: [],
  margins: { left: 0, right: 0, top: 0, bottom: 0 },
  tagIds: [],
})

function resetForm(media) {
  const meta = media?.track_meta || {}
  form.id = meta.id ?? 0
  form.label = meta.label ?? ''
  form.type = meta.type || 'droit'
  form.alignment = meta.alignment || 'both'
  form.voisins = [...(meta.voisins || [])]
  form.margins = {
    left: Number(meta.margins?.left) || 0,
    right: Number(meta.margins?.right) || 0,
    top: Number(meta.margins?.top) || 0,
    bottom: Number(meta.margins?.bottom) || 0,
  }
  form.tagIds = (media?.tags || []).map((tag) => tag.id)
  saved.value = false
  error.value = ''
}

watch(() => props.media, resetForm, { immediate: true })

const orientationHint = computed(() => {
  if (form.type === 'omnidirectionnel') {
    return 'Aucune orientation imposée — rotation auto = 0° (modifiable à la main).'
  }
  if (form.type === 'coin') return 'Orientation attendue : du haut vers la gauche.'
  if (form.type === 'impasse') return 'Orientation attendue : ouverture vers le haut.'
  return 'Orientation attendue : de gauche vers la droite.'
})

const neighborChoices = computed(() => tracks.value
  .map((track) => ({
    id: track.track_meta?.id,
    label: track.track_meta?.label || track.original_name,
    mediaId: track.id,
  }))
  .filter((track) => Number.isInteger(track.id) && track.mediaId !== props.media.id)
  .sort((a, b) => a.id - b.id))

async function loadCatalogs() {
  ;[types.value, tags.value, tracks.value] = await Promise.all([
    api.getTrackTypes(),
    api.getTrackTags(),
    api.getTrackTextures(),
  ])
}

async function save() {
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    const updated = await api.patchTrackTexture(props.media.id, {
      track_meta: {
        label: form.label.trim() || null,
        type: form.type,
        alignment: form.alignment,
        voisins: form.voisins.map(Number).filter(Number.isInteger),
        margins: { ...form.margins },
      },
      tagIds: [...form.tagIds],
    })
    saved.value = true
    tracks.value = tracks.value.map((track) => track.id === updated.id ? updated : track)
    await reloadTrackTextures()
    emit('saved', updated)
  } catch (err) {
    error.value = err.message || 'Impossible d’enregistrer'
  } finally {
    saving.value = false
  }
}

async function createType(data) {
  await api.createTrackType(data)
  types.value = await api.getTrackTypes()
  await reloadTrackTextures()
  emit('catalogs-changed')
}
async function updateType(id, data) {
  await api.updateTrackType(id, data)
  types.value = await api.getTrackTypes()
  await reloadTrackTextures()
  emit('catalogs-changed')
}
async function deleteType(id) {
  await api.deleteTrackType(id)
  types.value = await api.getTrackTypes()
  await reloadTrackTextures()
  emit('catalogs-changed')
}
async function createTag(data) {
  await api.createTrackTag(data)
  tags.value = await api.getTrackTags()
  await reloadTrackTextures()
  emit('catalogs-changed')
}
async function updateTag(id, data) {
  await api.updateTrackTag(id, data)
  tags.value = await api.getTrackTags()
  await reloadTrackTextures()
  emit('catalogs-changed')
}
async function deleteTag(id) {
  await api.deleteTrackTag(id)
  tags.value = await api.getTrackTags()
  form.tagIds = form.tagIds.filter((tagId) => tagId !== id)
  await reloadTrackTextures()
  emit('catalogs-changed')
}

const CatalogEditor = defineComponent({
  props: {
    title: { type: String, required: true },
    items: { type: Array, required: true },
    createFn: { type: Function, required: true },
    updateFn: { type: Function, required: true },
    removeFn: { type: Function, required: true },
  },
  setup(catalogProps) {
    const draft = reactive({ name: '', color: '#888888' })
    const edits = reactive({})
    const busy = ref(false)
    const catalogError = ref('')

    watch(() => catalogProps.items, (items) => {
      for (const item of items) {
        if (!edits[item.id]) edits[item.id] = { name: item.name, color: item.color }
      }
    }, { immediate: true, deep: true })

    async function run(action) {
      busy.value = true
      catalogError.value = ''
      try {
        await action()
      } catch (err) {
        catalogError.value = err.message || 'Erreur'
      } finally {
        busy.value = false
      }
    }

    function editableRow(item) {
      const edit = edits[item.id] || { name: item.name, color: item.color }
      return h('div', { class: 'tm-catalog-row', key: item.id }, [
        h('input', {
          value: edit.name,
          onInput: (event) => { edit.name = event.target.value },
          'aria-label': `Nom ${item.name}`,
        }),
        h('input', {
          type: 'color',
          value: edit.color,
          onInput: (event) => { edit.color = event.target.value },
          'aria-label': `Couleur ${item.name}`,
        }),
        h('button', {
          type: 'button',
          class: 'btn-icon btn-sm',
          title: 'Enregistrer',
          disabled: busy.value,
          onClick: () => run(() => catalogProps.updateFn(
            item.id,
            { name: edit.name.trim(), color: edit.color },
          )),
        }, '✓'),
        h('button', {
          type: 'button',
          class: 'btn-icon btn-sm act-del',
          title: 'Supprimer',
          disabled: busy.value,
          onClick: () => {
            if (confirm(`Supprimer « ${item.name} » ?`)) {
              run(() => catalogProps.removeFn(item.id))
            }
          },
        }, '✕'),
      ])
    }

    return () => h('section', { class: 'tm-catalog' }, [
      h('strong', catalogProps.title),
      ...catalogProps.items.map(editableRow),
      h('div', { class: 'tm-catalog-row' }, [
        h('input', {
          value: draft.name,
          placeholder: 'Nouveau…',
          onInput: (event) => { draft.name = event.target.value },
        }),
        h('input', {
          type: 'color',
          value: draft.color,
          onInput: (event) => { draft.color = event.target.value },
        }),
        h('button', {
          type: 'button',
          class: 'btn-ghost btn-sm',
          disabled: busy.value || !draft.name.trim(),
          onClick: () => run(async () => {
            await catalogProps.createFn({ name: draft.name.trim(), color: draft.color })
            draft.name = ''
          }),
        }, '+'),
      ]),
      catalogError.value ? h('small', { class: 'tm-error' }, catalogError.value) : null,
    ])
  },
})

onMounted(async () => {
  try {
    await loadCatalogs()
  } catch (err) {
    error.value = err.message || 'Impossible de charger les catalogues'
  }
})
</script>

<style scoped>
.track-meta-form { width: 100%; max-width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; }
.tm-heading { display: flex; justify-content: space-between; align-items: center; }
.tm-heading strong { color: var(--text-primary); }
.tm-success { color: #22c55e; font-size: 11px; }
.tm-grid, .tm-margins { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.tm-grid label, .tm-margins label { display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: var(--text-muted); }
.tm-grid input, .tm-grid select, .tm-margins input, .tm-catalog-row input {
  box-sizing: border-box; min-width: 0; padding: 5px 7px; font-size: 11px;
  color: var(--text-primary); background: var(--bg-secondary);
  border: 1px solid var(--border-default); border-radius: var(--radius-sm);
}
.tm-grid input[readonly] { opacity: 0.65; }
.tm-hint { margin: -4px 0 0; padding: 7px 9px; font-size: 11px; color: var(--accent-primary); background: var(--bg-tertiary); border-radius: var(--radius-sm); }
fieldset { margin: 0; padding: 8px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); }
legend { padding: 0 5px; font-size: 10px; color: var(--text-muted); }
.tm-checks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 10px; max-height: 110px; overflow-y: auto; }
.tm-checks label { display: flex; align-items: center; gap: 5px; min-width: 0; font-size: 11px; color: var(--text-secondary); }
.tm-checks input { width: auto; flex: 0 0 auto; }
.tm-checks i { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
.tm-checks small { color: var(--text-muted); }
.tm-catalogs summary { cursor: pointer; font-size: 11px; color: var(--text-muted); }
.tm-catalog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 8px; }
.tm-catalog { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.tm-catalog strong { font-size: 11px; }
.tm-catalog-row { display: grid; grid-template-columns: minmax(0, 1fr) 28px 24px 24px; gap: 3px; }
.tm-catalog-row input[type="color"] { width: 28px; padding: 1px; }
.tm-error { margin: 0; color: #ef4444; font-size: 11px; }
.tm-actions { display: flex; justify-content: flex-end; }
.act-del:hover { color: #ef4444 !important; }
</style>
