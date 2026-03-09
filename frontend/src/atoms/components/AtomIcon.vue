<template>
  <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;" :style="{ color: params.color, opacity: params.opacity }">
    <div v-if="params.svgContent" v-html="params.svgContent" style="width:100%;height:100%;"></div>
    <img v-else-if="params.mediaId" :src="`/uploads/${params.mediaId}`" style="width:100%;height:100%;object-fit:contain;" />
    <span v-else style="font-size:1.4em;opacity:0.4;">◆</span>
  </div>
</template>

<script setup>
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
</script>
