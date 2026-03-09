<template>
  <div :style="style">{{ params.text || 'Texte…' }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)

const style = computed(() => ({
  width: '100%', height: '100%',
  fontFamily: props.params.fontFamily || 'Outfit',
  fontSize: `${mmToPx(props.params.fontSize || 2.5)}px`,
  fontWeight: props.params.fontWeight || 400,
  color: props.params.color || '#333',
  textAlign: props.params.textAlign || 'left',
  lineHeight: props.params.lineHeight || 1.3,
  overflow: props.params.overflow === 'ellipsis' ? 'hidden' : (props.params.overflow || 'hidden'),
  textOverflow: props.params.overflow === 'ellipsis' ? 'ellipsis' : undefined,
  whiteSpace: props.params.overflow === 'ellipsis' ? 'nowrap' : undefined,
}))
</script>
