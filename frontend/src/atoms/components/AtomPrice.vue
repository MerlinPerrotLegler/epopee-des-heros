<template>
  <div :style="{ display:'flex', alignItems:'center', gap:`${mmToPx(params.gap||1)}px`, flexWrap:'wrap', width:'100%', height:'100%', flexDirection: params.layout === 'vertical' ? 'column' : 'row', fontSize: `${mmToPx(params.fontSize||2.5)}px` }">
    <template v-if="typeof params.resources === 'object' && params.resources">
      <span v-for="(val, key) in params.resources" :key="key" style="display:flex;align-items:center;gap:2px;">
        <span :style="{ color: RESOURCE_TYPES[key]?.color }">{{ RESOURCE_TYPES[key]?.icon || '●' }}</span>
        <span>{{ val }}</span>
      </span>
    </template>
    <span v-else style="color:#999;font-style:italic;">Prix…</span>
  </div>
</template>

<script setup>
import { useAtomScale } from './useAtomScale.js'
import { RESOURCE_TYPES } from '@/atoms/index.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
</script>
