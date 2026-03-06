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

    <!-- Type-specific params -->
    <div class="panel-section" v-if="el.params">
      <div class="panel-section-title">Paramètres — {{ typeLabel }}</div>
      <div v-for="(value, key) in el.params" :key="key" class="field-row">
        <label :title="key">{{ key }}</label>

        <!-- Color picker -->
        <template v-if="isColorParam(key, value)">
          <input type="color" :value="value" @input="updateParam(key, $event.target.value)" class="color-input" />
          <input :value="value" @input="updateParam(key, $event.target.value)" class="color-text" />
        </template>

        <!-- Number -->
        <template v-else-if="typeof value === 'number'">
          <input type="number" :value="value" @input="updateParam(key, +$event.target.value)" step="0.5" />
        </template>

        <!-- Boolean -->
        <template v-else-if="typeof value === 'boolean'">
          <input type="checkbox" :checked="value" @change="updateParam(key, $event.target.checked)" />
        </template>

        <!-- Select for known enums -->
        <template v-else-if="getEnumOptions(key)">
          <select :value="value" @change="updateParam(key, $event.target.value)">
            <option v-for="opt in getEnumOptions(key)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </template>

        <!-- Text (supports {{binding}} syntax) -->
        <template v-else-if="typeof value === 'string'">
          <input :value="value" @input="updateParam(key, $event.target.value)" />
        </template>

        <!-- Object / other (JSON editor) -->
        <template v-else>
          <input :value="JSON.stringify(value)" @change="updateParamJson(key, $event.target.value)" class="json-input" />
        </template>
      </div>
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

const store = useEditorStore()
const el = computed(() => store.selectedElement)

const typeLabel = computed(() => {
  if (!el.value) return ''
  if (el.value.type === 'atom' && ATOM_TYPES[el.value.atomType]) {
    return ATOM_TYPES[el.value.atomType].label
  }
  return el.value.type
})

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

function isColorParam(key, value) {
  if (typeof value !== 'string') return false
  return key.toLowerCase().includes('color') || /^#[0-9a-fA-F]{6,8}$/.test(value)
}

const ENUM_MAPS = {
  textAlign: ['left', 'center', 'right', 'justify'],
  textTransform: ['none', 'uppercase', 'capitalize', 'lowercase'],
  overflow: ['hidden', 'visible', 'ellipsis'],
  fit: ['cover', 'contain', 'fill'],
  layout: ['horizontal', 'vertical', 'grid'],
  borderStyle: ['solid', 'dashed', 'dotted'],
  style: ['solid', 'dashed', 'dotted'],
  fontFamily: ['Outfit', 'JetBrains Mono', 'serif', 'sans-serif'],
  resourceType: ['or', 'essence', 'pierre', 'mithril', 'cristaux', 'fragment'],
  cardType: ['equipement', 'classe', 'quete', 'bricabrac', 'cestpasjuste', 'buff', 'faveur', 'epopee'],
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

.properties-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
