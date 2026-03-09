<template>
  <div :style="{ width:'100%', height:'100%', display:'flex', alignItems:'center', fontFamily: params.fontFamily || 'JetBrains Mono', fontSize: `${mmToPx(params.fontSize||2)}px`, color: params.color || '#666' }">
    {{ params.prefix }}{{ params.value || '000' }}
  </div>
</template>

<script setup>
import { useAtomScale } from './useAtomScale.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
</script>
