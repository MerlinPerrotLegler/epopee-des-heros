<template>
  <div class="picto-wrap" :style="wrapStyle">
    <img
      v-if="showIcon && resolvedMediaId"
      class="picto-icon"
      :src="`/uploads/${resolvedMediaId}`"
      :style="iconStyle"
      alt=""
    />
    <div
      v-else-if="showIcon"
      class="picto-icon picto-icon--empty"
      :style="emptyIconStyle"
    >?</div>
    <span
      v-if="showLabel"
      class="picto-label"
      :style="labelStyle"
    >{{ resolvedLabel }}</span>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { usePictosStore } from '@/stores/pictos.js'
import { useAtomScale } from './useAtomScale.js'
import { useLayoutRelativeFontMm } from './useLayoutRelativeFont.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
  zoom: { type: Number, default: 1 },
})

const pictosStore = usePictosStore()
const { mmToPx } = useAtomScale(props)

function ensureLoaded() {
  pictosStore.load()
}

onMounted(ensureLoaded)
watch(() => props.params.ref, ensureLoaded)

const resolvedRef = computed(() => String(props.params.ref ?? '').trim())

const matchedPicto = computed(() => {
  if (!resolvedRef.value) return null
  return pictosStore.byRef(resolvedRef.value)
})

const resolvedMediaId = computed(() => matchedPicto.value?.id ?? null)

const resolvedLabel = computed(() => {
  const lab = matchedPicto.value?.picto_label
  if (lab != null && String(lab).trim() !== '') return String(lab)
  return resolvedRef.value || ''
})

const view = computed(() => props.params.view || 'horizontal')

const showIcon = computed(() => view.value !== 'text')
const showLabel = computed(() => view.value !== 'icon')

const isVertical = computed(() =>
  view.value === 'vertical' || view.value === 'vertical-inverse'
)

const isInverse = computed(() =>
  view.value === 'horizontal-inverse' || view.value === 'vertical-inverse'
)

const wrapStyle = computed(() => ({
  flexDirection: isVertical.value ? 'column' : 'row',
  gap: `${mmToPx(props.params.gap ?? 1)}px`,
  opacity: props.params.opacity ?? 1,
  justifyContent: 'center',
  alignItems: 'center',
}))

const iconMm = computed(() => {
  const s = props.params.iconSize
  if (s != null && s > 0) return s
  return Math.min(props.height_mm || 8, props.width_mm || 8)
})

const iconOrder = computed(() => (isInverse.value ? 2 : 1))
const labelOrder = computed(() => (isInverse.value ? 1 : 2))

const imgBaseStyle = computed(() => ({
  width: `${mmToPx(iconMm.value)}px`,
  height: `${mmToPx(iconMm.value)}px`,
  objectFit: props.params.fit || 'contain',
  flexShrink: 0,
  order: iconOrder.value,
}))

const iconStyle = imgBaseStyle
const emptyIconStyle = imgBaseStyle

const resolvedFontSizeMm = useLayoutRelativeFontMm(computed(() => props.params.fontSize ?? 2.8))

const labelStyle = computed(() => ({
  fontSize: `${mmToPx(resolvedFontSizeMm.value)}px`,
  fontFamily: props.params.fontFamily || 'inherit',
  fontWeight: props.params.fontWeight ?? 400,
  color: props.params.color || 'inherit',
  textAlign: props.params.textAlign || 'left',
  lineHeight: 1.2,
  minWidth: 0,
  order: labelOrder.value,
}))
</script>

<style scoped>
.picto-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
}

.picto-label {
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
  min-width: 0;
  flex: 1;
}

.picto-icon--empty {
  border: 1px dashed var(--border-default);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-family: var(--font-mono);
  box-sizing: border-box;
}
</style>
