<template>
  <div class="rich-text-atom" :style="containerStyle">
    <template v-if="tokens.length">
      <template v-for="(token, i) in tokens" :key="i">
        <component
          :is="'h' + token.level"
          v-if="token.type === 'heading'"
          class="rt-heading"
          :style="{ fontSize: headingSize(token.level), ...headingMargin(token.level), ...blockAlign(token) }"
        >
          <RtInline :nodes="token.children" v-bind="inlineBind" />
        </component>

        <div
          v-else-if="token.type === 'separator'"
          class="rt-separator"
          :style="{ height: mmCss(token.height_mm || 2), ...blockAlign(token) }"
        >
          <svg
            width="100%"
            height="100%"
            :viewBox="`0 0 ${sepSvgW} ${(token.height_mm || 2) * SEP_SCALE}`"
            preserveAspectRatio="none"
            overflow="visible"
          >
            <path
              v-for="(stroke, si) in separatorPaths(token)"
              :key="si"
              :d="stroke.d"
              :fill="color"
              :fill-opacity="stroke.opacity"
            />
          </svg>
        </div>

        <div
          v-else-if="token.type === 'cadre'"
          class="rt-cadre"
          :style="{ height: mmCss(token.height_mm || 12), ...blockAlign(token) }"
        >
          <svg
            width="100%"
            height="100%"
            :viewBox="`0 0 ${sepSvgW} ${(token.height_mm || 12) * SEP_SCALE}`"
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
          >
            <g
              v-for="(stroke, si) in cadrePaths(token)"
              :key="'f' + si"
              :transform="stroke.transform"
            >
              <path
                :d="stroke.d"
                :fill="color"
                :fill-opacity="stroke.opacity"
              />
            </g>
            <g v-for="orn in cadreCorners(token)" :key="orn.key">
              <path
                v-if="orn.kind === 'star4' || orn.kind === 'star5'"
                :d="orn.d"
                :fill="color"
              />
              <circle
                v-else-if="orn.kind === 'circle'"
                :cx="orn.cx"
                :cy="orn.cy"
                :r="orn.r"
                :fill="color"
              />
              <rect
                v-else-if="orn.kind === 'square'"
                :x="orn.cx - orn.r"
                :y="orn.cy - orn.r"
                :width="orn.r * 2"
                :height="orn.r * 2"
                :fill="color"
              />
              <polygon
                v-else-if="orn.kind === 'triangle'"
                :points="`${orn.cx},${orn.cy - orn.r} ${orn.cx - orn.r * 0.866},${orn.cy + orn.r * 0.5} ${orn.cx + orn.r * 0.866},${orn.cy + orn.r * 0.5}`"
                :fill="color"
                :transform="`rotate(${orn.rotationDeg} ${orn.cx} ${orn.cy})`"
              />
            </g>
          </svg>
        </div>

        <blockquote v-else-if="token.type === 'blockquote'" class="rt-blockquote" :style="blockAlign(token)">
          <RtInline :nodes="token.children" v-bind="inlineBind" />
        </blockquote>

        <div v-else-if="token.type === 'checkbox'" class="rt-checkbox-line" :style="blockAlign(token)">
          <span class="rt-checkbox" :class="{ checked: token.checked }" aria-hidden="true">
            <img v-if="checkboxMediaSrc(token.checked)" :src="checkboxMediaSrc(token.checked)" class="rt-bullet-img" alt="" />
            <span v-else>{{ checkboxChar(token.checked) }}</span>
          </span>
          <span class="rt-li-body"><RtInline :nodes="token.children" v-bind="inlineBind" /></span>
        </div>

        <ul v-else-if="token.type === 'list' && !token.ordered" class="rt-list" :style="blockAlign(token)">
          <li v-for="(item, j) in token.items" :key="j" class="rt-li">
            <span class="rt-bullet" aria-hidden="true">
              <img v-if="bulletMediaSrc" :src="bulletMediaSrc" class="rt-bullet-img" alt="" />
              <span v-else>{{ bulletChar }}</span>
            </span>
            <span class="rt-li-body"><RtInline :nodes="item" v-bind="inlineBind" /></span>
          </li>
        </ul>

        <ol v-else-if="token.type === 'list' && token.ordered" class="rt-list rt-list-ol" :style="blockAlign(token)">
          <li v-for="(item, j) in token.items" :key="j">
            <RtInline :nodes="item" v-bind="inlineBind" />
          </li>
        </ol>

        <p v-else-if="token.type === 'paragraph'" class="rt-p" :style="blockAlign(token)">
          <RtInline :nodes="token.children" v-bind="inlineBind" />
        </p>

        <span v-else-if="token.type === 'html'" v-html="token.html" class="rt-text" />
      </template>
    </template>
    <span v-else class="rt-placeholder">Texte riche…</span>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, ref } from 'vue'
import { tokenize, parseFML } from '@/utils/richTextParser.js'
import { RESOURCE_TYPES, STAT_TYPES } from '@/atoms/index.js'
import { ATOM_PARAM_RULES_KEY, useConfigStore } from '@/stores/config.js'
import { usePictosStore } from '@/stores/pictos.js'
import { useEditorStore } from '@/stores/editor.js'
import { mmCss } from '@/utils/cssMm.js'
import { buildSeparatorPaths } from '@/utils/separatorStrokes.js'
import { buildFramePaths } from '@/utils/frameStrokes.js'
import { buildCornerOrnaments } from '@/utils/cornerOrnaments.js'
import AtomDice8 from './AtomDice8.vue'
import AtomDice12 from './AtomDice12.vue'

const SEP_SCALE = 10

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
})

const configStore = useConfigStore()
const pictosStore = usePictosStore()
const editorStore = useEditorStore()
pictosStore.load()

const katex = ref(null)
import('katex').then((m) => { katex.value = m.default }).catch(() => {})

const p = computed(() => props.params)
const fontSize_mm = computed(() => Number(p.value.fontSize || 4))
const diceScale = computed(() => p.value.diceScale || 1.4)
const dieSize = computed(() => fontSize_mm.value * diceScale.value)
const color = computed(() => p.value.color || '#1a1a2e')
const fontFamily = computed(() => p.value.fontFamily || 'Outfit, sans-serif')
const padding_mm = computed(() => p.value.padding || 0)
const defaultAlign = computed(() => p.value.align || 'left')
const tokens = computed(() => tokenize(p.value.content || ''))
const sepSvgW = computed(() => (props.width_mm || 50) * SEP_SCALE)

function resolveIconValue(val, fallbackChar) {
  if (!val || typeof val !== 'string') return { char: fallbackChar, src: null }
  if (!val.includes('/') && val.length <= 4) return { char: val, src: null }
  if (val.startsWith('/uploads/') || val.startsWith('http')) return { char: fallbackChar, src: val }
  if (/^[a-f0-9-]{8,}$/i.test(val) || (!val.includes(' ') && val.length > 4 && !['•', '●', '◆', '☐', '☑'].includes(val))) {
    return { char: fallbackChar, src: `/uploads/${val}` }
  }
  return { char: fallbackChar, src: null }
}

const bulletChar = computed(() => resolveIconValue(p.value.bulletIcon, '•').char)
const bulletMediaSrc = computed(() => resolveIconValue(p.value.bulletIcon, '•').src)

function checkboxChar(checked) {
  const key = checked ? 'checkboxIconChecked' : 'checkboxIcon'
  return resolveIconValue(p.value[key], checked ? '☑' : '☐').char
}
function checkboxMediaSrc(checked) {
  const key = checked ? 'checkboxIconChecked' : 'checkboxIcon'
  return resolveIconValue(p.value[key], checked ? '☑' : '☐').src
}

function blockAlign(token) {
  const a = token?.align || defaultAlign.value
  return { textAlign: a }
}

function separatorPaths(token) {
  const w = sepSvgW.value
  const h = (token.height_mm || 2) * SEP_SCALE
  return buildSeparatorPaths(w, h, token.tier || 'basic', 42)
}

function cadrePaths(token) {
  const w = sepSvgW.value
  const h = (token.height_mm || 12) * SEP_SCALE
  return buildFramePaths(w, h, token.tier || 'basic', 42)
}

function cadreCorners(token) {
  const w = sepSvgW.value
  const h = (token.height_mm || 12) * SEP_SCALE
  const pad = Math.max(2, Math.min(w, h) * 0.02)
  const sizeMm = Math.min(2, (token.height_mm || 12) * 0.2)
  return buildCornerOrnaments({
    svgW: w,
    svgH: h,
    pad,
    shape: token.cornerShape || 'star4',
    sizeSvg: sizeMm * SEP_SCALE,
    corners: { TL: true, TR: true, BL: true, BR: true },
  })
}

const containerStyle = computed(() => ({
  display: 'block',
  width: '100%',
  height: '100%',
  fontSize: mmCss(fontSize_mm.value),
  fontFamily: fontFamily.value,
  color: color.value,
  lineHeight: p.value.lineHeight || 1.5,
  textAlign: defaultAlign.value,
  padding: mmCss(padding_mm.value),
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  overflow: 'hidden',
  boxSizing: 'border-box',
}))

function headingSize(level) {
  const scale = [0, 1.6, 1.4, 1.25, 1.1, 1.0, 0.95][level] || 1
  return mmCss(fontSize_mm.value * scale)
}

function headingMargin(level) {
  const bottom = [0, 0.55, 0.45, 0.35, 0.28, 0.22, 0.18][level] || 0.18
  return { marginTop: '0.15em', marginBottom: `${bottom}em` }
}

function getFixedAtomParam(atomType, paramKey, fallback) {
  const allRules = configStore.config?.[ATOM_PARAM_RULES_KEY] || {}
  const rule = (allRules[atomType] || {})[paramKey]
  if (rule?.fixedEnabled && Object.prototype.hasOwnProperty.call(rule, 'fixedValue')) {
    return rule.fixedValue
  }
  return fallback
}

function diePenParams(value, sides) {
  const atomType = sides === 12 ? 'die12' : 'die8'
  return {
    value,
    fontSize: getFixedAtomParam(atomType, 'fontSize', fontSize_mm.value),
    fontFamily: getFixedAtomParam(atomType, 'fontFamily', p.value.fontFamily),
    textColor: getFixedAtomParam(atomType, 'textColor', color.value),
    penColor: getFixedAtomParam(atomType, 'penColor', color.value),
    penWidth: getFixedAtomParam(atomType, 'penWidth', undefined),
    penSeed: getFixedAtomParam(atomType, 'penSeed', undefined),
    penPoolSize: getFixedAtomParam(atomType, 'penPoolSize', undefined),
  }
}

function renderMath(expr, block) {
  const latex = parseFML(expr)
  if (katex.value) {
    try {
      return katex.value.renderToString(latex, { throwOnError: false, displayMode: block })
    } catch {
      return `<code class="rt-math-err">${expr}</code>`
    }
  }
  return `<code class="rt-math-raw">${expr}</code>`
}

function resolvePicto(ref) {
  return pictosStore.byRef(ref)
}

function resolvePictoByTag(tag, ref) {
  const list = pictosStore.pictosForTag(tag)
  const hit = list.find((x) => x.picto_ref === ref) || pictosStore.byRef(ref)
  if (hit && tag) {
    const ok = (hit.tags || []).some((t) => t.name === tag || t.id === tag)
    if (!ok && list.length) return list.find((x) => x.picto_ref === ref) || null
  }
  return hit
}

function dataValue(name) {
  const data = editorStore.previewData || {}
  return data[name] != null ? String(data[name]) : ''
}

function dieInlineStyle(size) {
  return {
    display: 'inline-block',
    width: mmCss(size),
    height: mmCss(size),
    verticalAlign: 'middle',
  }
}

const inlineBind = computed(() => ({
  dieSize: dieSize.value,
  dieInlineStyle,
  color: color.value,
  fontFamily: fontFamily.value,
  fontSize_mm: fontSize_mm.value,
  diePenParams,
  renderMath,
  resolvePicto,
  resolvePictoByTag,
  dataValue,
  getFixedAtomParam,
}))

const RtInline = defineComponent({
  name: 'RtInline',
  props: {
    nodes: { type: Array, default: () => [] },
    dieSize: Number,
    dieInlineStyle: Function,
    color: String,
    fontFamily: String,
    fontSize_mm: Number,
    diePenParams: Function,
    renderMath: Function,
    resolvePicto: Function,
    resolvePictoByTag: Function,
    dataValue: Function,
    getFixedAtomParam: Function,
  },
  setup(props) {
    return () => {
      const children = (props.nodes || []).map((token, i) => {
        if (token.type === 'html') {
          return h('span', { key: i, class: 'rt-text', innerHTML: token.html })
        }
        if (token.type === 'arrow') {
          return h('span', { key: i, class: 'rt-arrow' }, '→')
        }
        if (token.type === 'die' && token.sides === 8) {
          const size = props.dieSize * (token.scale || 1)
          return h('span', { key: i, class: 'rt-die', style: dieInlineStyle(size) }, [
            h(AtomDice8, { params: props.diePenParams(token.value, 8), width_mm: size, height_mm: size }),
          ])
        }
        if (token.type === 'die' && token.sides === 12) {
          const size = props.dieSize * (token.scale || 1)
          return h('span', { key: i, class: 'rt-die', style: dieInlineStyle(size) }, [
            h(AtomDice12, { params: props.diePenParams(token.value, 12), width_mm: size, height_mm: size }),
          ])
        }
        if (token.type === 'stat') {
          const statColor = STAT_TYPES[token.stat]?.color || '#6c7aff'
          const explicit = props.getFixedAtomParam('caracteristique', 'textColor', null)
          return h('span', {
            key: i,
            class: 'rt-stat',
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              color: explicit != null && explicit !== '' ? explicit : statColor,
              fontWeight: '700',
              fontSize: mmCss(props.getFixedAtomParam('caracteristique', 'fontSize', 3)),
              fontFamily: props.getFixedAtomParam('caracteristique', 'fontFamily', props.fontFamily),
            },
          }, [
            token.modifier ? h('span', { class: 'rt-stat-mod' }, token.modifier + '\u2009') : null,
            h('span', { class: 'rt-stat-name' }, token.stat),
          ])
        }
        if (token.type === 'svg') {
          const style = {
            ...props.dieSpanStyle,
            objectFit: 'contain',
            ...(token.color ? { color: token.color, filter: `drop-shadow(0 0 0 ${token.color})` } : {}),
          }
          if (token.color) {
            style.backgroundColor = token.color
            style.webkitMask = `url(/uploads/${token.name}) center / contain no-repeat`
            style.mask = `url(/uploads/${token.name}) center / contain no-repeat`
            return h('span', { key: i, class: 'rt-svg rt-svg-tint', style })
          }
          return h('img', { key: i, class: 'rt-svg', src: `/uploads/${token.name}`, style: props.dieSpanStyle })
        }
        if (token.type === 'data') {
          return h('span', { key: i, class: 'rt-data' }, props.dataValue(token.name) || `\u00a0`)
        }
        if (token.type === 'picto' || token.type === 'pictoByTag') {
          const row = token.type === 'pictoByTag'
            ? props.resolvePictoByTag(token.tag, token.ref)
            : props.resolvePicto(token.ref)
          const view = token.view || 'icon'
          const showIcon = view === 'icon' || view === 'both'
          const showLabel = view === 'label' || view === 'both'
          const label = row?.picto_label || token.ref
          if (token.invalid || (!row && token.type === 'pictoByTag')) {
            return h('span', { key: i, class: 'rt-picto-missing' }, `?${token.ref || 'picto'}`)
          }
          return h('span', { key: i, class: 'rt-picto', style: { display: 'inline-flex', alignItems: 'center', gap: '0.15em' } }, [
            showIcon && row?.id
              ? h('img', { class: 'rt-picto-img', src: `/uploads/${row.id}`, style: props.dieSpanStyle, alt: '' })
              : (showIcon ? h('span', { class: 'rt-picto-missing' }, `?${token.ref}`) : null),
            showLabel ? h('span', { class: 'rt-picto-label' }, label) : null,
          ])
        }
        if (token.type === 'math') {
          return h('span', {
            key: i,
            class: ['rt-math', { 'rt-math-block': token.block }],
            innerHTML: props.renderMath(token.expr, token.block),
          })
        }
        if (token.type === 'resource') {
          const c = RESOURCE_TYPES[token.resource]?.color || '#888'
          return h('span', { key: i, style: { color: c } }, [
            RESOURCE_TYPES[token.resource]?.icon || '●',
            token.amount || '',
          ])
        }
        return null
      })
      return children
    }
  },
})
</script>

<style>
.rt-math .katex { color: inherit; }
.rt-math-block { display: block; text-align: center; margin: 0.3em 0; }
</style>

<style scoped>
.rich-text-atom { display: block; width: 100%; height: 100%; }
.rt-heading { margin: 0; font-weight: 700; line-height: 1.2; }
.rt-separator {
  width: 100%;
  margin: 0.25em 0;
  display: block;
  overflow: visible;
}
.rt-separator svg { display: block; }
.rt-cadre {
  width: 100%;
  margin: 0.35em 0;
  display: block;
  overflow: visible;
}
.rt-cadre svg { display: block; }
.rt-blockquote {
  margin: 0.25em 0;
  padding-left: 0.6em;
  border-left: 2px solid currentColor;
  opacity: 0.9;
  font-style: italic;
}
.rt-checkbox-line { display: flex; align-items: flex-start; gap: 0.35em; margin: 0.1em 0; }
.rt-checkbox { flex-shrink: 0; line-height: 1; display: inline-flex; align-items: center; }
.rt-list { list-style: none; margin: 0.15em 0; padding: 0; }
.rt-list-ol { list-style: decimal; padding-left: 1.2em; }
.rt-li { display: flex; align-items: flex-start; gap: 0.35em; margin: 0.05em 0; }
.rt-bullet { flex-shrink: 0; line-height: 1.2; }
.rt-bullet-img { width: 0.9em; height: 0.9em; object-fit: contain; vertical-align: middle; }
.rt-li-body { flex: 1; min-width: 0; }
.rt-p { margin: 0; display: block; }
.rt-text { white-space: pre-wrap; }
.rt-text :deep(code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85em;
  background: rgba(0,0,0,0.08);
  border-radius: 3px;
  padding: 0.05em 0.3em;
}
.rt-arrow { font-weight: 600; margin: 0 0.1em; }
.rt-picto-missing { opacity: 0.5; font-weight: 700; }
.rt-picto-label { font-weight: 600; }
.rt-placeholder { color: rgba(0,0,0,0.25); font-style: italic; }
.rt-math-err, .rt-math-raw {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85em;
  color: #ef4444;
}
</style>
