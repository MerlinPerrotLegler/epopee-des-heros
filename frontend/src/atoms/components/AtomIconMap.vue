<template>
  <div class="icon-map-wrap">
    <img
      v-if="resolvedMediaId"
      :src="`/uploads/${resolvedMediaId}`"
      :style="imgStyle"
      alt=""
    />
    <div v-else class="icon-map-empty">?</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
  zoom: { type: Number, default: 1 },
})

const rows = computed(() => Array.isArray(props.params.rows) ? props.params.rows : [])
const normalizedValue = computed(() => String(props.params.value ?? '').trim())

const resolvedMediaId = computed(() => {
  const hit = rows.value.find((r) => String(r?.value ?? '').trim() === normalizedValue.value)
  return hit?.mediaId || props.params.fallbackMediaId || null
})

const imgStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: props.params.fit || 'contain',
  opacity: props.params.opacity ?? 1,
}))
</script>

<style scoped>
.icon-map-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.icon-map-empty {
  width: 100%;
  height: 100%;
  border: 1px dashed var(--border-default);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-family: var(--font-mono);
}
</style>
