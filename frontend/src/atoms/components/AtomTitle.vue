<template>
  <div :style="style">{{ params.text || 'Titre' }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { mmCss } from '@/utils/cssMm.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number })

const style = computed(() => ({
  width: '100%', height: '100%', overflow: 'hidden',
  fontFamily: props.params.fontFamily || 'Outfit',
  fontSize: mmCss(props.params.fontSize || 4.5),
  fontWeight: props.params.fontWeight || 700,
  color: props.params.color || '#000',
  textAlign: props.params.textAlign || 'center',
  letterSpacing: props.params.letterSpacing != null
    ? mmCss(props.params.letterSpacing)
    : undefined,
  textTransform: props.params.textTransform || 'none',
  display: 'flex', alignItems: 'center',
  justifyContent: props.params.textAlign === 'right' ? 'flex-end' : props.params.textAlign === 'center' ? 'center' : 'flex-start',
}))
</script>
