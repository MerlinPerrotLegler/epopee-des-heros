<template>
  <div style="display:flex;align-items:center;gap:2px;width:100%;height:100%;" :style="containerStyle">
    <span :style="{ color: RESOURCE_TYPES[params.resourceType]?.color, fontSize: '1.2em' }">
      {{ RESOURCE_TYPES[params.resourceType]?.icon || '●' }}
    </span>
    <span style="font-weight:600;">{{ params.value || '0' }}</span>
    <span v-if="params.showLabel" style="font-size:0.8em;opacity:0.7;">{{ RESOURCE_TYPES[params.resourceType]?.label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'
import { RESOURCE_TYPES, FONT_FAMILY } from '@/atoms/index.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
const containerStyle = computed(() => ({
  color: props.params.color,
  fontSize: `${mmToPx(props.params.fontSize || 2.5)}px`,
  fontFamily: FONT_FAMILY,
}))
</script>
