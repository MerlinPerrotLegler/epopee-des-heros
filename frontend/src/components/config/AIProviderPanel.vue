<template>
  <div class="ai-provider-panel">

    <!-- Provider & API key -->
    <div class="section">
      <div class="section-title">Provider & Clé API</div>
      <div class="field-row">
        <label>Provider</label>
        <select v-model="form.provider">
          <option value="openai">OpenAI DALL-E 3</option>
          <option value="stability">Stability AI (bientôt)</option>
          <option value="fal">fal.ai (bientôt)</option>
        </select>
      </div>
      <div class="field-row">
        <label>Clé API</label>
        <input
          v-model="apiKeyInput"
          :type="showKey ? 'text' : 'password'"
          :placeholder="form.api_key_set ? '••••••••••••••••' : 'sk-...'"
          autocomplete="off"
          spellcheck="false"
          class="api-key-input"
        />
        <button class="btn-icon-sm" @click="showKey = !showKey" :title="showKey ? 'Masquer' : 'Afficher'">
          {{ showKey ? '🙈' : '👁' }}
        </button>
      </div>
      <p class="hint" v-if="form.api_key_set">Clé configurée. Laissez vide pour conserver l'existante.</p>
    </div>

    <!-- Global prompt -->
    <div class="section">
      <div class="section-title">Prompt global (style artistique du jeu)</div>
      <p class="hint">Injecté en tête de chaque prompt de génération. Décrit l'univers visuel, la palette, le style.</p>
      <textarea
        v-model="form.global_prompt"
        class="global-prompt"
        placeholder="Illustration fantasy médiévale, palette chaude, trait encré, inspiré Donjons & Dragons…"
        rows="4"
      />
    </div>

    <!-- Media type presets -->
    <div class="section">
      <div class="section-title">Presets par type de média</div>
      <p class="hint">Chaque type définit la résolution, le style et le provider utilisés lors de la génération.</p>

      <div class="preset-table">
        <div class="preset-header">
          <span>Type</span>
          <span>Label</span>
          <span>Provider</span>
          <span>Résolution</span>
          <span>Style</span>
          <span></span>
        </div>
        <div
          v-for="(preset, idx) in form.media_type_presets" :key="idx"
          class="preset-row"
        >
          <input v-model="preset.type" class="inp-mono" placeholder="type_slug" />
          <input v-model="preset.label" placeholder="Label" />
          <select v-model="preset.provider">
            <option value="openai">OpenAI</option>
            <option value="stability">Stability</option>
            <option value="fal">fal.ai</option>
          </select>
          <select v-model="preset.resolution">
            <option value="256x256">256×256</option>
            <option value="512x512">512×512</option>
            <option value="1024x1024">1024×1024</option>
            <option value="1024x1792">1024×1792 (portrait)</option>
            <option value="1792x1024">1792×1024 (paysage)</option>
          </select>
          <select v-model="preset.style_preset">
            <option value="vivid">vivid</option>
            <option value="natural">natural</option>
          </select>
          <button class="btn-icon-sm btn-danger" @click="removePreset(idx)" title="Supprimer">✕</button>
        </div>
      </div>

      <button class="btn-ghost btn-sm" @click="addPreset" style="margin-top:8px">+ Ajouter un type</button>
    </div>

    <!-- Save -->
    <div class="save-row">
      <span v-if="saved" class="save-ok">✓ Sauvegardé</span>
      <span v-if="saveError" class="save-err">{{ saveError }}</span>
      <button class="btn-primary" @click="save" :disabled="saving">
        {{ saving ? 'Sauvegarde…' : 'Sauvegarder' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { api } from '@/utils/api.js'

const form = reactive({
  provider: 'openai',
  api_key_set: false,
  global_prompt: '',
  media_type_presets: [],
})
const apiKeyInput = ref('')
const showKey = ref(false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')

onMounted(async () => {
  try {
    const config = await api.getAIConfig()
    Object.assign(form, config)
  } catch {}
})

function addPreset() {
  form.media_type_presets.push({
    type: '',
    label: '',
    resolution: '1024x1024',
    style_preset: 'vivid',
    provider: form.provider || 'openai',
    negative_prompt: '',
  })
}

function removePreset(idx) {
  form.media_type_presets.splice(idx, 1)
}

async function save() {
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    const payload = {
      provider: form.provider,
      global_prompt: form.global_prompt,
      media_type_presets: form.media_type_presets,
    }
    if (apiKeyInput.value.trim()) {
      payload.api_key = apiKeyInput.value.trim()
    }
    await api.putAIConfig(payload)
    // Refresh to get api_key_set status
    const updated = await api.getAIConfig()
    Object.assign(form, updated)
    apiKeyInput.value = ''
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ai-provider-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  font-size: 12px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hint {
  font-size: 10px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-row label {
  font-size: 11px;
  color: var(--text-secondary);
  width: 72px;
  flex-shrink: 0;
}
.field-row select,
.field-row input {
  flex: 1;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 11px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
}

.api-key-input {
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
}

.global-prompt {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 11px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

/* Preset table */
.preset-table {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preset-header {
  display: grid;
  grid-template-columns: 120px 100px 90px 130px 80px 24px;
  gap: 4px;
  padding: 2px 0;
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preset-row {
  display: grid;
  grid-template-columns: 120px 100px 90px 130px 80px 24px;
  gap: 4px;
  align-items: center;
}

.preset-row input,
.preset-row select {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 11px;
  padding: 3px 5px;
  border-radius: var(--radius-sm);
  min-width: 0;
}
.inp-mono { font-family: var(--font-mono); }

.save-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.save-ok { font-size: 11px; color: #22c55e; }
.save-err { font-size: 11px; color: var(--accent-danger); }

.btn-icon-sm {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  color: var(--text-muted);
}
.btn-icon-sm.btn-danger:hover { color: var(--accent-danger); }
</style>
