<template>
  <div :style="style">
    {{ params.prefix }}{{ params.value || '000' }}
  </div>
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
  fontFamily: props.params.fontFamily || 'JetBrains Mono',
  fontSize: mmCss(props.params.fontSize || 2.3),
  color: props.params.color || '#666',
}))
</script>
