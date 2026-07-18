<template>
  <div :style="style">{{ params.type || 'Type' }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { mmCss } from '@/utils/cssMm.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number })

const style = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: props.params.bgColor || '#6c7aff',
  color: props.params.textColor || '#fff',
  fontSize: mmCss(props.params.fontSize || 2.3),
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderRadius: mmCss(0.8),
  padding: `${mmCss(0.5)} ${mmCss(1.5)}`,
}))
</script>
