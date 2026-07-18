<script setup>
import { computed } from 'vue'
import { mmCss } from '@/utils/cssMm.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
})

const style = computed(() => {
  const p = props.params
  const border = p.borderWidth
    ? `${mmCss(p.borderWidth)} solid ${p.borderColor || '#000'}`
    : 'none'
  return {
    width: '100%',
    height: '100%',
    background: p.bgColor || '#2a3050',
    border,
    borderRadius: p.borderRadius ? mmCss(p.borderRadius) : '0',
    opacity: p.opacity ?? 1,
  }
})
</script>

<template>
  <div :style="style"></div>
</template>
