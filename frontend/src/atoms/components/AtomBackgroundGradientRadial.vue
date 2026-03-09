<template>
  <div class="bg-root" :style="rootStyle" />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})

const rootStyle = computed(() => {
  const stops  = (props.params.stops || [{ color: '#6c7aff', pos: 0 }, { color: '#2a3050', pos: 100 }])
  const stopsStr = stops.map(s => `${s.color} ${s.pos}%`).join(', ')
  const shape = props.params.shape || 'ellipse'
  const posX  = props.params.posX  ?? 50
  const posY  = props.params.posY  ?? 50
  return {
    background: `radial-gradient(${shape} at ${posX}% ${posY}%, ${stopsStr})`,
    opacity:    props.params.opacity ?? 1,
  }
})
</script>

<style scoped>
.bg-root { position: absolute; inset: 0; pointer-events: none; }
</style>
