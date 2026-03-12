<template>
  <div class="config-view">
    <div class="config-header">
      <h1>Configuration globale</h1>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs" :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- Tokens de design -->
    <div v-if="activeTab === 'design'" class="config-body">
      <p class="config-desc">Tokens appliqués à tous les atomes dont le paramètre correspondant est <code>null</code>.</p>
      <ConfigPanel />
    </div>

    <!-- Polices -->
    <div v-if="activeTab === 'fonts'" class="config-body">
      <FontManager />
    </div>

    <!-- IA Provider -->
    <div v-if="activeTab === 'ai'" class="config-body">
      <p class="config-desc">Provider IA, clé API et presets par type de média pour la génération automatique d'images.</p>
      <AIProviderPanel />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ConfigPanel from '@/components/editor/ConfigPanel.vue'
import FontManager from '@/components/editor/FontManager.vue'
import AIProviderPanel from '@/components/config/AIProviderPanel.vue'

const activeTab = ref('design')
const tabs = [
  { id: 'design', label: 'Tokens design' },
  { id: 'fonts',  label: 'Polices' },
  { id: 'ai',     label: 'IA Provider' },
]
</script>

<style scoped>
.config-view {
  padding: 24px;
  max-width: 680px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.config-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 12px;
}
.config-desc code {
  font-family: var(--font-mono);
  background: var(--bg-tertiary);
  padding: 1px 4px;
  border-radius: 2px;
}

/* Tab bar */
.tab-bar {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 6px 14px;
  margin-bottom: -1px;
  transition: color 0.1s;
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--accent-primary); border-bottom-color: var(--accent-primary); font-weight: 600; }

.config-body {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
}
</style>
