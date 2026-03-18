<template>
  <!--
    AtomRichText — Texte riche avec inline atoms (TSD-020).
    Parseur : richTextParser.js
    Syntaxe : **gras** *italique* __souligné__ ~~barré~~ `code`
              /D8{6}  /D12{3}  /R{or,42}  /FOR{+1}  /INI  /SVG{nom}
              $$frac(a,b)$$  $$$expr$$$
  -->
  <div class="rich-text-atom" :style="containerStyle">
    <template v-if="tokens.length">
      <template v-for="(token, i) in tokens" :key="i">

        <!-- ── Texte markdown → HTML ──────────────────────────────────── -->
        <span v-if="token.type === 'html'" v-html="token.html" class="rt-text" />

        <!-- ── Dé D8 ──────────────────────────────────────────────────── -->
        <span v-else-if="token.type === 'die' && token.sides === 8"
          class="rt-die"
          :style="dieSpanStyle"
        >
          <AtomDice8
            :params="diePenParams(token.value)"
            :width_mm="dieSize"
            :height_mm="dieSize"
            :zoom="zoom"
          />
        </span>

        <!-- ── Dé D12 ─────────────────────────────────────────────────── -->
        <span v-else-if="token.type === 'die' && token.sides === 12"
          class="rt-die"
          :style="dieSpanStyle"
        >
          <AtomDice12
            :params="diePenParams(token.value)"
            :width_mm="dieSize"
            :height_mm="dieSize"
            :zoom="zoom"
          />
        </span>

        <!-- ── Ressource ──────────────────────────────────────────────── -->
        <span v-else-if="token.type === 'resource'" class="rt-resource" :style="inlineTagStyle">
          <span :style="{ color: resourceColor(token.resource) }">
            {{ resourceIcon(token.resource) }}
          </span>
          <span v-if="token.amount">{{ token.amount }}</span>
        </span>

        <!-- ── Caractéristique / stat ──────────────────────────────────── -->
        <span v-else-if="token.type === 'stat'" class="rt-stat" :style="statStyle(token.stat)">
          <span v-if="token.modifier" class="rt-stat-mod">{{ token.modifier }}&thinsp;</span>
          <span class="rt-stat-name">{{ token.stat }}</span>
        </span>

        <!-- ── SVG média ──────────────────────────────────────────────── -->
        <img v-else-if="token.type === 'svg'"
          :src="`/uploads/${token.name}`"
          class="rt-svg"
          :style="dieSpanStyle"
        />

        <!-- ── Formule math (inline ou bloc) ──────────────────────────── -->
        <span v-else-if="token.type === 'math'"
          :class="['rt-math', { 'rt-math-block': token.block }]"
          v-html="renderMath(token.expr, token.block)"
        />

      </template>
    </template>

    <!-- Placeholder vide en mode éditeur -->
    <span v-else class="rt-placeholder">Texte riche…</span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { tokenize, parseFML }    from '@/utils/richTextParser.js'
import { RESOURCE_TYPES, STAT_TYPES } from '@/atoms/index.js'
import { useAtomScale }           from './useAtomScale.js'
import AtomDice8  from './AtomDice8.vue'
import AtomDice12 from './AtomDice12.vue'

const MM_TO_PX = 3.7795275591

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})

const { mmToPx } = useAtomScale(props)

// ── KaTeX (chargement dynamique — fallback texte si non installé) ──────────────
const katex = ref(null)
import('katex').then(m => { katex.value = m.default }).catch(() => {})

// ── Computed params ───────────────────────────────────────────────────────────
const p = computed(() => props.params)

const fontSize_mm  = computed(() => p.value.fontSize  || 3.5)
const diceScale    = computed(() => p.value.diceScale  || 1.4)
const dieSize      = computed(() => fontSize_mm.value * diceScale.value)  // mm
const color        = computed(() => p.value.color      || '#1a1a2e')
const fontFamily   = computed(() => p.value.fontFamily || 'Outfit, sans-serif')
const padding_mm   = computed(() => p.value.padding    || 0)

// ── Tokens (re-parsed on content change) ──────────────────────────────────────
const tokens = computed(() => tokenize(p.value.content || ''))

// ── Styles ────────────────────────────────────────────────────────────────────
const containerStyle = computed(() => ({
  display:    'inline',       // inline flow — le parent (canvas-element) est sized
  fontSize:   `${mmToPx(fontSize_mm.value)}px`,
  fontFamily: fontFamily.value,
  color:      color.value,
  lineHeight: p.value.lineHeight || 1.5,
  textAlign:  p.value.align || 'left',
  padding:    `${mmToPx(padding_mm.value)}px`,
  wordBreak:  'break-word',
  overflowWrap: 'break-word',
  whiteSpace: 'pre-wrap',
}))

// Die span : inline-block, vertical-align middle, sized in px
const dieSpanStyle = computed(() => {
  const px = dieSize.value * MM_TO_PX * (props.zoom || 1)
  return {
    display:       'inline-block',
    width:         `${px}px`,
    height:        `${px}px`,
    verticalAlign: 'middle',
    flexShrink:    '0',
  }
})

// Inline tag (resource, stat) base style — matches surrounding em-scale
const inlineTagStyle = computed(() => ({
  display:       'inline-flex',
  alignItems:    'center',
  gap:           '0.1em',
  verticalAlign: 'baseline',
  fontWeight:    '600',
}))

// ── Die params ────────────────────────────────────────────────────────────────
function diePenParams(value) {
  return {
    value,
    fontSize:   fontSize_mm.value,   // texte interne = même taille que le texte autour
    fontFamily: p.value.fontFamily,  // hérite de la police du richText
    textColor:  color.value,
    penColor:   color.value,
  }
}

// ── Resource helpers ──────────────────────────────────────────────────────────
function resourceColor(type) { return RESOURCE_TYPES[type]?.color || '#888' }
function resourceIcon(type)  { return RESOURCE_TYPES[type]?.icon  || '●'   }

// ── Stat style ────────────────────────────────────────────────────────────────
function statStyle(stat) {
  const bg = STAT_TYPES[stat]?.color || '#6c7aff'
  return {
    display:       'inline-flex',
    alignItems:    'center',
    gap:           '0.1em',
    verticalAlign: 'baseline',
    background:    bg,
    color:         '#fff',
    borderRadius:  '3px',
    padding:       '0 0.3em',
    fontWeight:    '700',
    fontSize:      '0.9em',
    letterSpacing: '0.04em',
    lineHeight:    '1.3em',
  }
}

// ── Math rendering ────────────────────────────────────────────────────────────
function renderMath(expr, block) {
  const latex = parseFML(expr)
  if (katex.value) {
    try {
      return katex.value.renderToString(latex, {
        throwOnError: false,
        displayMode: block,
      })
    } catch {
      return `<code class="rt-math-err">${expr}</code>`
    }
  }
  // KaTeX non disponible — afficher la formule FML brute
  return `<code class="rt-math-raw">${expr}</code>`
}
</script>

<style>
/* KaTeX override : fond transparent, couleur héritée */
.rt-math .katex { color: inherit; }
.rt-math-block  { display: block; text-align: center; margin: 0.3em 0; }
</style>

<style scoped>
.rich-text-atom {
  /* Le div est sized par le canvas-element (width/height en px).
     On utilise block pour que le contenu wrape correctement. */
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  /* hérité via style binding : font-size, font-family, color, line-height, text-align */
}

/* Reset inline pour les spans de texte markdown */
.rt-text {
  display: inline;
  white-space: pre-wrap;
}

/* Code inline */
.rt-text :deep(code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85em;
  background: rgba(0,0,0,0.08);
  border-radius: 3px;
  padding: 0.05em 0.3em;
}

/* Die container */
.rt-die {
  /* dieSpanStyle via :style binding */
  position: relative;
  overflow: visible;
}

/* Resource */
.rt-resource {
  /* inlineTagStyle via :style binding */
}

/* Stat */
.rt-stat {
  /* statStyle via :style binding */
}

.rt-stat-mod {
  font-size: 0.8em;
  font-weight: 600;
  opacity: 0.9;
}

.rt-stat-name {
  font-size: 1em;
}

/* SVG média inline */
.rt-svg {
  /* dieSpanStyle via :style binding */
  object-fit: contain;
  vertical-align: middle;
}

/* Math */
.rt-math {
  display: inline;
}
.rt-math-err, .rt-math-raw {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85em;
  color: #ef4444;
  background: rgba(239,68,68,0.08);
  border-radius: 3px;
  padding: 0.05em 0.3em;
}

/* Placeholder éditeur */
.rt-placeholder {
  color: rgba(0,0,0,0.25);
  font-style: italic;
  pointer-events: none;
}
</style>
