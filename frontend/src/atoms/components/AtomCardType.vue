<template>
  <div :style="style">{{ params.type || 'Type' }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'
import { useLayoutRelativeFontMm } from './useLayoutRelativeFont.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
const fontSizeMm = useLayoutRelativeFontMm(computed(() => props.params.fontSize || 2.3))

const style = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: props.params.bgColor || '#6c7aff',
  color: props.params.textColor || '#fff',
  fontSize: `${mmToPx(fontSizeMm.value)}px`,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderRadius: '3px',
  padding: '2px 6px',
}))
</script>
