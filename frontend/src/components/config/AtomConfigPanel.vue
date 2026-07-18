<template>
  <div class="atom-config">
    <div class="atom-tabs">
      <button
        v-for="atom in atomEntries"
        :key="atom.type"
        class="atom-tab"
        :class="{ active: selectedAtom === atom.type }"
        @click="selectedAtom = atom.type"
      >
        <span class="atom-tab-icon">{{ atom.icon || '◻' }}</span>
        <span>{{ atom.label }}</span>
      </button>
    </div>

    <div v-if="selectedAtomDef" class="atom-body">
      <p class="hint">
        Définis uniquement une valeur fixe avec le sélecteur adapté au type du paramètre.
      </p>

      <div class="grid-head">
        <div>Paramètre</div>
        <div>Fixer</div>
        <div>Valeur</div>
        <div>Oeil</div>
      </div>

      <div v-for="key in selectedParamKeys" :key="key" class="param-row">
        <div class="param-meta">
          <strong>{{ prettyLabel(key) }}</strong>
          <small>{{ key }}</small>
        </div>

        <label class="fix-col">
          <input type="checkbox" :checked="isFixedEnabled(key)" @change="toggleFixed(key, $event.target.checked)">
        </label>

        <div class="typed-value">
          <div
            v-if="(selectedAtom === 'iconMap' || selectedAtom === 'badge') && key === 'rows'"
            class="rows-editor"
          >
            <div
              v-for="(row, idx) in mapRows()"
              :key="`cfg-row-${idx}`"
              class="rows-editor-line"
              :class="{ 'rows-editor-line--badge': selectedAtom === 'badge' }"
            >
              <input
                type="text"
                :value="row.value || ''"
                @input="updateMapRow(idx, 'value', $event.target.value)"
                :disabled="!isFixedEnabled(key)"
                placeholder="valeur"
              />
              <input
                v-if="selectedAtom === 'badge'"
                type="text"
                :value="row.label || ''"
                @input="updateMapRow(idx, 'label', $event.target.value)"
                :disabled="!isFixedEnabled(key)"
                placeholder="label"
              />
              <input
                v-if="selectedAtom === 'badge'"
                type="number"
                step="0.1"
                min="0.1"
                :value="row.fontSize ?? ''"
                @input="updateMapRow(idx, 'fontSize', $event.target.value === '' ? null : +$event.target.value)"
                :disabled="!isFixedEnabled(key)"
                :placeholder="String(defaultParamValue('fontSize') ?? 2.5)"
                title="Taille mm (vide = défaut atome)"
                class="fontsize"
              />
              <input
                type="text"
                :value="row.mediaId || ''"
                @input="updateMapRow(idx, 'mediaId', $event.target.value || null)"
                :disabled="!isFixedEnabled(key)"
                placeholder="media ID"
                class="mono"
              />
              <MediaPicker
                :model-value="row.mediaId || null"
                @update:model-value="updateMapRow(idx, 'mediaId', $event || null)"
              />
              <button class="line-btn" @click="removeMapRow(idx)" :disabled="!isFixedEnabled(key)">✕</button>
            </div>
            <button class="line-btn add" @click="addMapRow" :disabled="!isFixedEnabled(key)">+ Ligne</button>
          </div>

          <ColorPickerAlpha
            v-else-if="controlType(key) === 'color'"
            :model-value="valueAsColorString(key)"
            @update:model-value="onTypedValueChange(key, $event)"
          />

          <select
            v-else-if="controlType(key) === 'select'"
            :value="typedValue(key)"
            @change="onTypedValueChange(key, $event.target.value)"
            :disabled="!isFixedEnabled(key)"
          >
            <option v-for="opt in getEnumOptions(key)" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <label v-else-if="controlType(key) === 'boolean'" class="bool-row">
            <input type="checkbox" :checked="!!typedValue(key)" @change="onTypedValueChange(key, $event.target.checked)" :disabled="!isFixedEnabled(key)">
            <span>{{ !!typedValue(key) ? 'true' : 'false' }}</span>
          </label>

          <input
            v-else-if="controlType(key) === 'number'"
            type="number"
            :step="numberStep(key)"
            :value="typedValue(key)"
            @input="onTypedValueChange(key, +$event.target.value)"
            :disabled="!isFixedEnabled(key)"
          />

          <input
            v-else
            type="text"
            :value="typedValue(key)"
            @input="onTypedValueChange(key, $event.target.value)"
            :disabled="!isFixedEnabled(key)"
          />
        </div>

        <button
          class="eye-btn"
          :class="{ hidden: !!paramRule(key).hidden }"
          :title="paramRule(key).hidden ? 'Afficher dans PropertiesPanel' : 'Masquer dans PropertiesPanel'"
          @click="toggleHidden(key)"
        >
          {{ paramRule(key).hidden ? '🙈' : '👁' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ATOM_TYPES } from '@/atoms/index.js'
import { useConfigStore } from '@/stores/config.js'
import { useFontsStore } from '@/stores/fonts.js'
import ColorPickerAlpha from '@/components/editor/ColorPickerAlpha.vue'
import MediaPicker from '@/components/editor/MediaPicker.vue'

const configStore = useConfigStore()
const fontsStore = useFontsStore()

const INTEGER_PARAMS = new Set([
  'n_start', 'n_end', 'cells_top', 'cells_left',
  'fontWeight', 'borderRadius', 'cornerTextAngle',
  'value', 'n', 'posX', 'posY',
])

const ENUM_MAPS = {
  startCorner: ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'],
  roundMode: ['round', 'floor', 'ceil'],
  textOrientation: ['parallel', 'perpendicular'],
  cornerTextMode: ['bisect', 'parallel', 'perpendicular', 'custom'],
  textAlign: ['left', 'center', 'right', 'justify'],
  titleAlign: ['left', 'center', 'right'],
  textTransform: ['none', 'uppercase', 'capitalize', 'lowercase'],
  overflow: ['hidden', 'visible', 'ellipsis'],
  fit: ['cover', 'contain', 'fill', 'none'],
  layout: ['horizontal', 'vertical', 'grid'],
  borderStyle: ['solid', 'dashed', 'dotted'],
  style: ['solid', 'dashed', 'dotted'],
  fontFamily: ['Outfit', 'JetBrains Mono', 'serif', 'sans-serif'],
  resourceType: ['pieces', 'essence', 'pierre', 'mithril', 'cristaux', 'fragment'],
  cardType: ['equipement', 'classe', 'quete', 'bricabrac', 'cestpasjuste', 'buff', 'faveur', 'epopee'],
  blendMode: ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-burn', 'color-dodge'],
  shape: ['ellipse', 'circle'],
  direction: ['horizontal', 'vertical'],
  stat: ['FOR', 'DEX', 'INI', 'CHA', 'MAG', 'DEV', 'VIE'],
  svgPosition: ['front', 'behind'],
  tier: ['fin', 'basic', 'rare', 'epic', 'mythique', 'legendaire'],
}

const atomEntries = computed(() =>
  Object.entries(ATOM_TYPES).map(([type, def]) => ({
    type,
    label: def.label || type,
    icon: def.icon || '',
    defaultParams: def.defaultParams || {},
  }))
)
const selectedAtom = ref(atomEntries.value[0]?.type || '')
const selectedAtomDef = computed(() => atomEntries.value.find(a => a.type === selectedAtom.value) || null)
const selectedParamKeys = computed(() => selectedAtomDef.value ? Object.keys(selectedAtomDef.value.defaultParams) : [])

function prettyLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
}
function defaultParamValue(key) {
  return selectedAtomDef.value?.defaultParams?.[key]
}
function paramRule(key) {
  return configStore.getAtomParamRule(selectedAtom.value, key)
}
function isFixedEnabled(key) {
  return !!paramRule(key).fixedEnabled
}
function getEnumOptions(key) {
  if (key === 'fontFamily') return [...ENUM_MAPS.fontFamily, ...fontsStore.familyNames]
  return ENUM_MAPS[key] || null
}
function controlType(key) {
  const def = defaultParamValue(key)
  if (getEnumOptions(key)) return 'select'
  if (typeof def === 'boolean') return 'boolean'
  if (typeof def === 'number') return 'number'
  if (key.toLowerCase().includes('color') || (typeof def === 'string' && /^#[0-9a-fA-F]{6,8}$/.test(def))) return 'color'
  return 'text'
}
function numberStep(key) {
  if (INTEGER_PARAMS.has(key)) return 1
  if (key === 'fontSize' || key === 'maxFontSize') return 0.1
  return 0.5
}
function typedValue(key) {
  const rule = paramRule(key)
  if (rule.fixedValue !== undefined && rule.fixedValue !== null && rule.fixedValue !== '') return rule.fixedValue
  return defaultParamValue(key)
}
function valueAsColorString(key) {
  const v = typedValue(key)
  return typeof v === 'string' ? v : null
}

async function onTypedValueChange(key, value) {
  const patch = { fixedValue: value }
  // Checklist badge/iconMap : activer automatiquement le fix pour appliquer partout
  if (key === 'rows' && (selectedAtom.value === 'badge' || selectedAtom.value === 'iconMap')) {
    patch.fixedEnabled = true
  }
  await configStore.setAtomParamRule(selectedAtom.value, key, patch)
}
async function toggleFixed(key, fixedEnabled) {
  await configStore.setAtomParamRule(selectedAtom.value, key, { fixedEnabled })
}
async function toggleHidden(key) {
  await configStore.setAtomParamRule(selectedAtom.value, key, { hidden: !paramRule(key).hidden })
}

function mapRows() {
  const rows = typedValue('rows')
  return Array.isArray(rows) ? rows : []
}

async function updateMapRow(index, field, value) {
  const rows = [...mapRows()]
  rows[index] = { ...(rows[index] || {}), [field]: value }
  await onTypedValueChange('rows', rows)
}

async function addMapRow() {
  const blank = selectedAtom.value === 'badge'
    ? { value: '', mediaId: null, label: '', fontSize: null }
    : { value: '', mediaId: null }
  await onTypedValueChange('rows', [...mapRows(), blank])
}

async function removeMapRow(index) {
  const rows = [...mapRows()]
  rows.splice(index, 1)
  await onTypedValueChange('rows', rows)
}
</script>

<style scoped>
.atom-config { display: grid; grid-template-columns: 240px 1fr; gap: 14px; }
.atom-tabs { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-primary); padding: 4px; display: flex; flex-direction: column; gap: 2px; }
.atom-tab { display: flex; align-items: center; gap: 6px; border: none; border-radius: 6px; background: transparent; color: var(--text-muted); padding: 6px 8px; text-align: left; cursor: pointer; font-size: 11px; }
.atom-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
.atom-tab.active { background: var(--bg-tertiary); color: var(--accent-primary); font-weight: 600; }
.atom-tab-icon { width: 16px; text-align: center; }
.atom-body { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-primary); padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.hint { margin: 0 0 6px; color: var(--text-muted); font-size: 10px; }
.grid-head,
.param-row { display: grid; grid-template-columns: 190px 62px 1fr 44px; gap: 8px; align-items: start; }
.grid-head {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 4px;
  margin-bottom: 2px;
}
.param-meta { display: flex; flex-direction: column; min-width: 0; padding-top: 4px; }
.param-meta strong { font-size: 10px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.param-meta small { font-family: var(--font-mono); font-size: 9px; color: var(--text-muted); }
.typed-value { width: 100%; min-width: 0; }
.typed-value .mono { font-family: var(--font-mono); font-size: 10px; }
.fix-col { display: flex; align-items: center; justify-content: center; padding-top: 4px; }
.bool-row { display: inline-flex; gap: 6px; align-items: center; font-size: 10px; color: var(--text-secondary); }
.eye-btn { border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; font-size: 12px; height: 28px; margin-top: 2px; width: 40px; }
.eye-btn.hidden { color: #ef4444; border-color: #ef4444; }
.rows-editor { display: flex; flex-direction: column; gap: 4px; }
.rows-editor-line { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 4px; align-items: center; }
.rows-editor-line--badge { grid-template-columns: 1fr 1fr 52px 1fr auto auto; }
.typed-value .fontsize { width: 100%; font-size: 10px; }
.line-btn {
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 10px;
  padding: 4px 8px;
}
.line-btn.add { width: fit-content; }
</style>
