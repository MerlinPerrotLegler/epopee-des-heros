<template>
  <div :style="style">{{ params.text || 'Titre' }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)

const style = computed(() => ({
  width: '100%', height: '100%', overflow: 'hidden',
  fontFamily: props.params.fontFamily || 'Outfit',
  fontSize: `${mmToPx(props.params.fontSize || 4)}px`,
  fontWeight: props.params.fontWeight || 700,
  color: props.params.color || '#000',
  textAlign: props.params.textAlign || 'center',
  letterSpacing: props.params.letterSpacing ? `${props.params.letterSpacing}px` : undefined,
  textTransform: props.params.textTransform || 'none',
  display: 'flex', alignItems: 'center',
  justifyContent: props.params.textAlign === 'right' ? 'flex-end' : props.params.textAlign === 'center' ? 'center' : 'flex-start',
}))
</script>
