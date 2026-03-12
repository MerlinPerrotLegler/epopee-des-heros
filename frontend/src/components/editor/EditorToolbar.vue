<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <router-link :to="store.mode === 'component' ? '/components' : '/layouts'" class="btn-icon" title="Retour">←</router-link>
      <span class="toolbar-divider"></span>
      <span class="toolbar-title">{{ store.layout?.name || '…' }}</span>
      <span class="badge" v-if="store.mode === 'component'">Composant</span>
      <span class="badge" v-else-if="store.layout?.card_type">{{ store.layout.card_type }}</span>
      <span class="badge" v-if="store.layout">{{ store.layout.width_mm }}×{{ store.layout.height_mm }}mm</span>
      <span class="save-indicator" v-if="store.dirty">● non sauvegardé</span>
    </div>
    <div class="toolbar-center">
      <button class="btn-icon btn-sm" @click="store.zoom = Math.max(0.05, store.zoom - 0.25)">−</button>
      <span class="zoom-label" @click="store.zoom = 1">{{ Math.round(store.zoom * 100) }}%</span>
      <button class="btn-icon btn-sm" @click="store.zoom += 0.25">+</button>
      <button class="btn-zoom btn-sm" @click="store.requestFit = '1:1'" title="Taille réelle (1:1)">1:1</button>
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
    </div>
    <div class="toolbar-right">
      <button class="btn-ghost btn-sm" @click="store.saveDefinition()" :disabled="!store.dirty || store.saving">
        {{ store.saving ? 'Sauvegarde…' : 'Sauvegarder' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useEditorStore } from '@/stores/editor.js'
const store = useEditorStore()
</script>

<style scoped>
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

.toolbar-left { flex: 1; }
.toolbar-center { flex-shrink: 0; }
.toolbar-right { flex: 1; justify-content: flex-end; }

.toolbar-title {
  font-weight: 600;
  font-size: 14px;
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
</style>
