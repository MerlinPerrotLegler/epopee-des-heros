<template>
  <div :style="{ width:'100%', height:'100%', background: params.bgColor, border: `${mmCss(params.borderWidth ?? 0.4)} ${params.borderStyle || 'dashed'} ${params.borderColor}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: mmCss(2), color: params.borderColor }">
    {{ params.label || '?' }}
  </div>
</template>

<script setup>
import { mmCss } from '@/utils/cssMm.js'
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number })
</script>
