<template>
  <div class="badge-wrap" :style="wrapStyle">
    <img
      v-if="showIcon && resolvedMediaId"
      class="badge-icon"
      :src="`/uploads/${resolvedMediaId}`"
      :style="imgStyle"
      alt=""
    />
    <div
      v-else-if="showIcon"
      class="badge-icon badge-icon--empty"
      :style="emptyIconStyle"
    >?</div>
    <span
      v-if="showLabel"
      class="badge-label"
      :style="labelStyle"
    >{{ resolvedLabel }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
  zoom: { type: Number, default: 1 },
})

const { mmToPx } = useAtomScale(props)

const rows = computed(() => Array.isArray(props.params.rows) ? props.params.rows : [])
const normalizedValue = computed(() => String(props.params.value ?? '').trim())

const matchedRow = computed(() =>
  rows.value.find((r) => String(r?.value ?? '').trim() === normalizedValue.value) || null
)

const resolvedMediaId = computed(() =>
  matchedRow.value?.mediaId || props.params.fallbackMediaId || null
)

const resolvedLabel = computed(() => {
  if (matchedRow.value) {
    const lab = matchedRow.value.label
    if (lab != null && String(lab).trim() !== '') return String(lab)
    // fallback: show the checklist key if no label set
    return matchedRow.value.value || ''
  }
  return props.params.fallbackLabel || normalizedValue.value || ''
})

const showIcon = computed(() => props.params.showIcon !== false)
const showLabel = computed(() => props.params.showLabel !== false)

const isVertical = computed(() => props.params.layout === 'vertical')

const wrapStyle = computed(() => ({
  flexDirection: isVertical.value ? 'column' : 'row',
  gap: `${mmToPx(props.params.gap ?? 1)}px`,
  opacity: props.params.opacity ?? 1,
  justifyContent: isVertical.value
    ? 'center'
    : (props.params.textAlign === 'center' ? 'center'
      : props.params.textAlign === 'right' ? 'flex-end'
      : 'flex-start'),
  alignItems: 'center',
}))

const iconMm = computed(() => {
  const s = props.params.iconSize
  if (s != null && s > 0) return s
  return Math.min(props.height_mm || 8, props.width_mm || 8)
})

const imgStyle = computed(() => ({
  width: `${mmToPx(iconMm.value)}px`,
  height: `${mmToPx(iconMm.value)}px`,
  objectFit: props.params.fit || 'contain',
  flexShrink: 0,
}))

const emptyIconStyle = computed(() => ({
  width: `${mmToPx(iconMm.value)}px`,
  height: `${mmToPx(iconMm.value)}px`,
  flexShrink: 0,
}))

const labelStyle = computed(() => ({
  fontSize: `${mmToPx(props.params.fontSize ?? 2.5)}px`,
  fontFamily: props.params.fontFamily || 'inherit',
  fontWeight: props.params.fontWeight ?? 400,
  color: props.params.color || 'inherit',
  textAlign: props.params.textAlign || 'left',
  lineHeight: 1.2,
  minWidth: 0,
}))
</script>

<style scoped>
.badge-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
}

.badge-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-icon--empty {
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
