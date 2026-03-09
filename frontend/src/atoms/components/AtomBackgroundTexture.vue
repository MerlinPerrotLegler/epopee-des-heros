<template>
  <div class="bg-root" :style="rootStyle" />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})

const rootStyle = computed(() => {
  const p = props.params
  const mediaId = p.mediaId

  // CSS background-repeat
  const rx = p.repeatX ?? true
  const ry = p.repeatY ?? true
  let repeat = 'no-repeat'
  if (rx && ry)       repeat = 'repeat'
  else if (rx)        repeat = 'repeat-x'
  else if (ry)        repeat = 'repeat-y'

  // CSS background-size: scale * 100% width, auto height (preserves aspect ratio)
  const scale = p.scale ?? 1
  const bgSize = (rx || ry) ? `${scale * 100}% auto` : 'cover'

  return {
    position:        'absolute',
    inset:           0,
    overflow:        'hidden',
    pointerEvents:   'none',
    opacity:         p.opacity ?? 1,
    mixBlendMode:    p.blendMode || 'normal',
    backgroundImage:  mediaId ? `url(/uploads/${mediaId})` : 'none',
    backgroundRepeat: repeat,
    backgroundSize:   bgSize,
    backgroundPosition: 'top left',
  }
})
</script>
