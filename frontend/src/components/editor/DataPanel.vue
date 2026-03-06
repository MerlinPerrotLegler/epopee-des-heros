<template>
  <div class="data-panel">
    <div class="panel-section">
      <div class="panel-section-title">Bindings disponibles</div>
      <div class="binding-list" v-if="bindingPaths.length">
        <div v-for="bp in bindingPaths" :key="bp.path" class="binding-item">
          <code class="binding-path">{{ bp.path }}</code>
          <span class="binding-type">{{ bp.type }}</span>
        </div>
      </div>
      <div v-else class="empty-hint">
        Ajoutez un "Nom" (identifiant) aux éléments pour créer des bindings.
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Preview data</span>
        <button class="btn-icon btn-sm" @click="togglePreview">
          {{ store.previewData ? '✕ Off' : '▶ On' }}
        </button>
      </div>
      <div v-if="store.previewData !== null" class="preview-fields">
        <div v-for="bp in bindingPaths" :key="bp.path" class="field-row">
          <label :title="bp.path">{{ bp.nameInLayout }}.{{ bp.path.split('.').pop() }}</label>
          <input
            :value="store.previewData[bp.path] || ''"
            @input="store.previewData[bp.path] = $event.target.value"
          />
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">Import CSV</div>
      <input type="file" accept=".csv" @change="onCsvUpload" class="file-input" />
      <div v-if="csvPreview" class="csv-preview">
        <p>{{ csvPreview.length }} lignes importées</p>
        <button class="btn-primary btn-sm" @click="showMapping = true">Configurer le mapping</button>
      </div>
    </div>

    <!-- Mapping modal -->
    <div class="modal-overlay" v-if="showMapping" @click.self="showMapping = false">
      <div class="modal">
        <h3>Mapping CSV → Bindings</h3>
        <div v-for="col in csvColumns" :key="col" class="field-row">
          <label>{{ col }}</label>
          <select v-model="mapping[col]">
            <option value="">— ignorer —</option>
            <option v-for="bp in bindingPaths" :key="bp.path" :value="bp.path">{{ bp.path }}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="showMapping = false">Annuler</button>
          <button class="btn-primary" @click="doImport">Importer {{ csvPreview?.length }} cartes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { getBindablePaths } from '@/utils/binding.js'
import { api } from '@/utils/api.js'
import Papa from 'papaparse'

const store = useEditorStore()

const bindingPaths = computed(() => getBindablePaths(store.definition))

const csvPreview = ref(null)
const csvColumns = ref([])
const mapping = ref({})
const showMapping = ref(false)

function togglePreview() {
  if (store.previewData !== null) {
    store.previewData = null
  } else {
    const data = {}
    for (const bp of bindingPaths.value) {
      data[bp.path] = ''
    }
    store.previewData = data
  }
}

function onCsvUpload(e) {
  const file = e.target.files[0]
  if (!file) return

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete(results) {
      csvPreview.value = results.data
      csvColumns.value = results.meta.fields || []
      mapping.value = {}
      // Auto-map matching column names
      for (const col of csvColumns.value) {
        const match = bindingPaths.value.find(bp =>
          bp.path.toLowerCase().includes(col.toLowerCase()) ||
          col.toLowerCase().includes(bp.nameInLayout?.toLowerCase())
        )
        if (match) mapping.value[col] = match.path
      }
      showMapping.value = true
    }
  })
}

async function doImport() {
  if (!csvPreview.value || !store.layout) return
  const cleanMapping = {}
  for (const [k, v] of Object.entries(mapping.value)) {
    if (v) cleanMapping[k] = v
  }
  await api.importCards({
    layout_id: store.layout.id,
    rows: csvPreview.value,
    mapping: cleanMapping
  })
  showMapping.value = false
  csvPreview.value = null
  alert(`${csvPreview.value?.length || 0} cartes importées !`)
}
</script>

<style scoped>
.binding-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.binding-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.binding-path {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent-info);
}

.binding-type {
  font-size: 9px;
  color: var(--text-muted);
}

.preview-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-fields label {
  font-family: var(--font-mono);
  font-size: 10px;
}

.file-input {
  font-size: 11px;
  color: var(--text-secondary);
}

.csv-preview {
  margin-top: 8px;
}

.csv-preview p {
  font-size: 11px;
  color: var(--accent-success);
  margin-bottom: 6px;
}

.empty-hint {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
