<template>
  <div class="comp-renderer" :style="outerStyle">
    <!-- Loading -->
    <div v-if="!comp" class="comp-loading">
      <span>◧ {{ componentId }}</span>
    </div>
    <!-- Rendered component elements -->
    <div v-else class="comp-inner" :style="innerStyle">
      <div
        v-for="el in elements" :key="el.id"
        class="comp-el"
        :style="elStyle(el)"
      >
        <AtomRenderer
          :atomType="el.atomType"
          :params="el.params || {}"
          :width_mm="el.width_mm"
          :height_mm="el.height_mm"
          :zoom="effectiveZoom"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { useMmScale } from '@/composables/useMmScale.js'
import AtomRenderer from './AtomRenderer.vue'

const props = defineProps({
  componentId: { type: String, required: true },
  width_mm:    { type: Number, required: true },
  height_mm:   { type: Number, required: true },
  zoom:        { type: Number, default: 1 },
})

const store = useEditorStore()

const comp = computed(() => store.componentsCache[props.componentId] ?? null)

// Natural dimensions of the component
const compW = computed(() => comp.value?.width_mm || 60)
const compH = computed(() => comp.value?.height_mm || 40)

// Elements come from the single-layer structure or from definition.layers[0].elements
const elements = computed(() => {
  if (!comp.value) return []
  // Components have definition.elements (flat) or definition.layers[0].elements
  return comp.value.definition?.elements || comp.value.definition?.layers?.[0]?.elements || []
})

// Scale factor to fit component into the allocated space
const scaleX = computed(() => props.width_mm / compW.value)
const scaleY = computed(() => props.height_mm / compH.value)

// Use the zoom ref for useMmScale — pass effective zoom = store.zoom
const zoomRef = computed(() => props.zoom)
const { mmToPx } = useMmScale(zoomRef)

// The zoom used for rendering atoms inside the component
// = layout zoom * component scale
const effectiveZoom = computed(() => props.zoom * Math.min(scaleX.value, scaleY.value))

const outerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
}))

const innerStyle = computed(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width:  `${mmToPx(compW.value)}px`,
  height: `${mmToPx(compH.value)}px`,
  transformOrigin: 'top left',
  transform: `scale(${scaleX.value}, ${scaleY.value})`,
  pointerEvents: 'none',
  userSelect: 'none',
}))

function elStyle(el) {
  return {
    position: 'absolute',
    left:   `${mmToPx(el.x_mm)}px`,
    top:    `${mmToPx(el.y_mm)}px`,
    width:  `${mmToPx(el.width_mm)}px`,
    height: `${mmToPx(el.height_mm)}px`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  }
}
</script>

<style scoped>
.comp-renderer {
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.comp-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-muted);
  background: rgba(108, 122, 255, 0.05);
  border: 1px dashed rgba(108, 122, 255, 0.3);
  border-radius: 2px;
}

.comp-inner {
  overflow: visible;
}

.comp-el {
  position: absolute;
}
</style>
