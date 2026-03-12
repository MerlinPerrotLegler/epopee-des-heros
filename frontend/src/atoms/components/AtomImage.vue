<template>
  <div :style="containerStyle">
    <img v-if="params.mediaId" :src="`/uploads/${params.mediaId}`" :style="imgStyle" />
    <div v-else class="image-placeholder">
      <span v-if="params.ai_prompt_template" class="ai-hint">🤖 IA</span>
      <span v-else>🖼</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
  zoom: { type: Number, default: 1 }
})

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  borderRadius: props.params.borderRadius ? `${props.params.borderRadius}px` : '0',
  opacity: props.params.opacity ?? 1,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const imgStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: props.params.fit || 'cover',
  objectPosition: `${props.params.posX ?? 50}% ${props.params.posY ?? 50}%`,
}))
</script>

<style scoped>
.image-placeholder {
  width: 100%; height: 100%;
  background: repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 4px, #e0e0e0 4px, #e0e0e0 8px);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: #aaa;
}
.ai-hint { font-size: 10px; color: #888; }
</style>
