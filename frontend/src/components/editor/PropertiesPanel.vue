<template>
  <div class="properties-panel" v-if="el">
    <!-- Position & Size -->
    <div class="panel-section">
      <div class="panel-section-title">Position & Taille</div>
      <div class="pos-grid">
        <div class="pos-field">
          <label>X</label>
          <input type="number" :value="el.x_mm" @input="update('x_mm', +$event.target.value)" step="0.5" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field">
          <label>Y</label>
          <input type="number" :value="el.y_mm" @input="update('y_mm', +$event.target.value)" step="0.5" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field">
          <label>W</label>
          <input type="number" :value="el.width_mm" @input="update('width_mm', +$event.target.value)" step="0.5" min="1" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field">
          <label>H</label>
          <input type="number" :value="el.height_mm" @input="update('height_mm', +$event.target.value)" step="0.5" min="1" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field" style="grid-column: span 2">
          <label>Rotation</label>
          <input type="number" :value="el.rotation || 0" @input="update('rotation', +$event.target.value)" step="1" />
          <span class="unit">°</span>
        </div>
      </div>
    </div>

    <!-- Name in Layout (for data binding) -->
    <div class="panel-section">
      <div class="panel-section-title">Identifiant (data binding)</div>
      <div class="field-row">
        <label>Nom</label>
        <input
          :value="el.nameInLayout"
          @input="update('nameInLayout', $event.target.value)"
          placeholder="ex: card_name"
          style="flex:1; font-family: var(--font-mono); font-size: 11px"
        />
      </div>
    </div>

    <!-- ── Section spéciale CardTrack : édition par case ── -->
    <div class="panel-section" v-if="el.type === 'atom' && el.atomType === 'cardTrack'">
      <div class="panel-section-title">Édition par case</div>
      <div class="field-row" v-if="store.activeCellIdx !== null">
        <label style="color:var(--accent-primary)">Case #{{ store.activeCellIdx }}</label>
        <button class="clear-btn" @click="clearCellOverride">✕ Réinitialiser</button>
      </div>
      <div class="ct-hint" v-else>
        Cliquez une case du CardTrack dans le canvas pour la sélectionner.
      </div>
      <template v-if="store.activeCellIdx !== null">
        <div class="field-row">
          <label>Fond</label>
          <ColorPickerAlpha
            :model-value="activeCellOverride.bgColor ?? null"
            @update:model-value="setCellProp('bgColor', $event ?? undefined)"
          />
        </div>
        <div class="field-row">
          <label>SVG ID</label>
          <input :value="activeCellOverride.svgMediaId || ''" @input="setCellProp('svgMediaId', $event.target.value || undefined)" placeholder="media ID" style="flex:1; font-family:var(--font-mono); font-size:10px" />
          <MediaPicker :model-value="activeCellOverride.svgMediaId || null" @update:model-value="setCellProp('svgMediaId', $event || undefined)" />
        </div>
      </template>
    </div>

    <!-- ── Section spéciale : éditeur de dégradé ── -->
    <div class="panel-section" v-if="isGradientAtom">
      <div class="panel-section-title">Couleurs du dégradé</div>
      <GradientStopEditor
        :model-value="el.params.stops || []"
        @update:model-value="updateParam('stops', $event)"
        :gradient-type="el.atomType === 'backgroundGradientRadial' ? 'radial' : 'linear'"
        :angle="el.params.angle || 135"
        :pos-x="el.params.posX || 50"
        :pos-y="el.params.posY || 50"
        :shape="el.params.shape || 'ellipse'"
      />
    </div>

    <!-- Type-specific params -->
    <div class="panel-section" v-if="el.params">
      <div class="panel-section-title">Paramètres — {{ typeLabel }}</div>
      <!-- cellOverrides et stops (géré par sections dédiées) sont cachés -->
      <div
        v-for="(value, key) in el.params" :key="key" class="param-block"
        v-show="key !== 'cellOverrides' && !(isGradientAtom && key === 'stops')"
      >
        <div class="param-header">
          <label class="param-label" :title="key">{{ paramLabel(key) }}</label>
          <span v-if="PARAM_HELP[key]" class="param-help">{{ PARAM_HELP[key] }}</span>
        </div>
        <div class="field-row">

        <!-- Color picker avec alpha -->
        <template v-if="isColorParam(key, value)">
          <ColorPickerAlpha
            :model-value="typeof value === 'string' ? value : null"
            @update:model-value="updateParam(key, $event)"
            :data-param-key="key"
          />
        </template>

        <!-- Number -->
        <template v-else-if="typeof value === 'number'">
          <input type="number" :value="value" @input="updateParam(key, +$event.target.value)" :step="INTEGER_PARAMS.has(key) ? 1 : 0.5" :data-param-key="key" />
        </template>

        <!-- Boolean -->
        <template v-else-if="typeof value === 'boolean'">
          <input type="checkbox" :checked="value" @change="updateParam(key, $event.target.checked)" :data-param-key="key" />
        </template>

        <!-- Select for known enums -->
        <template v-else-if="getEnumOptions(key)">
          <select :value="value" @change="updateParam(key, $event.target.value)" :data-param-key="key">
            <option v-for="opt in getEnumOptions(key)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </template>

        <!-- Media ID param — text + picker button -->
        <template v-else-if="isMediaParam(key)">
          <input :value="value || ''" @input="updateParam(key, $event.target.value || null)" :data-param-key="key" style="flex:1; font-family:var(--font-mono); font-size:10px" placeholder="ID media" />
          <MediaPicker :model-value="value" @update:model-value="updateParam(key, $event)" />
        </template>

        <!-- Text (supports {{binding}} syntax) -->
        <template v-else-if="typeof value === 'string'">
          <input :value="value" @input="updateParam(key, $event.target.value)" :data-param-key="key" />
        </template>

        <!-- Object / other (JSON editor) — hidden if it's the stops array shown above -->
        <template v-else>
          <input :value="JSON.stringify(value)" @change="updateParamJson(key, $event.target.value)" class="json-input" :data-param-key="key" />
        </template>
        </div><!-- /.field-row -->
      </div><!-- /.param-block -->
    </div>
  </div>

  <div class="properties-empty" v-else>
    <p>Sélectionnez un élément pour voir ses propriétés.</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { ATOM_TYPES } from '@/atoms/index.js'
import { PARAM_HELP } from '@/atoms/paramHelp.js'
import GradientStopEditor from './GradientStopEditor.vue'
import MediaPicker from './MediaPicker.vue'
import ColorPickerAlpha from './ColorPickerAlpha.vue'

const store = useEditorStore()
const el = computed(() => store.selectedElement)

const typeLabel = computed(() => {
  if (!el.value) return ''
  if (el.value.type === 'atom' && ATOM_TYPES[el.value.atomType]) {
    return ATOM_TYPES[el.value.atomType].label
  }
  return el.value.type
})

const isGradientAtom = computed(() =>
  el.value?.type === 'atom' &&
  (el.value.atomType === 'backgroundGradientLinear' || el.value.atomType === 'backgroundGradientRadial')
)

function update(key, value) {
  store.updateElement(el.value.id, { [key]: value })
}

function updateParam(key, value) {
  const newParams = { ...el.value.params, [key]: value }
  store.updateElement(el.value.id, { params: newParams })
}

function updateParamJson(key, raw) {
  try {
    const parsed = JSON.parse(raw)
    updateParam(key, parsed)
  } catch { /* ignore invalid JSON */ }
}

// ── Gestion des overrides par case (CardTrack) ─────────────────────────────
const activeCellOverride = computed(() => {
  if (store.activeCellIdx === null || !el.value) return {}
  return el.value.params?.cellOverrides?.[store.activeCellIdx] ?? {}
})

function setCellProp(prop, value) {
  const overrides = { ...(el.value.params.cellOverrides || {}) }
  const cellData  = { ...(overrides[store.activeCellIdx] || {}) }
  if (value === undefined || value === '') {
    delete cellData[prop]
  } else {
    cellData[prop] = value
  }
  if (Object.keys(cellData).length === 0) {
    delete overrides[store.activeCellIdx]
  } else {
    overrides[store.activeCellIdx] = cellData
  }
  updateParam('cellOverrides', overrides)
}

function clearCellOverride() {
  const overrides = { ...(el.value.params.cellOverrides || {}) }
  delete overrides[store.activeCellIdx]
  updateParam('cellOverrides', overrides)
  store.activeCellIdx = null
}

function paramLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

function isColorParam(key, value) {
  if (value !== null && typeof value !== 'string') return false
  if (key.toLowerCase().includes('color')) return true
  if (typeof value === 'string') return /^#[0-9a-fA-F]{6,8}$/.test(value)
  return false
}

// Params whose value is always a media ID
const MEDIA_PARAMS = new Set(['mediaId', 'svgMediaId', 'iconMediaId', 'textureMediaId', 'overlayMediaId'])

function isMediaParam(key) {
  return MEDIA_PARAMS.has(key)
}

// Params dont la valeur est toujours un entier → step="1"
const INTEGER_PARAMS = new Set([
  'n_start', 'n_end', 'cells_top', 'cells_left',
  'fontWeight', 'borderRadius', 'cornerTextAngle',
  'value', 'n',
])

const ENUM_MAPS = {
  // CardTrack enums
  startCorner:     ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'],
  roundMode:       ['round', 'floor', 'ceil'],
  textOrientation: ['parallel', 'perpendicular'],
  cornerTextMode:  ['bisect', 'parallel', 'perpendicular', 'custom'],
  textAlign:       ['left', 'center', 'right', 'justify'],
  textTransform:   ['none', 'uppercase', 'capitalize', 'lowercase'],
  overflow:        ['hidden', 'visible', 'ellipsis'],
  fit:             ['cover', 'contain', 'fill', 'none'],
  layout:          ['horizontal', 'vertical', 'grid'],
  borderStyle:     ['solid', 'dashed', 'dotted'],
  style:           ['solid', 'dashed', 'dotted'],
  fontFamily:      ['Outfit', 'JetBrains Mono', 'serif', 'sans-serif'],
  resourceType:    ['or', 'essence', 'pierre', 'mithril', 'cristaux', 'fragment'],
  cardType:        ['equipement', 'classe', 'quete', 'bricabrac', 'cestpasjuste', 'buff', 'faveur', 'epopee'],
  // Background enums
  blendMode:       ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-burn', 'color-dodge'],
  shape:           ['ellipse', 'circle'],
  direction:       ['horizontal', 'vertical'],
  stat:            ['FOR', 'DEX', 'INI', 'CHA', 'MAG', 'DEV', 'VIE'],
  svgPosition:     ['front', 'behind'],
}

function getEnumOptions(key) {
  return ENUM_MAPS[key] || null
}
</script>

<style scoped>
.properties-panel {
  font-size: 11px;
}

.pos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.pos-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pos-field label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  width: 14px;
  flex-shrink: 0;
}

.pos-field input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 4px;
}

.unit {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.color-input {
  width: 28px;
  height: 24px;
  padding: 1px;
  border: 1px solid var(--border-default);
  cursor: pointer;
  flex-shrink: 0;
}

.color-text {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 10px;
}

.json-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent-info);
}

.param-block {
  margin-bottom: 6px;
}

.param-header {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 2px;
}

.param-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary, #a0a8c0);
  text-transform: none;
}

.param-help {
  font-size: 9px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.3;
  white-space: normal;
}

.ct-hint {
  color: var(--text-muted);
  font-size: 10px;
  font-style: italic;
  padding: 4px 0;
}

.clear-btn {
  margin-left: auto;
  background: none;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 6px;
}
.clear-btn:hover { color: #ef4444; border-color: #ef4444; }

.properties-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
