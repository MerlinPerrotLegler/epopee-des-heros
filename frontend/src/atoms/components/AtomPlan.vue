<template>
  <div v-if="showGuide" class="plan-guide" :style="guideStyle" />
</template>

<script setup>
import { computed } from 'vue'
import { mmCss } from '@/utils/cssMm.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  printMode: { type: Boolean, default: false },
})

const showGuide = computed(() => !props.printMode && props.params.guideVisible !== false)

const guideStyle = computed(() => ({
  width:        '100%',
  height:       '100%',
  boxSizing:    'border-box',
  border:       `${mmCss(0.4)} dashed #6c7aff`,
  borderRadius: mmCss(0.5),
  background:   'rgba(108, 122, 255, 0.06)',
}))
</script>
