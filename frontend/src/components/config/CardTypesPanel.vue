<template>
  <div class="ctp">
    <p class="ctp-desc">Types associés aux layouts. Le code est la clé (non renommable). Le libellé s’affiche dans les sélecteurs.</p>

    <div class="ctp-table" v-if="types.length">
      <div class="ctp-head">
        <span>Libellé</span>
        <span>Code</span>
        <span>Layouts</span>
        <span></span>
      </div>
      <div v-for="t in types" :key="t.code" class="ctp-row">
        <input
          class="ctp-label"
          :value="drafts[t.code] ?? t.label"
          @focus="drafts[t.code] = t.label"
          @input="drafts[t.code] = $event.target.value"
          @keydown.enter.prevent="saveLabel(t)"
          @keydown.escape.prevent="drafts[t.code] = t.label"
          @blur="saveLabel(t)"
        />
        <code class="ctp-code">{{ t.code }}</code>
        <span class="ctp-count">{{ t.usage_count }}</span>
        <button
          v-if="t.code !== protectedCode"
          type="button"
          class="ctp-del"
          title="Supprimer"
          @click="removeType(t)"
        >✕</button>
        <span v-else class="ctp-del-placeholder"></span>
      </div>
    </div>
    <p v-else class="ctp-empty">Aucun type.</p>

    <div class="ctp-add">
      <input v-model="newLabel" class="ctp-input" placeholder="Libellé" @keydown.enter="addType" />
      <input v-model="newCode" class="ctp-input ctp-input-code" placeholder="code (optionnel)" @keydown.enter="addType" />
      <span v-if="slugPreview" class="ctp-slug">→ {{ slugPreview }}</span>
      <button type="button" class="btn-primary btn-sm" :disabled="!newLabel.trim() || adding" @click="addType">
        {{ adding ? '…' : 'Ajouter' }}
      </button>
    </div>
    <p v-if="error" class="ctp-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/utils/api.js'
import { PROTECTED_TYPE_CODE, slugifyTypeCode } from '@/utils/typeCode.js'

const protectedCode = PROTECTED_TYPE_CODE
const types = ref([])
const drafts = reactive({})
const newLabel = ref('')
const newCode = ref('')
const adding = ref(false)
const error = ref('')

const slugPreview = computed(() => {
  if (newCode.value.trim()) return ''
  const slug = slugifyTypeCode(newLabel.value)
  return slug || ''
})

async function load() {
  types.value = await api.getCardTypes()
}

onMounted(() => {
  load().catch((e) => { error.value = e.message })
})

async function addType() {
  const label = newLabel.value.trim()
  if (!label) return
  error.value = ''
  adding.value = true
  try {
    const created = await api.createCardType({
      label,
      code: newCode.value.trim() || undefined,
    })
    types.value = [...types.value, created].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    newLabel.value = ''
    newCode.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    adding.value = false
  }
}

async function saveLabel(t) {
  const next = String(drafts[t.code] ?? t.label).trim()
  if (!next || next === t.label) {
    drafts[t.code] = t.label
    return
  }
  error.value = ''
  try {
    const updated = await api.updateCardType(t.code, { label: next })
    const idx = types.value.findIndex((x) => x.code === t.code)
    if (idx !== -1) types.value[idx] = updated
    drafts[t.code] = updated.label
  } catch (e) {
    error.value = e.message
    drafts[t.code] = t.label
  }
}

async function removeType(t) {
  const n = Number(t.usage_count) || 0
  if (n > 0) {
    const ok = window.confirm(`${n} layout(s) gardent ce code. Continuer ?`)
    if (!ok) return
  }
  error.value = ''
  try {
    await api.deleteCardType(t.code)
    types.value = types.value.filter((x) => x.code !== t.code)
    delete drafts[t.code]
  } catch (e) {
    error.value = e.message
  }
}
</script>

<style scoped>
.ctp { font-size: 12px; display: flex; flex-direction: column; gap: 12px; }
.ctp-desc { margin: 0; font-size: 11px; color: var(--text-muted); }
.ctp-table { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; }
.ctp-head, .ctp-row {
  display: grid;
  grid-template-columns: minmax(120px, 1.4fr) minmax(100px, 1fr) 72px 32px;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
}
.ctp-head { background: var(--bg-tertiary); font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.ctp-row + .ctp-row { border-top: 1px solid var(--border-subtle); }
.ctp-label {
  width: 100%; padding: 4px 6px; font-size: 12px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary);
}
.ctp-code { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
.ctp-count { font-size: 11px; color: var(--text-muted); text-align: right; }
.ctp-del {
  background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px;
}
.ctp-del:hover { color: #ef4444; }
.ctp-add { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ctp-input {
  padding: 4px 8px; font-size: 12px; min-width: 140px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary);
}
.ctp-input-code { font-family: var(--font-mono); min-width: 120px; }
.ctp-slug { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.ctp-error { margin: 0; color: #ef4444; font-size: 12px; }
.ctp-empty { margin: 0; color: var(--text-muted); }
</style>
