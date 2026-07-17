<template>
  <div :style="style">
    {{ params.prefix }}{{ params.value || '000' }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'
import { useLayoutRelativeFontMm } from './useLayoutRelativeFont.js'

const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
const fontSizeMm = useLayoutRelativeFontMm(computed(() => props.params.fontSize || 2.3))

const style = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  fontFamily: props.params.fontFamily || 'JetBrains Mono',
  fontSize: `${mmToPx(fontSizeMm.value)}px`,
  color: props.params.color || '#666',
}))
</script>
