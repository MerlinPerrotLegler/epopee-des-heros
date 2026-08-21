<template>
  <div class="modal-overlay" v-if="open" @click.self="emit('close')">
    <div class="modal">
      <h3>Modifier le composant</h3>
      <div class="field-row">
        <label>Nom</label>
        <input v-model="form.name" placeholder="Nom du composant" autofocus />
      </div>
      <div class="field-row">
        <label>Dimensions</label>
        <div class="dims-row">
          <input
            type="number"
            v-model.number="form.width_mm"
            min="1"
            max="500"
            step="0.1"
            class="dim-input"
            placeholder="Larg."
          />
          <span class="dim-sep">×</span>
          <input
            type="number"
            v-model.number="form.height_mm"
            min="1"
            max="500"
            step="0.1"
            class="dim-input"
            placeholder="Haut."
          />
          <span class="dim-unit">mm</span>
          <button type="button" class="btn-swap" title="Échanger largeur / hauteur" @click="swapDims">⇄</button>
        </div>
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" @click="emit('close')">Annuler</button>
        <button class="btn-primary" type="button" @click="save" :disabled="!canSave || saving">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  component: { type: Object, default: null },
  /** async (payload) => updated component */
  saveFn: { type: Function, required: true },
})

const emit = defineEmits(['close', 'saved'])

const form = ref(emptyForm())
const saving = ref(false)
const error = ref('')

const canSave = computed(() => String(form.value.name || '').trim().length > 0)

function emptyForm() {
  return { name: '', width_mm: 30, height_mm: 20 }
}

function syncFromComponent() {
  error.value = ''
  const c = props.component
  if (!c) {
    form.value = emptyForm()
    return
  }
  form.value = {
    name: c.name || '',
    width_mm: c.width_mm ?? 30,
    height_mm: c.height_mm ?? 20,
  }
}

watch(() => [props.open, props.component], ([open]) => {
  if (open) syncFromComponent()
}, { immediate: true })

function swapDims() {
  const tmp = form.value.width_mm
  form.value.width_mm = form.value.height_mm
  form.value.height_mm = tmp
}

function dimOk(n) {
  return Number.isFinite(n) && n >= 1 && n <= 500
}

async function save() {
  if (!canSave.value) return
  if (!dimOk(form.value.width_mm) || !dimOk(form.value.height_mm)) {
    error.value = 'La largeur et la hauteur doivent être entre 1 et 500 mm'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const result = await props.saveFn({
      name: String(form.value.name).trim(),
      width_mm: form.value.width_mm,
      height_mm: form.value.height_mm,
    })
    emit('saved', result)
    emit('close')
  } catch (e) {
    error.value = e?.message || 'Échec de l’enregistrement'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form-error {
  margin: 0 0 8px;
  font-size: 12px;
  color: #ef4444;
}
.dims-row { display: flex; align-items: center; gap: 5px; }
.dim-input {
  width: 58px; padding: 4px 6px; font-size: 12px; text-align: center;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); outline: none;
}
.dim-input:focus { border-color: var(--accent-primary); }
.dim-sep { font-size: 12px; color: var(--text-muted); }
.dim-unit { font-size: 11px; color: var(--text-muted); }
.btn-swap {
  padding: 3px 8px; font-size: 14px; line-height: 1;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary);
}
.btn-swap:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
</style>
