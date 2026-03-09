<template>
  <div :style="containerStyle">
    <!-- Icône optionnelle -->
    <img
      v-if="params.iconMediaId"
      :src="`/uploads/${params.iconMediaId}`"
      :style="iconStyle"
    />
    <!-- Label -->
    <span :style="labelStyle">{{ params.label || params.cardType }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})
const { mmToPx } = useAtomScale(props)

const containerStyle = computed(() => {
  const bw = mmToPx(props.params.borderWidth ?? 0.4)
  return {
    width:          '100%',
    height:         '100%',
    background:     props.params.bgColor || 'rgba(108,122,255,0.1)',
    border:         `${bw}px ${props.params.borderStyle || 'dashed'} ${props.params.borderColor || '#6c7aff'}`,
    borderRadius:   `${props.params.borderRadius ?? 4}px`,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            `${mmToPx(1)}px`,
    boxSizing:      'border-box',
  }
})

const iconStyle = computed(() => ({
  width:      `${mmToPx(props.params.iconSize || 6)}px`,
  height:     `${mmToPx(props.params.iconSize || 6)}px`,
  objectFit:  'contain',
  opacity:    0.7,
}))

const labelStyle = computed(() => ({
  fontSize:   `${mmToPx(props.params.fontSize || 2.5)}px`,
  color:      props.params.textColor || props.params.borderColor || '#6c7aff',
  fontFamily: 'Outfit, sans-serif',
  fontWeight: 500,
  textAlign:  'center',
  lineHeight:  1.2,
  padding:    '0 4px',
  wordBreak:  'break-word',
}))
</script>
