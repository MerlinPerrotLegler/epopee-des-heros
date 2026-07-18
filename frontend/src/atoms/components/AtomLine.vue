<template>
  <div :style="{ width:'100%', height: mmCss(Math.max(0.1, params.thickness || 0.3)), background: params.color || '#363d5c', borderStyle: params.style || 'solid', marginTop: '50%', transform: 'translateY(-50%)' }"></div>
</template>

<script setup>
import { mmCss } from '@/utils/cssMm.js'
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number })
</script>
