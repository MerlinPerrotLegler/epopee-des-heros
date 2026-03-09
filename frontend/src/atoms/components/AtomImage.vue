<template>
  <div :style="{ width:'100%', height:'100%', borderRadius: params.borderRadius ? `${params.borderRadius}px` : '0', opacity: params.opacity ?? 1, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }">
    <img v-if="params.mediaId" :src="`/uploads/${params.mediaId}`" :style="{ width:'100%', height:'100%', objectFit: params.fit || 'cover' }" />
    <div v-else style="width:100%;height:100%;background:repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0 4px,#e0e0e0 4px,#e0e0e0 8px);display:flex;align-items:center;justify-content:center;font-size:10px;color:#888;">
      <span v-if="params.aiPrompt">🤖 {{ params.aiPrompt.slice(0, 30) }}…</span>
      <span v-else>Image</span>
    </div>
  </div>
</template>

<script setup>
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
</script>
