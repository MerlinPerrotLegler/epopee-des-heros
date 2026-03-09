<template>
  <div :style="containerStyle">
    <span ref="textEl" :style="textStyle">{{ params.text || 'Texte…' }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})
const { mmToPx } = useAtomScale(props)

const textEl     = ref(null)
const autoFontPx = ref(null)

// ── Auto-size : binary search via a hidden probe element ──────────────────
function fitTextSize() {
  if (!props.params.autoSize) { autoFontPx.value = null; return }

  const text        = props.params.text || 'Texte…'
  const maxFontMm   = props.params.maxFontSize ?? 10
  const maxFontPx_  = mmToPx(maxFontMm)
  const minFontPx   = 4
  const containerW  = mmToPx(props.width_mm)
  const containerH  = mmToPx(props.height_mm)
  if (!containerW || !containerH) return

  // Create an off-screen probe with identical styles
  const probe = document.createElement('span')
  probe.style.cssText = [
    'position:fixed', 'visibility:hidden', 'pointer-events:none',
    `max-width:${containerW}px`,
    `font-family:${props.params.fontFamily || 'Outfit'}`,
    `font-weight:${props.params.fontWeight || 400}`,
    `line-height:${props.params.lineHeight || 1.3}`,
    'white-space:pre-wrap', 'word-break:break-word',
    'display:inline-block',
  ].join(';')
  probe.textContent = text
  document.body.appendChild(probe)

  let lo = minFontPx, hi = maxFontPx_, best = minFontPx
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    probe.style.fontSize = `${mid}px`
    if (probe.scrollWidth <= containerW && probe.scrollHeight <= containerH) {
      best = mid
      lo   = mid
    } else {
      hi = mid
    }
  }
  document.body.removeChild(probe)
  autoFontPx.value = best
}

onMounted(fitTextSize)
watch(
  () => [props.params.text, props.params.autoSize, props.params.maxFontSize,
         props.params.fontFamily, props.params.fontWeight, props.params.lineHeight,
         props.width_mm, props.height_mm, props.zoom],
  () => nextTick(fitTextSize),
)

// ── Styles ────────────────────────────────────────────────────────────────
const containerStyle = computed(() => ({
  width:      '100%',
  height:     '100%',
  display:    'flex',
  alignItems: 'center',
  justifyContent: alignToJustify(props.params.textAlign || 'center'),
}))

const textStyle = computed(() => {
  const fontSizePx = props.params.autoSize && autoFontPx.value
    ? autoFontPx.value
    : mmToPx(props.params.fontSize || 2.5)
  return {
    fontFamily:   props.params.fontFamily || 'Outfit',
    fontSize:     `${fontSizePx}px`,
    fontWeight:   props.params.fontWeight || 400,
    color:        props.params.color || '#333',
    textAlign:    props.params.textAlign || 'center',
    lineHeight:   props.params.lineHeight || 1.3,
    overflow:     props.params.overflow === 'ellipsis' ? 'hidden' : (props.params.overflow || 'hidden'),
    textOverflow: props.params.overflow === 'ellipsis' ? 'ellipsis' : undefined,
    whiteSpace:   props.params.overflow === 'ellipsis' ? 'nowrap' : 'pre-wrap',
    wordBreak:    'break-word',
    maxWidth:     '100%',
  }
})

function alignToJustify(align) {
  return { left: 'flex-start', right: 'flex-end', center: 'center', justify: 'center' }[align] ?? 'center'
}
</script>
