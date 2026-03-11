<template>
  <div class="fm">
    <div class="panel-section-title">Polices Google Fonts</div>

    <!-- Ajouter une police -->
    <div class="fm-add-row">
      <input
        v-model="familyInput"
        type="text"
        class="fm-input"
        placeholder="ex: Playfair Display"
        @keydown.enter="addFont"
      />
      <button class="fm-btn-add" :disabled="!familyInput.trim() || adding" @click="addFont">
        {{ adding ? '…' : '+ Ajouter' }}
      </button>
    </div>
    <p v-if="error" class="fm-error">{{ error }}</p>
    <p class="fm-hint">
      Saisir le nom exact depuis
      <a href="https://fonts.google.com" target="_blank" rel="noopener">fonts.google.com</a>.
    </p>

    <!-- Liste des polices enregistrées -->
    <div v-if="fontsStore.fonts.length" class="fm-list">
      <div v-for="font in fontsStore.fonts" :key="font.id" class="fm-item">
        <span class="fm-family" :style="{ fontFamily: font.family }">{{ font.family }}</span>
        <button class="fm-del" @click="removeFont(font.id)" title="Supprimer">✕</button>
      </div>
    </div>
    <p v-else class="fm-empty">Aucune police ajoutée.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFontsStore } from '@/stores/fonts.js'

const fontsStore = useFontsStore()

const familyInput = ref('')
const adding = ref(false)
const error = ref('')

async function addFont() {
  const family = familyInput.value.trim()
  if (!family) return
  error.value = ''
  adding.value = true
  try {
    await fontsStore.add(family)
    familyInput.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    adding.value = false
  }
}

async function removeFont(id) {
  await fontsStore.remove(id)
}
</script>

<style scoped>
.fm {
  font-size: 11px;
}

.fm-add-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.fm-input {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  padding: 4px 6px;
}

.fm-btn-add {
  background: var(--accent-primary);
  color: #fff;
  border: none;
  border-radius: 3px;
  font-size: 10px;
  padding: 4px 8px;
  cursor: pointer;
  white-space: nowrap;
}
.fm-btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

.fm-hint {
  font-size: 9px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0 0 8px;
}
.fm-hint a { color: var(--accent-primary); }

.fm-error {
  font-size: 10px;
  color: #ef4444;
  margin: 0 0 4px;
}

.fm-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fm-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 3px;
}

.fm-family {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
}

.fm-del {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 0 2px;
  flex-shrink: 0;
}
.fm-del:hover { color: #ef4444; }

.fm-empty {
  color: var(--text-muted);
  font-style: italic;
  font-size: 10px;
  margin: 0;
}
</style>
