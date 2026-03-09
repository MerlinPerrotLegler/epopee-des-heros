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
  const stops = (props.params.stops || [{ color: '#2a3050', pos: 0 }, { color: '#6c7aff', pos: 100 }])
  const stopsStr = stops.map(s => `${s.color} ${s.pos}%`).join(', ')
  const angle = props.params.angle ?? 135
  return {
    background:    `linear-gradient(${angle}deg, ${stopsStr})`,
    opacity:       props.params.opacity ?? 1,
  }
})
</script>

<style scoped>
.bg-root { position: absolute; inset: 0; pointer-events: none; }
</style>
