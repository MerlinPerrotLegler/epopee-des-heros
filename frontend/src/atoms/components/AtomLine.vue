<template>
  <div :style="{ width:'100%', height:`${Math.max(1, mmToPx(params.thickness || 0.3))}px`, background: params.color || '#363d5c', borderStyle: params.style || 'solid', marginTop: '50%', transform: 'translateY(-50%)' }"></div>
</template>

<script setup>
import { useAtomScale } from './useAtomScale.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
</script>
