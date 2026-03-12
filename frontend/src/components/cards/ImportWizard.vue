<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="wizard-modal">
      <!-- Header -->
      <div class="wizard-header">
        <div class="wizard-title">Import CSV / Google Sheets</div>
        <div class="wizard-steps">
          <span v-for="(s, i) in STEPS" :key="i"
            class="step-dot" :class="{ active: step === i, done: step > i }">{{ i + 1 }}</span>
        </div>
        <button class="btn-icon" @click="$emit('close')">×</button>
      </div>

      <!-- Step 1: Source URL -->
      <div v-if="step === 0" class="wizard-body">
        <div class="step-label">① Source de données</div>
        <div class="field-group">
          <label>URL CSV ou Google Sheets</label>
          <div class="url-row">
            <input v-model="sourceUrl" placeholder="https://docs.google.com/spreadsheets/d/…"
              class="url-input" @keyup.enter="loadPreview" />
            <button class="btn-primary" @click="loadPreview" :disabled="!sourceUrl.trim() || loadingPreview">
              {{ loadingPreview ? '…' : 'Charger' }}
            </button>
          </div>
          <div class="hint" v-if="sourceUrl.includes('docs.google.com')">
            URL normale ou publiée acceptée — normalisée automatiquement.
          </div>
        </div>

        <div class="gs-help">
          <button class="gs-help-toggle" @click="showGsHelp = !showGsHelp">
            {{ showGsHelp ? '▾' : '▸' }} Comment obtenir cette URL ?
          </button>
          <div v-if="showGsHelp" class="gs-help-body">
            <ol class="gs-steps">
              <li>Ouvrir la feuille Google Sheets dans le navigateur</li>
              <li>Menu <strong>Fichier → Partager → Publier sur le Web</strong></li>
              <li>Colonne gauche : choisir l'onglet voulu · Colonne droite : <strong>Valeurs séparées par des virgules (.csv)</strong></li>
              <li>Cliquer sur <strong>Publier</strong>, puis confirmer</li>
              <li>Copier l'URL générée et la coller ci-dessus</li>
            </ol>
            <div class="gs-note">Pour un onglet spécifique, l'URL contient <code>&gid=XXXXXXXX</code> — visible dans l'onglet du navigateur après <code>#gid=</code>.</div>
          </div>
        </div>

        <div v-if="previewError" class="error-msg">{{ previewError }}</div>

        <div v-if="preview.length" class="preview-section">
          <div class="preview-meta">{{ totalRows }} lignes · {{ headers.length }} colonnes</div>
          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead><tr><th v-for="h in headers" :key="h">{{ h }}</th></tr></thead>
              <tbody>
                <tr v-for="(row, i) in preview" :key="i">
                  <td v-for="h in headers" :key="h">{{ row[h] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Step 2: Mode + Layout + idColumn -->
      <div v-if="step === 1" class="wizard-body">
        <div class="step-label">② Configuration</div>

        <div class="field-group">
          <label>Mode d'import</label>
          <div class="radio-group">
            <label class="radio-opt" :class="{ active: mode === 'single' }">
              <input type="radio" v-model="mode" value="single" /> Un seul layout
            </label>
            <label class="radio-opt" :class="{ active: mode === 'multi' }">
              <input type="radio" v-model="mode" value="multi" /> Multi-layouts (colonne discriminante)
            </label>
          </div>
        </div>

        <div v-if="mode === 'single'" class="field-group">
          <label>Layout cible</label>
          <select v-model="layoutId" class="select-field">
            <option value="">— Sélectionner —</option>
            <option v-for="l in rectoLayouts" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>

        <div v-if="mode === 'multi'" class="field-group">
          <label>Colonne contenant le nom du layout</label>
          <select v-model="layoutColumn" class="select-field">
            <option value="">— Sélectionner —</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
          <div class="hint">Chaque ligne sera routée vers le layout dont le nom correspond.</div>
        </div>

        <div class="field-group">
          <label>Colonne identifiant stable</label>
          <select v-model="idColumn" class="select-field">
            <option value="">— Sélectionner —</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
          <div class="hint">Utilisée pour retrouver les cartes lors des syncs ultérieures (évite les doublons).</div>
        </div>

        <div class="field-group">
          <label>Label de cet import (optionnel)</label>
          <input v-model="importLabel" placeholder="ex: Cartes équipement v3" />
        </div>
      </div>

      <!-- Step 3: Mapping colonnes → atoms -->
      <div v-if="step === 2" class="wizard-body">
        <div class="step-label">③ Mapping colonnes → chemins atom</div>
        <div class="mapping-hint">
          Associez chaque colonne CSV à un chemin de binding atom du layout.
          Les suggestions <span class="badge-auto">auto</span> sont déduites automatiquement.
        </div>

        <div v-if="loadingPaths" class="loading-msg">Chargement des chemins…</div>

        <div v-else class="mapping-rows">
          <div class="mapping-header">
            <span>Colonne CSV</span>
            <span>→</span>
            <span>Chemin atom</span>
          </div>
          <div v-for="col in headers" :key="col" class="mapping-row">
            <span class="col-name">{{ col }}</span>
            <span class="arrow">→</span>
            <div class="path-select-wrap">
              <input
                :value="getMappingValue(col)"
                @input="setMapping(col, $event.target.value)"
                list="binding-paths-datalist"
                class="path-input"
                placeholder="— ignorer —"
              />
              <span v-if="getMappingConfidence(col) === 'auto'" class="badge-auto" title="Déduit automatiquement">auto</span>
              <span v-else-if="getMappingConfidence(col) === 'manual'" class="badge-manual" title="Défini manuellement">✓</span>
            </div>
          </div>

          <datalist id="binding-paths-datalist">
            <option v-for="p in currentBindingPaths" :key="p.path" :value="p.path">{{ p.path }}</option>
          </datalist>
        </div>

        <button class="btn-ghost btn-sm" style="margin-top:8px" @click="autoFillMappings">⟳ Auto-déduire</button>
      </div>

      <!-- Step 4: Options -->
      <div v-if="step === 3" class="wizard-body">
        <div class="step-label">④ Options d'import</div>

        <div class="option-row">
          <label class="checkbox-opt">
            <input type="checkbox" v-model="overwrite" />
            Mettre à jour les cartes existantes (match sur identifiant)
          </label>
          <div class="hint">Si une carte avec le même identifiant existe déjà, ses données seront remplacées.</div>
        </div>

        <div class="summary-box">
          <div class="summary-title">Récapitulatif</div>
          <div class="summary-row"><span>Source</span><span class="mono">{{ shortUrl }}</span></div>
          <div class="summary-row"><span>Mode</span><span>{{ mode === 'single' ? 'Mono-layout' : 'Multi-layouts' }}</span></div>
          <div v-if="mode === 'single'" class="summary-row">
            <span>Layout</span><span>{{ layoutName }}</span>
          </div>
          <div class="summary-row"><span>Identifiant</span><span class="mono">{{ idColumn }}</span></div>
          <div class="summary-row"><span>Lignes CSV</span><span>{{ totalRows }}</span></div>
          <div class="summary-row">
            <span>Colonnes mappées</span>
            <span>{{ mappedCount }} / {{ headers.length }}</span>
          </div>
        </div>
      </div>

      <!-- Step 5: Result -->
      <div v-if="step === 4" class="wizard-body">
        <div v-if="importing" class="importing-state">
          <div class="spinner"></div>
          <div>Import en cours…</div>
        </div>
        <div v-else-if="importResult">
          <div class="result-icon" :class="importResult.errors?.length ? 'warn' : 'ok'">
            {{ importResult.errors?.length ? '⚠' : '✅' }}
          </div>
          <div class="result-title">Import terminé</div>
          <div class="result-stats">
            <div><span class="stat-val green">{{ importResult.created }}</span> créées</div>
            <div><span class="stat-val blue">{{ importResult.updated }}</span> mises à jour</div>
            <div><span class="stat-val muted">{{ importResult.skipped }}</span> ignorées</div>
            <div v-if="importResult.errors?.length">
              <span class="stat-val red">{{ importResult.errors.length }}</span> erreurs
            </div>
          </div>
          <div v-if="importResult.errors?.length" class="error-list">
            <div v-for="e in importResult.errors" :key="e" class="error-item">⚠ {{ e }}</div>
          </div>
        </div>
        <div v-else-if="importError" class="error-msg">{{ importError }}</div>
      </div>

      <!-- Footer -->
      <div class="wizard-footer">
        <button v-if="step > 0 && step < 4" class="btn-ghost" @click="step--">← Retour</button>
        <div style="flex:1"></div>

        <!-- Step 0 -->
        <button v-if="step === 0" class="btn-primary" @click="nextStep"
          :disabled="!preview.length">Suivant →</button>

        <!-- Step 1 -->
        <button v-if="step === 1" class="btn-primary" @click="nextStep"
          :disabled="!step1Valid">Suivant →</button>

        <!-- Step 2 -->
        <button v-if="step === 2" class="btn-primary" @click="nextStep">Suivant →</button>

        <!-- Step 3 (Options → Import) -->
        <button v-if="step === 3" class="btn-primary" @click="runImport" :disabled="importing">
          Importer ({{ totalRows }} lignes)
        </button>

        <!-- Step 4 (Result) -->
        <button v-if="step === 4 && !importing" class="btn-primary" @click="finish">
          {{ importResult ? 'Voir les cartes' : 'Fermer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { api } from '@/utils/api.js'
import { getBindablePaths } from '@/utils/binding.js'

const props = defineProps({
  layouts: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'imported'])

const STEPS = ['Source', 'Config', 'Mapping', 'Options', 'Résultat']

// State
const step = ref(0)
const sourceUrl = ref('')
const loadingPreview = ref(false)
const previewError = ref('')
const headers = ref([])
const preview = ref([])
const totalRows = ref(0)

const mode = ref('single')
const layoutId = ref('')
const layoutColumn = ref('')
const idColumn = ref('')
const importLabel = ref('')

// Mapping: { layoutId: { csvCol: bindingPath }, confidence: { csvCol: 'manual'|'auto' } }
const mappings = ref({})
const confidences = ref({})
const currentBindingPaths = ref([])
const loadingPaths = ref(false)

const showGsHelp = ref(false)
const overwrite = ref(true)
const importing = ref(false)
const importResult = ref(null)
const importError = ref('')

// Computed
const rectoLayouts = computed(() => props.layouts.filter(l => !l.is_back))

const layoutName = computed(() => {
  return props.layouts.find(l => l.id === layoutId.value)?.name || '—'
})

const shortUrl = computed(() => {
  try { return new URL(sourceUrl.value).hostname + '…' } catch { return sourceUrl.value.slice(0, 40) }
})

const step1Valid = computed(() => {
  if (!idColumn.value) return false
  if (mode.value === 'single') return !!layoutId.value
  if (mode.value === 'multi') return !!layoutColumn.value
  return false
})

const mappedCount = computed(() => {
  const m = mode.value === 'single' ? (mappings.value[layoutId.value] || {}) : {}
  return Object.values(m).filter(v => v).length
})

// Watch layout change to reload binding paths
watch(layoutId, async (id) => {
  if (!id || mode.value !== 'single') return
  await loadBindingPaths(id)
})

watch(step, async (s) => {
  if (s === 2 && mode.value === 'single' && layoutId.value) {
    await loadBindingPaths(layoutId.value)
    autoFillMappings()
  }
})

// Methods
async function loadPreview() {
  previewError.value = ''
  loadingPreview.value = true
  try {
    const data = await api.previewCsvUrl(sourceUrl.value.trim())
    headers.value = data.headers
    preview.value = data.preview
    totalRows.value = data.totalRows
  } catch (e) {
    previewError.value = e.message
  } finally {
    loadingPreview.value = false
  }
}

async function loadBindingPaths(id) {
  loadingPaths.value = true
  try {
    const layout = await api.getLayout(id)
    const def = typeof layout.definition === 'string'
      ? JSON.parse(layout.definition)
      : layout.definition
    currentBindingPaths.value = getBindablePaths(def)
  } catch { currentBindingPaths.value = [] }
  finally { loadingPaths.value = false }
}

function getMappingValue(col) {
  const layoutKey = mode.value === 'single' ? layoutId.value : '*'
  return mappings.value[layoutKey]?.[col] || ''
}

function getMappingConfidence(col) {
  const layoutKey = mode.value === 'single' ? layoutId.value : '*'
  return confidences.value[layoutKey]?.[col] || 'none'
}

function setMapping(col, value) {
  const layoutKey = mode.value === 'single' ? layoutId.value : '*'
  if (!mappings.value[layoutKey]) mappings.value[layoutKey] = {}
  if (!confidences.value[layoutKey]) confidences.value[layoutKey] = {}
  mappings.value[layoutKey][col] = value
  confidences.value[layoutKey][col] = 'manual'
}

function autoFillMappings() {
  const layoutKey = mode.value === 'single' ? layoutId.value : '*'
  if (!mappings.value[layoutKey]) mappings.value[layoutKey] = {}
  if (!confidences.value[layoutKey]) confidences.value[layoutKey] = {}

  for (const col of headers.value) {
    // Already manually set → skip
    if (confidences.value[layoutKey][col] === 'manual') continue

    // Try exact match: col name === last segment of binding path
    const match = currentBindingPaths.value.find(p =>
      p.paramName === col || p.path === col ||
      p.path.endsWith(`.${col}`) || p.nameInLayout === col
    )
    if (match) {
      mappings.value[layoutKey][col] = match.path
      confidences.value[layoutKey][col] = 'auto'
    }
  }
}

async function nextStep() {
  step.value++
}

async function runImport() {
  importing.value = true
  importError.value = ''
  importResult.value = null

  // Build mappings payload: flatten to { layoutId: { csvCol: path } }
  const finalMappings = {}
  if (mode.value === 'single') {
    finalMappings[layoutId.value] = Object.fromEntries(
      Object.entries(mappings.value[layoutId.value] || {}).filter(([, v]) => v)
    )
  } else {
    // For multi mode, use '*' mappings for all layouts
    finalMappings['*'] = Object.fromEntries(
      Object.entries(mappings.value['*'] || {}).filter(([, v]) => v)
    )
  }

  try {
    const result = await api.importCardsFromUrl({
      sourceUrl: sourceUrl.value.trim(),
      mode: mode.value,
      layoutId: mode.value === 'single' ? layoutId.value : undefined,
      layoutColumn: mode.value === 'multi' ? layoutColumn.value : undefined,
      idColumn: idColumn.value,
      mappings: finalMappings,
      label: importLabel.value || undefined,
    })
    importResult.value = result
  } catch (e) {
    importError.value = e.message
  } finally {
    importing.value = false
  }
}

function finish() {
  if (importResult.value) emit('imported', importResult.value)
  else emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.wizard-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  width: 680px;
  max-width: 96vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}

.wizard-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.wizard-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.wizard-steps {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.step-dot {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600;
  background: var(--bg-secondary);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}
.step-dot.active { background: var(--accent-primary); color: #fff; border-color: var(--accent-primary); }
.step-dot.done { background: var(--bg-secondary); color: var(--accent-primary); border-color: var(--accent-primary); }

.wizard-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 8px;
}

.step-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.field-group {
  margin-bottom: 16px;
}

.field-group label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.field-group input, .field-group select, .select-field {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 12px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}

.url-row { display: flex; gap: 8px; }
.url-input { flex: 1; }

.hint {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
}

.error-msg {
  color: var(--accent-danger);
  font-size: 12px;
  background: rgba(220,50,50,0.08);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  margin-bottom: 12px;
}

.preview-section { margin-top: 16px; }
.preview-meta { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }
.preview-table-wrap { overflow-x: auto; max-height: 180px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); }
.preview-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.preview-table th { padding: 4px 8px; background: var(--bg-secondary); color: var(--text-muted); font-weight: 600; text-align: left; border-bottom: 1px solid var(--border-subtle); position: sticky; top: 0; }
.preview-table td { padding: 3px 8px; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.radio-group { display: flex; gap: 12px; flex-wrap: wrap; }
.radio-opt { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; padding: 6px 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-secondary); }
.radio-opt input { margin: 0; }
.radio-opt.active { border-color: var(--accent-primary); color: var(--accent-primary); }

.mapping-hint { font-size: 11px; color: var(--text-muted); margin-bottom: 12px; }
.mapping-header { display: grid; grid-template-columns: 1fr 24px 1fr; gap: 8px; padding: 0 0 6px; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-subtle); margin-bottom: 4px; }
.mapping-rows { display: flex; flex-direction: column; gap: 4px; }
.mapping-row { display: grid; grid-template-columns: 1fr 24px 1fr; gap: 8px; align-items: center; }
.col-name { font-size: 11px; font-family: var(--font-mono); color: var(--text-primary); padding: 4px 8px; background: var(--bg-secondary); border-radius: var(--radius-sm); }
.arrow { text-align: center; color: var(--text-muted); font-size: 12px; }
.path-select-wrap { display: flex; align-items: center; gap: 4px; }
.path-input { flex: 1; background: var(--bg-secondary); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 11px; font-family: var(--font-mono); padding: 4px 6px; border-radius: var(--radius-sm); }
.path-input:focus { border-color: var(--accent-primary); outline: none; }

.badge-auto { font-size: 9px; background: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border-subtle); padding: 1px 5px; border-radius: 10px; white-space: nowrap; }
.badge-manual { font-size: 9px; color: var(--accent-primary); }

.loading-msg { color: var(--text-muted); font-size: 12px; padding: 20px 0; text-align: center; }

.option-row { margin-bottom: 20px; }
.checkbox-opt { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); cursor: pointer; }
.checkbox-opt input { margin: 0; }

.summary-box { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px; }
.summary-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 8px; }
.summary-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; color: var(--text-secondary); }
.summary-row span:last-child { color: var(--text-primary); font-weight: 500; }
.mono { font-family: var(--font-mono); }

.importing-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: var(--text-muted); font-size: 13px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border-subtle); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.result-icon { font-size: 36px; text-align: center; margin-bottom: 8px; }
.result-title { font-size: 16px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.result-stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 16px; }
.result-stats > div { text-align: center; font-size: 11px; color: var(--text-muted); }
.stat-val { display: block; font-size: 22px; font-weight: 700; }
.stat-val.green { color: var(--accent-success, #4caf50); }
.stat-val.blue { color: var(--accent-info, #2196f3); }
.stat-val.muted { color: var(--text-muted); }
.stat-val.red { color: var(--accent-danger); }

.error-list { max-height: 120px; overflow-y: auto; background: rgba(220,50,50,0.05); border: 1px solid rgba(220,50,50,0.2); border-radius: var(--radius-sm); padding: 8px; }
.error-item { font-size: 11px; color: var(--accent-danger); padding: 2px 0; }

.gs-help {
  margin-bottom: 12px;
}

.gs-help-toggle {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.gs-help-toggle:hover { color: var(--text-secondary); }

.gs-help-body {
  margin-top: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}

.gs-steps {
  margin: 0 0 8px 0;
  padding-left: 18px;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.8;
}
.gs-steps strong { color: var(--text-primary); }

.gs-note {
  font-size: 10px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-subtle);
  padding-top: 6px;
}
.gs-note code {
  font-family: var(--font-mono);
  background: var(--bg-primary);
  padding: 1px 4px;
  border-radius: 3px;
}

.wizard-footer {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
  gap: 8px;
}
</style>
