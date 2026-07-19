<template>
  <aside class="plan-tiles-panel" aria-label="Cases du plan">
    <header class="panel-header">
      <div>
        <h2>Cases du plan</h2>
        <p>Glissez une texture sur le plan.</p>
      </div>
      <span class="tile-count">{{ filteredTextures.length }}</span>
    </header>

    <div class="panel-controls">
      <label class="field">
        <span>Type</span>
        <select v-model="typeFilter">
          <option value="">Tous les types</option>
          <option v-for="type in textureTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>Rechercher</span>
        <input v-model.trim="query" type="search" placeholder="Nom, type, tag…" />
      </label>

      <label class="field">
        <span>Hauteur de pose</span>
        <span class="number-field">
          <input
            v-model.number="heightMm"
            type="number"
            min="0.1"
            step="0.5"
            inputmode="decimal"
          />
          <span>mm</span>
        </span>
      </label>

      <p class="orientation-hint">{{ orientationHint }}</p>
    </div>

    <div v-if="loading" class="panel-state">Chargement…</div>
    <div v-else-if="error" class="panel-state panel-state--error">
      <span>Catalogue indisponible.</span>
      <button type="button" @click="reload">Réessayer</button>
    </div>
    <div v-else-if="!filteredTextures.length" class="panel-state">
      Aucune texture ne correspond aux filtres.
    </div>
    <div v-else class="texture-grid">
      <article
        v-for="texture in filteredTextures"
        :key="texture.mediaId"
        class="texture-card"
        :class="{ 'texture-card--disabled': store.readOnly }"
        :draggable="!store.readOnly"
        :title="store.readOnly ? 'Éditeur en lecture seule' : `Glisser ${textureLabel(texture)} sur le plan`"
        @dragstart="onDragStart($event, texture)"
      >
        <img
          :src="`/uploads/${texture.mediaId}`"
          :alt="textureLabel(texture)"
          draggable="false"
        />
        <div class="texture-meta">
          <strong>{{ textureLabel(texture) }}</strong>
          <span>{{ texture.type || 'Sans type' }}</span>
          <span>{{ sizeLabel(texture) }}</span>
        </div>
      </article>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTrackTextures } from '@/composables/useTrackTextures.js'
import { useEditorStore } from '@/stores/editor.js'
import { tileSizeFromHeight } from '@/utils/planTiles.js'

const DRAG_TYPE = 'application/x-card-designer-plan-tile'

const props = defineProps({
  planContext: { type: Object, required: true },
})

const store = useEditorStore()
const { catalogue, loading, error, reload } = useTrackTextures()
const typeFilter = ref('')
const query = ref('')
const heightMm = ref(10)

const textures = computed(() => catalogue.value
  .filter(row => row?.track_meta?.id != null)
  .map(row => ({
    ...row.track_meta,
    mediaId: row.id,
    filename: row.filename,
    originalName: row.original_name,
    width_px: row.width_px,
    height_px: row.height_px,
    tags: row.tags || [],
  })))

const textureTypes = computed(() =>
  [...new Set(textures.value.map(texture => texture.type).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'fr')))

const filteredTextures = computed(() => {
  const needle = query.value.toLocaleLowerCase('fr')
  return textures.value.filter((texture) => {
    if (typeFilter.value && texture.type !== typeFilter.value) return false
    if (!needle) return true
    const searchable = [
      textureLabel(texture),
      texture.type,
      ...(texture.tags || []).map(tag => tag.name),
    ].filter(Boolean).join(' ').toLocaleLowerCase('fr')
    return searchable.includes(needle)
  })
})

const orientationHint = computed(() => {
  if (typeFilter.value === 'omnidirectionnel') {
    return 'Aucune orientation imposée — rotation auto = 0° (modifiable à la main).'
  }
  if (typeFilter.value === 'coin') return 'Orientation attendue : du haut vers la gauche.'
  if (typeFilter.value === 'impasse') return 'Orientation attendue : ouverture vers le haut.'
  if (typeFilter.value === 'droit') return 'Orientation attendue : de gauche vers la droite.'
  return 'Orientation : droit gauche → droite · coin haut → gauche · impasse vers le haut · omnidirectionnel auto 0°.'
})

function textureLabel(texture) {
  return texture.label || texture.name || texture.originalName || texture.filename || `Texture #${texture.id}`
}

function tileSize(texture) {
  const validHeight = Number.isFinite(heightMm.value) && heightMm.value > 0 ? heightMm.value : 10
  return tileSizeFromHeight(validHeight, texture)
}

function sizeLabel(texture) {
  const size = tileSize(texture)
  return `${formatMm(size.width_mm)} × ${formatMm(size.height_mm)} mm`
}

function formatMm(value) {
  return Number(value.toFixed(2)).toLocaleString('fr-FR')
}

function onDragStart(event, texture) {
  if (store.readOnly) {
    event.preventDefault()
    return
  }
  const size = tileSize(texture)
  const payload = {
    kind: 'plan-tile',
    textureId: texture.id,
    mediaId: texture.mediaId,
    tileGroupId: props.planContext.group.id,
    heightMm: size.height_mm,
    width_mm: size.width_mm,
    height_mm: size.height_mm,
    width_px: texture.width_px ?? null,
    height_px: texture.height_px ?? null,
  }
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload))
  event.dataTransfer.setData('text/plain', textureLabel(texture))
}
</script>

<style scoped>
.plan-tiles-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--text-primary);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.panel-header h2 {
  font-size: 13px;
  font-weight: 600;
}

.panel-header p,
.orientation-hint {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.4;
}

.tile-count {
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font: 10px var(--font-mono);
  text-align: center;
}

.panel-controls {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
}

.field {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 10px;
}

.field input,
.field select {
  min-width: 0;
  width: 100%;
}

.number-field {
  display: flex;
  align-items: center;
  gap: 5px;
}

.number-field span {
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.orientation-hint {
  margin: 0;
}

.texture-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 7px;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
}

.texture-card {
  min-width: 0;
  padding: 6px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  cursor: grab;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.texture-card:hover {
  border-color: var(--accent-primary);
  background: var(--bg-hover);
}

.texture-card:active {
  cursor: grabbing;
}

.texture-card--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.texture-card img {
  display: block;
  width: 100%;
  height: 76px;
  border-radius: 2px;
  background: var(--bg-deep);
  object-fit: contain;
}

.texture-meta {
  display: grid;
  gap: 2px;
  margin-top: 6px;
  min-width: 0;
}

.texture-meta strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.texture-meta span {
  color: var(--text-muted);
  font: 9px var(--font-mono);
}

.panel-state {
  display: grid;
  place-items: center;
  gap: 8px;
  flex: 1;
  padding: 20px;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

.panel-state--error {
  color: var(--accent-secondary);
}

.panel-state button {
  padding: 4px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
}
</style>
