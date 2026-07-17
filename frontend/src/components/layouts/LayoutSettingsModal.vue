<template>
  <div class="modal-overlay" v-if="open" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ layout ? 'Modifier le layout' : 'Nouveau layout' }}</h3>
      <div class="field-row"><label>Nom</label><input v-model="form.name" placeholder="Carte équipement" autofocus /></div>
      <div class="field-row">
        <label>Type</label>
        <select v-model="form.card_type">
          <option v-for="t in cardTypes" :key="t.code" :value="t.code">{{ t.label }}</option>
        </select>
      </div>
      <div class="field-row">
        <label>Forme hexagonale</label>
        <input type="checkbox" v-model="form.is_hexagonal" style="width:auto;cursor:pointer" />
      </div>
      <div class="field-row">
        <label>Dimensions</label>
        <div class="dims-row">
          <input type="number" v-model.number="form.width_mm" min="10" max="500" class="dim-input" placeholder="Larg." />
          <span class="dim-sep">×</span>
          <input
            v-if="form.is_hexagonal"
            type="text"
            :value="form.height_mm"
            readonly
            class="dim-input dim-input-readonly"
            title="Calculé automatiquement (ratio hexagonal)"
          />
          <input v-else type="number" v-model.number="form.height_mm" min="10" max="500" class="dim-input" placeholder="Haut." />
          <span class="dim-unit">mm</span>
          <button v-if="!form.is_hexagonal" type="button" class="btn-swap" title="Échanger largeur / hauteur" @click="swapDims">⇄</button>
        </div>
      </div>
      <div class="field-row">
        <label>Dos de carte</label>
        <input type="checkbox" v-model="form.is_back" style="width:auto;cursor:pointer" />
      </div>
      <div v-if="!form.is_back" class="field-row">
        <label>Verso lié</label>
        <select v-model="form.back_layout_id">
          <option :value="null">— Aucun —</option>
          <option v-for="bl in availableVersos" :key="bl.id" :value="bl.id">{{ bl.name }}</option>
        </select>
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" @click="emit('close')">Annuler</button>
        <button class="btn-primary" type="button" @click="save" :disabled="!form.name || saving">
          {{ saving ? 'Enregistrement…' : (layout ? 'Enregistrer' : 'Créer') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { hexHeightFromWidth } from '@/utils/hexGeometry.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  layout: { type: Object, default: null },
  cardTypes: { type: Array, default: () => [] },
  versoLayouts: { type: Array, default: () => [] },
  /** async (payload) => void — crée ou met à jour le layout */
  saveFn: { type: Function, required: true },
})

const emit = defineEmits(['close', 'saved'])

const form = ref(emptyForm())
const saving = ref(false)
const error = ref('')

const availableVersos = computed(() =>
  props.versoLayouts.filter(bl => !props.layout || bl.id !== props.layout.id),
)

function emptyForm() {
  return {
    name: '',
    card_type: 'equipement',
    width_mm: 63,
    height_mm: 88,
    is_back: false,
    back_layout_id: null,
    is_hexagonal: false,
  }
}

function syncFromLayout() {
  error.value = ''
  if (!props.layout) {
    form.value = emptyForm()
    return
  }
  const l = props.layout
  form.value = {
    name: l.name || '',
    card_type: l.card_type || 'equipement',
    width_mm: l.width_mm ?? 63,
    height_mm: l.height_mm ?? 88,
    is_back: !!l.is_back,
    back_layout_id: l.back_layout_id || null,
    is_hexagonal: l.shape === 'hexagon',
  }
}

watch(() => [props.open, props.layout], ([open]) => {
  if (open) syncFromLayout()
}, { immediate: true })

watch(() => [form.value.is_hexagonal, form.value.width_mm], ([isHex, w]) => {
  if (isHex) form.value.height_mm = hexHeightFromWidth(w)
})

function swapDims() {
  const tmp = form.value.width_mm
  form.value.width_mm = form.value.height_mm
  form.value.height_mm = tmp
}

async function save() {
  if (!form.value.name) return
  saving.value = true
  error.value = ''
  try {
    const payload = {
      name: form.value.name.trim(),
      card_type: form.value.card_type,
      width_mm: form.value.width_mm,
      height_mm: form.value.height_mm,
      is_back: form.value.is_back,
      back_layout_id: form.value.is_back ? null : form.value.back_layout_id,
      shape: form.value.is_hexagonal ? 'hexagon' : 'rectangle',
    }
    const result = await props.saveFn(payload)
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
.dim-input-readonly { opacity: 0.55; cursor: not-allowed; }
.dim-sep { font-size: 12px; color: var(--text-muted); }
.dim-unit { font-size: 11px; color: var(--text-muted); }
.btn-swap {
  padding: 3px 8px; font-size: 14px; line-height: 1;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary);
}
.btn-swap:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
</style>
