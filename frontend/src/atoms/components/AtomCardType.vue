<template>
  <div :style="{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background: params.bgColor || '#6c7aff', color: params.textColor || '#fff', fontSize: `${mmToPx(params.fontSize||2)}px`, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', borderRadius:'3px', padding:'2px 6px' }">
    {{ params.type || 'Type' }}
  </div>
</template>

<script setup>
import { useAtomScale } from './useAtomScale.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
</script>
