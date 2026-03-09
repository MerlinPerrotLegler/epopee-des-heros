<template>
  <div :style="{ width:'100%', height:'100%', background: params.bgColor, border: `1px ${params.borderStyle || 'dashed'} ${params.borderColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${mmToPx(2)}px`, color: params.borderColor }">
    {{ params.label || '?' }}
  </div>
</template>

<script setup>
import { useAtomScale } from './useAtomScale.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
</script>
