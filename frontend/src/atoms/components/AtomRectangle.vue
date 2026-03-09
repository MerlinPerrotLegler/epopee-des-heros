<template>
  <div :style="{ width:'100%', height:'100%', background: params.bgColor || '#2a3050', border: params.borderWidth ? `${params.borderWidth}px solid ${params.borderColor}` : 'none', borderRadius: params.borderRadius ? `${params.borderRadius}px` : '0', opacity: params.opacity ?? 1 }"></div>
</template>

<script setup>
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
</script>
