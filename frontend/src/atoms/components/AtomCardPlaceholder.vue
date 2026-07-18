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
import { mmCss } from '@/utils/cssMm.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
})

const containerStyle = computed(() => {
  const bw = mmCss(props.params.borderWidth ?? 0.4)
  return {
    width:          '100%',
    height:         '100%',
    background:     props.params.bgColor || 'rgba(108,122,255,0.1)',
    border:         `${bw} ${props.params.borderStyle || 'dashed'} ${props.params.borderColor || '#6c7aff'}`,
    borderRadius:   mmCss(props.params.borderRadius ?? 1),
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            mmCss(1),
    boxSizing:      'border-box',
  }
})

const iconStyle = computed(() => ({
  width:      mmCss(props.params.iconSize || 6),
  height:     mmCss(props.params.iconSize || 6),
  objectFit:  'contain',
  opacity:    0.7,
}))

const labelStyle = computed(() => ({
  fontSize:   mmCss(props.params.fontSize || 2.5),
  color:      props.params.textColor || props.params.borderColor || '#6c7aff',
  fontFamily: 'Outfit, sans-serif',
  fontWeight: 500,
  textAlign:  'center',
  lineHeight:  1.2,
  padding:    `0 ${mmCss(1)}`,
  wordBreak:  'break-word',
}))
</script>
