<template>
  <div class="cts">
    <select :value="selectValue" @change="onSelectChange">
      <option v-for="t in types" :key="t.code" :value="t.code">{{ t.label }}</option>
      <option :value="sentinel">+ Nouveau type…</option>
    </select>
    <div v-if="creating" class="cts-create">
      <input v-model="newLabel" class="cts-input" placeholder="Libellé" autofocus @keydown.enter.prevent="create" />
      <input v-model="newCode" class="cts-input cts-code" placeholder="code (optionnel)" @keydown.enter.prevent="create" />
      <span v-if="slugPreview" class="cts-slug">→ {{ slugPreview }}</span>
      <button type="button" class="btn-primary btn-sm" :disabled="!newLabel.trim() || creatingBusy" @click="create">
        {{ creatingBusy ? '…' : 'Créer' }}
      </button>
    </div>
    <p v-if="error" class="cts-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '@/utils/api.js'
import { CREATE_TYPE_SENTINEL, slugifyTypeCode } from '@/utils/typeCode.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  types: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'created'])

const sentinel = CREATE_TYPE_SENTINEL
const creating = ref(false)
const creatingBusy = ref(false)
const newLabel = ref('')
const newCode = ref('')
const error = ref('')

const selectValue = computed(() => (creating.value ? sentinel : props.modelValue))
const slugPreview = computed(() => {
  if (newCode.value.trim()) return ''
  return slugifyTypeCode(newLabel.value) || ''
})

watch(() => props.modelValue, () => {
  creating.value = false
  error.value = ''
})

function onSelectChange(e) {
  const v = e.target.value
  if (v === sentinel) {
    creating.value = true
    newLabel.value = ''
    newCode.value = ''
    error.value = ''
    return
  }
  creating.value = false
  error.value = ''
  emit('update:modelValue', v)
}

async function create() {
  const label = newLabel.value.trim()
  if (!label) return
  error.value = ''
  creatingBusy.value = true
  try {
    const created = await api.createCardType({
      label,
      code: newCode.value.trim() || undefined,
    })
    creating.value = false
    emit('created', created)
    emit('update:modelValue', created.code)
  } catch (e) {
    error.value = e.message
  } finally {
    creatingBusy.value = false
  }
}
</script>

<style scoped>
.cts { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.cts select { width: 100%; }
.cts-create { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.cts-input {
  padding: 4px 6px; font-size: 12px; min-width: 120px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary);
}
.cts-code { font-family: var(--font-mono); }
.cts-slug { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.cts-error { margin: 0; font-size: 12px; color: #ef4444; }
</style>
