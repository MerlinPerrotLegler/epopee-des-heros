<template>
  <div class="cpa">

    <!-- Ligne 1 : pastille couleur + texte hex ────────────────────────────── -->
    <div class="cpa-main">
      <!-- Pastille : checkerboard + couleur + input natif invisible par-dessus -->
      <div class="cpa-swatch" :title="modelValue ?? 'null / auto'">
        <div class="cpa-checker" />
        <div class="cpa-fill" :style="{ background: displayColor }" />
        <input
          type="color"
          class="cpa-native"
          :value="rgbHex"
          @input="onRgbInput"
        />
      </div>

      <!-- Valeur texte brute -->
      <input
        type="text"
        class="cpa-text"
        :value="modelValue ?? ''"
        @change="onTextChange"
        placeholder="#rrggbbaa / transparent"
        spellcheck="false"
      />
    </div>

    <!-- Ligne 2 : slider alpha (masqué si valeur non parseable) ──────────── -->
    <div class="cpa-alpha" v-if="parsed !== null">
      <span class="cpa-lbl">α</span>
      <!-- Track dégradé : checkerboard + couleur sur fond transparent -->
      <div class="cpa-track" :style="trackStyle">
        <input
          type="range"
          class="cpa-range"
          min="0" max="100"
          :value="alphaPct"
          @input="onAlphaInput"
        />
      </div>
      <input
        type="number"
        class="cpa-num"
        min="0" max="100"
        :value="alphaPct"
        @input="onAlphaInput"
      />
      <span class="cpa-lbl">%</span>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue'])

// ── Parsing / formatage ───────────────────────────────────────────────────────
function parseColor(s) {
  if (s == null || s === 'none') return null
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  let m
  m = s.match(/^#([0-9a-fA-F]{8})$/)
  if (m) {
    const n = parseInt(m[1], 16)
    return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n & 255) / 255 }
  }
  m = s.match(/^#([0-9a-fA-F]{6})$/)
  if (m) {
    const n = parseInt(m[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }
  m = s.match(/^#([0-9a-fA-F]{3})$/)
  if (m) {
    const [r, g, b] = [0, 1, 2].map(i => parseInt(m[1][i].repeat(2), 16))
    return { r, g, b, a: 1 }
  }
  m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/)
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 }
  return null
}

function toHex8(r, g, b, a) {
  const h = v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}${h(a * 255)}`
}

// ── État dérivé ───────────────────────────────────────────────────────────────
const parsed = computed(() => parseColor(props.modelValue))

const rgbHex = computed(() => {
  if (!parsed.value) return '#000000'
  const { r, g, b } = parsed.value
  const h = v => Math.round(v).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
})

const alphaPct = computed(() => parsed.value ? Math.round(parsed.value.a * 100) : 100)

const displayColor = computed(() => {
  if (!parsed.value) return 'transparent'
  const { r, g, b, a } = parsed.value
  return `rgba(${r},${g},${b},${a})`
})

// Variables CSS pour le dégradé du track alpha
const trackStyle = computed(() => {
  if (!parsed.value) return {}
  const { r, g, b } = parsed.value
  return {
    '--c0': `rgba(${r},${g},${b},0)`,
    '--c1': `rgba(${r},${g},${b},1)`,
  }
})

// ── Handlers ──────────────────────────────────────────────────────────────────
function onRgbInput(e) {
  const m = e.target.value.match(/^#([0-9a-fA-F]{6})$/)
  if (!m) return
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  emit('update:modelValue', toHex8(r, g, b, parsed.value?.a ?? 1))
}

function onAlphaInput(e) {
  if (!parsed.value) return
  const a = Math.max(0, Math.min(100, +e.target.value)) / 100
  emit('update:modelValue', toHex8(parsed.value.r, parsed.value.g, parsed.value.b, a))
}

function onTextChange(e) {
  const raw = e.target.value.trim()
  if (!raw) { emit('update:modelValue', null); return }
  const p = parseColor(raw)
  // Si c'est une couleur reconnue → normalise en #RRGGBBAA ; sinon passe tel quel
  emit('update:modelValue', p ? toHex8(p.r, p.g, p.b, p.a) : raw)
}
</script>

<style scoped>
.cpa {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

/* ── Ligne 1 ─────────────────────────────────────────────────────────────── */
.cpa-main {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Pastille */
.cpa-swatch {
  position: relative;
  width: 28px;
  height: 24px;
  flex-shrink: 0;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  overflow: hidden;
  cursor: pointer;
}
.cpa-checker {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(45deg, #999 25%, transparent 25%),
    linear-gradient(-45deg, #999 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #999 75%),
    linear-gradient(-45deg, transparent 75%, #999 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: #fff;
}
.cpa-fill {
  position: absolute; inset: 0;
}
/* Input natif invisible mais cliquable au-dessus */
.cpa-native {
  position: absolute; inset: 0;
  opacity: 0;
  width: 100%; height: 100%;
  cursor: pointer;
  padding: 0; border: none;
}

/* Texte */
.cpa-text {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 4px;
}

/* ── Ligne 2 : alpha ─────────────────────────────────────────────────────── */
.cpa-alpha {
  display: flex;
  align-items: center;
  gap: 3px;
}

.cpa-lbl {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  flex-shrink: 0;
  line-height: 1;
}

/* Track : checkerboard + dégradé de couleur via pseudo-élément */
.cpa-track {
  position: relative;
  flex: 1;
  height: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  background-image:
    linear-gradient(45deg, #999 25%, transparent 25%),
    linear-gradient(-45deg, #999 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #999 75%),
    linear-gradient(-45deg, transparent 75%, #999 75%);
  background-size: 6px 6px;
  background-position: 0 0, 0 3px, 3px -3px, -3px 0;
  background-color: #fff;
}
.cpa-track::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, var(--c0, transparent), var(--c1, #000));
  pointer-events: none;
  border-radius: inherit;
}

/* Range : track transparent (le div fait le visuel), thumb stylé */
.cpa-range {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  z-index: 1;
}
.cpa-range::-webkit-slider-runnable-track { background: transparent; height: 100%; }
.cpa-range::-moz-range-track { background: transparent; height: 100%; }
.cpa-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: white;
  border: 1.5px solid rgba(0,0,0,0.35);
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  margin-top: 0;
}
.cpa-range::-moz-range-thumb {
  width: 12px; height: 12px;
  border-radius: 50%;
  background: white;
  border: 1.5px solid rgba(0,0,0,0.35);
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  cursor: pointer;
}

/* Champ numérique alpha */
.cpa-num {
  width: 32px;
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 3px;
  text-align: right;
}
</style>
