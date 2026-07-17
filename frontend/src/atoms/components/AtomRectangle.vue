<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
  zoom: { type: Number, default: 1 },
})

const { mmToPx } = useAtomScale(props)

const style = computed(() => {
  const p = props.params
  const border = p.borderWidth
    ? `${mmToPx(p.borderWidth)}px solid ${p.borderColor || '#000'}`
    : 'none'
  return {
    width: '100%',
    height: '100%',
    background: p.bgColor || '#2a3050',
    border,
    borderRadius: p.borderRadius ? `${mmToPx(p.borderRadius)}px` : '0',
    opacity: p.opacity ?? 1,
  }
})
</script>

<template>
  <div :style="style"></div>
</template>
