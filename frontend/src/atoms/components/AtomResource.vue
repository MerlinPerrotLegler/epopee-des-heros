<template>
  <div :style="containerStyle">
    <span :style="{ color: RESOURCE_TYPES[params.resourceType]?.color, fontSize: '1.2em' }">
      {{ RESOURCE_TYPES[params.resourceType]?.icon || '●' }}
    </span>
    <span style="font-weight:600;">{{ params.value || '0' }}</span>
    <span v-if="params.showLabel" style="font-size:0.8em;opacity:0.7;">{{ RESOURCE_TYPES[params.resourceType]?.label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { mmCss } from '@/utils/cssMm.js'
import { RESOURCE_TYPES, FONT_FAMILY } from '@/atoms/index.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number })
const containerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: mmCss(0.5),
  width: '100%',
  height: '100%',
  color: props.params.color,
  fontSize: mmCss(props.params.fontSize || 2.5),
  fontFamily: props.params.fontFamily || FONT_FAMILY,
}))
</script>
