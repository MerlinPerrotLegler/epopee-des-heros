<template>
  <div class="bg-root" :style="{ opacity: params.opacity ?? 1 }">
    <img
      v-if="params.mediaId"
      class="bg-fill"
      :src="`/uploads/${params.mediaId}`"
      :style="{
        objectFit:       params.fit || 'cover',
        objectPosition:  `${params.posX ?? 50}% ${params.posY ?? 50}%`,
        mixBlendMode:    params.blendMode || 'normal',
      }"
    />
  </div>
</template>

<script setup>
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
</script>

<style scoped>
.bg-root { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.bg-fill  { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
