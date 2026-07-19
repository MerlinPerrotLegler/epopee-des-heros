<template>
  <div v-if="open" class="picker-backdrop" @click.self="$emit('close')">
    <div class="picker-dialog" role="dialog" aria-modal="true" aria-label="Choisir une texture de piste">
      <div class="picker-header">
        <strong>Texture de piste</strong>
        <button type="button" class="picker-close" aria-label="Fermer" @click="$emit('close')">✕</button>
      </div>

      <label v-if="showCoin" class="coin-field">
        Rotation
        <select :value="coin" @change="$emit('update:coin', Number($event.target.value))">
          <option v-for="angle in COINS" :key="angle" :value="angle">{{ angle }}°</option>
        </select>
      </label>

      <div v-if="loading" class="picker-empty">Chargement…</div>
      <div v-else-if="!textures.length" class="picker-empty">Aucune texture disponible.</div>
      <div v-else class="texture-list">
        <template v-if="context">
          <div class="texture-group-title">Compatibles</div>
          <button
            v-for="texture in compatibleTextures"
            :key="`compatible-${texture.id}`"
            type="button"
            class="texture-option"
            :class="{ active: texture.id === modelValue }"
            @click="selectTexture(texture)"
          >
            <img :src="`/uploads/${texture.mediaId}`" :alt="textureLabel(texture)" />
            <span><strong>#{{ texture.id }}</strong> {{ textureLabel(texture) }}</span>
          </button>
          <div v-if="!compatibleTextures.length" class="picker-empty picker-empty--small">
            Aucune texture compatible.
          </div>
          <div v-if="otherTextures.length" class="texture-separator"></div>
          <div v-if="otherTextures.length" class="texture-group-title">Autres textures</div>
        </template>

        <button
          v-for="texture in displayedOtherTextures"
          :key="`other-${texture.id}`"
          type="button"
          class="texture-option"
          :class="{ active: texture.id === modelValue }"
          @click="selectTexture(texture)"
        >
          <img :src="`/uploads/${texture.mediaId}`" :alt="textureLabel(texture)" />
          <span><strong>#{{ texture.id }}</strong> {{ textureLabel(texture) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isTextureCompatible } from '@/utils/trackMatch.js'

const COINS = [0, 90, 180, 270]

const props = defineProps({
  open: { type: Boolean, default: false },
  textures: { type: Array, default: () => [] },
  modelValue: { type: Number, default: null },
  coin: { type: Number, default: 0 },
  context: { type: Object, default: null },
  showCoin: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'close', 'update:coin'])

const compatibleTextures = computed(() => {
  if (!props.context) return []
  return props.textures.filter((texture) => isTextureCompatible(texture, props.context))
})

const otherTextures = computed(() => {
  if (!props.context) return props.textures
  const compatibleIds = new Set(compatibleTextures.value.map((texture) => texture.id))
  return props.textures.filter((texture) => !compatibleIds.has(texture.id))
})

const displayedOtherTextures = computed(() =>
  props.context ? otherTextures.value : props.textures)

function textureLabel(texture) {
  return texture.label || texture.name || texture.filename || texture.type || 'Sans libellé'
}

function selectTexture(texture) {
  emit('select', { textureId: texture.id, coin: props.coin })
}
</script>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 10, 18, 0.72);
}

.picker-dialog {
  width: min(420px, calc(100vw - 32px));
  max-height: min(640px, calc(100vh - 32px));
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}

.picker-header,
.coin-field,
.texture-option {
  display: flex;
  align-items: center;
}

.picker-header {
  justify-content: space-between;
  margin-bottom: 10px;
}

.picker-close {
  border: 0;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}

.coin-field {
  gap: 8px;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 11px;
}

.coin-field select {
  margin-left: auto;
}

.texture-list {
  display: grid;
  gap: 4px;
}

.texture-group-title {
  margin: 4px 0 2px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.texture-option {
  gap: 8px;
  width: 100%;
  padding: 5px 7px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
}

.texture-option:hover,
.texture-option.active {
  border-color: var(--accent-primary);
}

.texture-option img {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  object-fit: contain;
}

.texture-separator {
  margin: 6px 0;
  border-top: 1px solid var(--border-default);
}

.picker-empty {
  padding: 16px 4px;
  color: var(--text-muted);
  text-align: center;
}

.picker-empty--small {
  padding: 6px 4px;
  font-size: 10px;
}
</style>
