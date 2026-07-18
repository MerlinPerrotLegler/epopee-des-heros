<template>
  <div :style="{ display:'flex', alignItems:'center', gap: mmCss(params.gap||1), flexWrap:'wrap', width:'100%', height:'100%', flexDirection: params.layout === 'vertical' ? 'column' : 'row', fontSize: mmCss(params.fontSize||2.5) }">
    <template v-if="typeof params.resources === 'object' && params.resources">
      <span v-for="(val, key) in params.resources" :key="key" :style="itemStyle">
        <span :style="{ color: RESOURCE_TYPES[key]?.color }">{{ RESOURCE_TYPES[key]?.icon || '●' }}</span>
        <span>{{ val }}</span>
      </span>
    </template>
    <span v-else style="color:#999;font-style:italic;">Prix…</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { mmCss } from '@/utils/cssMm.js'
import { RESOURCE_TYPES } from '@/atoms/index.js'

defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
})

const itemStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: mmCss(0.5),
}))
</script>
