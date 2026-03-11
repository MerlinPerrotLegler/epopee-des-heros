<template>
  <div class="config-panel">
    <div class="panel-section">
      <div class="panel-section-title">Tokens de design globaux</div>
      <p class="config-hint">
        Ces valeurs s'appliquent à tous les atomes dont le paramètre correspondant est <code>null</code>.
      </p>

      <div v-for="token in CONFIG_KEYS" :key="token.key" class="param-block">
        <div class="param-header">
          <label class="param-label">{{ token.label }}</label>
        </div>
        <div class="field-row">

          <!-- Color -->
          <template v-if="token.type === 'color'">
            <ColorPickerAlpha
              :model-value="config[token.key] ?? null"
              @update:model-value="configStore.set(token.key, $event)"
            />
          </template>

          <!-- Select -->
          <template v-else-if="token.type === 'select'">
            <select
              :value="config[token.key] ?? ''"
              @change="configStore.set(token.key, $event.target.value || null)"
            >
              <option value="">— non défini —</option>
              <option v-for="opt in token.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </template>

          <!-- Number -->
          <template v-else-if="token.type === 'number'">
            <input
              type="number"
              :value="config[token.key] ?? ''"
              :step="token.step ?? 1"
              placeholder="—"
              @input="configStore.set(token.key, $event.target.value === '' ? null : +$event.target.value)"
            />
          </template>

        </div>

        <!-- Reset button -->
        <button
          v-if="config[token.key] != null"
          class="reset-btn"
          @click="configStore.set(token.key, null)"
          title="Réinitialiser"
        >✕ Réinitialiser</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useConfigStore, CONFIG_KEYS } from '@/stores/config.js'
import ColorPickerAlpha from './ColorPickerAlpha.vue'

const configStore = useConfigStore()
const config = configStore.config
</script>

<style scoped>
.config-panel {
  font-size: 11px;
}

.config-hint {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.4;
  margin: 0 0 8px;
}

.config-hint code {
  font-family: var(--font-mono);
  background: var(--bg-tertiary);
  padding: 1px 3px;
  border-radius: 2px;
}

.param-block {
  margin-bottom: 8px;
}

.param-header {
  margin-bottom: 2px;
}

.param-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary, #a0a8c0);
}

.reset-btn {
  margin-top: 3px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 9px;
  cursor: pointer;
  padding: 0;
}
.reset-btn:hover { color: #ef4444; }
</style>
