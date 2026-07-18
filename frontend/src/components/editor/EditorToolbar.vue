<template>
  <div class="toolbar-stack">
    <div class="lock-banner" v-if="store.readOnly && store.layoutLockHolder">
      <span class="lock-icon">🔒</span>
      Lecture seule — <strong>{{ store.layoutLockHolder.username }}</strong> édite ce layout.
      <span v-if="!store.layoutLockHeld" class="lock-hint">Vous pourrez éditer dès que le verrou est libéré.</span>
    </div>
    <div class="toolbar">
    <div class="toolbar-left">
      <router-link :to="store.mode === 'component' ? '/components' : '/layouts'" class="btn-icon" title="Retour">←</router-link>
      <span class="toolbar-divider"></span>
      <button
        v-if="store.mode === 'layout' && store.layout"
        type="button"
        class="toolbar-title toolbar-title-btn"
        title="Modifier la configuration"
        :disabled="store.readOnly || !store.layoutLockHeld"
        @click="showSettings = true"
      >{{ store.layout?.name || '…' }}</button>
      <span v-else class="toolbar-title">{{ store.layout?.name || '…' }}</span>
      <span class="badge" v-if="store.mode === 'component'">Composant</span>
      <span class="badge" v-else-if="store.layout?.card_type">{{ store.layout.card_type }}</span>
      <span class="badge" v-if="store.layout">{{ store.layout.width_mm }} × {{ store.layout.height_mm }} mm</span>
      <span class="badge badge-hex" v-if="store.layout?.shape === 'hexagon'" title="Layout hexagonal">⬡ Hexagonal</span>
      <button
        v-if="store.mode === 'layout' && store.layout"
        type="button"
        class="btn-icon btn-sm"
        title="Configurer le layout"
        :disabled="store.readOnly || !store.layoutLockHeld"
        @click="showSettings = true"
      >⚙</button>
      <span class="save-indicator" v-if="store.saving">● sauvegarde…</span>
      <span class="save-indicator" v-else-if="store.dirty">● non sauvegardé</span>
      <span class="save-indicator save-ok" v-else-if="store.autoSave">✓ auto</span>
    </div>
    <div class="toolbar-center">
      <button class="btn-icon btn-sm" @click="store.zoom = Math.max(0.05, store.zoom - 0.25)">−</button>
      <span class="zoom-label" @click="store.zoom = 1" title="Zoom 100 % (mm CSS navigateur)">{{ Math.round(store.zoom * 100) }}%</span>
      <button class="btn-icon btn-sm" @click="store.zoom += 0.25">+</button>
      <button
        class="btn-zoom btn-sm"
        title="Taille réelle à l’écran (clic droit pour calibrer)"
        @click="onOneToOne"
        @contextmenu.prevent="showCalibrate = true"
      >1:1</button>
      <button class="btn-zoom btn-sm" @click="store.requestFit = 'fit'" title="Ajuster à la fenêtre">⊡</button>
      <span class="toolbar-divider"></span>
      <label class="toggle-label">
        <input type="checkbox" v-model="store.showGrid" />
        Grille
      </label>
      <label class="snap-label">
        Snap
        <input type="number" v-model.number="store.snapGrid" min="0.5" max="10" step="0.5" class="snap-input" />
        mm
      </label>
      <span class="toolbar-divider"></span>
      <GuidesMenu />
    </div>
    <div class="toolbar-right">
      <label class="toggle-label" title="Enregistre automatiquement ~1,5 s après une modification">
        <input
          type="checkbox"
          :checked="store.autoSave"
          @change="store.setAutoSave($event.target.checked)"
        />
        Auto-save
      </label>
      <button
        class="btn-ghost btn-sm"
        @click="store.saveDefinition()"
        :disabled="!store.dirty || store.saving || store.readOnly || (store.mode === 'layout' && !store.layoutLockHeld)"
      >
        {{ store.saving ? 'Sauvegarde…' : 'Sauvegarder' }}
      </button>
    </div>
    </div>

    <LayoutSettingsModal
      :open="showSettings"
      :layout="store.layout"
      :card-types="cardTypes"
      :verso-layouts="versoLayouts"
      :save-fn="saveLayoutMeta"
      @close="showSettings = false"
    />
    <ScreenCalibrateModal
      :open="showCalibrate"
      @close="showCalibrate = false"
      @calibrated="store.requestFit = '1:1'"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { api } from '@/utils/api.js'
import LayoutSettingsModal from '@/components/layouts/LayoutSettingsModal.vue'
import GuidesMenu from '@/components/editor/GuidesMenu.vue'
import ScreenCalibrateModal from '@/components/editor/ScreenCalibrateModal.vue'

const store = useEditorStore()
const showSettings = ref(false)
const showCalibrate = ref(false)
const cardTypes = ref([])
const allLayouts = ref([])

function onOneToOne() {
  // Uses calibrated zoom if set, otherwise a HiDPI estimate (CSS mm alone is too small).
  store.requestFit = '1:1'
}

const versoLayouts = computed(() => allLayouts.value.filter(l => l.is_back && l.id !== store.layout?.id))

onMounted(async () => {
  if (store.mode !== 'layout') return
  try {
    ;[cardTypes.value, allLayouts.value] = await Promise.all([
      api.getCardTypes(),
      api.getLayouts(),
    ])
  } catch (e) {
    console.error('Failed to load layout settings data', e)
  }
})

async function saveLayoutMeta(payload) {
  if (!store.layout?.id) throw new Error('Layout introuvable')
  const updated = await api.updateLayout(store.layout.id, payload)
  store.applyLayoutMeta(updated)
  const idx = allLayouts.value.findIndex(l => l.id === updated.id)
  if (idx !== -1) allLayouts.value[idx] = { ...allLayouts.value[idx], ...updated }
  else allLayouts.value.push(updated)
  return updated
}
</script>

<style scoped>
.toolbar-stack {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.lock-banner {
  flex-shrink: 0;
  padding: 8px 12px;
  background: rgba(251, 191, 36, 0.15);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-secondary);
}
.lock-banner strong {
  color: var(--text-primary);
}
.lock-hint {
  margin-left: 8px;
  opacity: 0.85;
}
.lock-icon {
  margin-right: 6px;
}

.toolbar {
  height: var(--toolbar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
  flex-shrink: 0;
}

.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-left { flex: 1; min-width: 0; }
.toolbar-center { flex-shrink: 0; }
.toolbar-right { flex: 1; justify-content: flex-end; }

.toolbar-title {
  font-weight: 600;
  font-size: 14px;
}
.toolbar-title-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: inherit;
  cursor: pointer;
  padding: 2px 6px;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toolbar-title-btn:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
.toolbar-title-btn:disabled {
  cursor: default;
  opacity: 0.85;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border-default);
}

.zoom-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  min-width: 40px;
  text-align: center;
}
.zoom-label:hover { color: var(--accent-primary); }

.btn-zoom {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1.6;
}
.btn-zoom:hover { color: var(--accent-primary); border-color: var(--accent-primary); }

.toggle-label, .snap-label {
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.snap-input {
  width: 40px;
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 4px;
  text-align: center;
}

.save-indicator {
  font-size: 11px;
  color: var(--accent-warning);
}
.save-ok {
  color: var(--text-muted);
}
</style>
