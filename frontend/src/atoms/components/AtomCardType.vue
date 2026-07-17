<template>
  <div :style="style">{{ params.type || 'Type' }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)

const style = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: props.params.bgColor || '#6c7aff',
  color: props.params.textColor || '#fff',
  fontSize: `${mmToPx(props.params.fontSize || 2.3)}px`,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderRadius: `${mmToPx(0.8)}px`,
  padding: `${mmToPx(0.5)}px ${mmToPx(1.5)}px`,
}))
</script>
