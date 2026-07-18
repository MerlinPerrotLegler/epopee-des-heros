<template>
  <div :style="style">{{ params.text }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { mmCss } from '@/utils/cssMm.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number })

const style = computed(() => ({
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: props.params.bgColor || '#6c7aff',
  color: props.params.textColor || '#fff',
  fontSize: mmCss(props.params.fontSize || 2.8),
  fontWeight: 600,
  borderRadius: `${props.params.borderRadius ?? 50}%`,
  border: props.params.borderWidth ? `${mmCss(props.params.borderWidth)} solid ${props.params.borderColor}` : 'none',
}))
</script>
