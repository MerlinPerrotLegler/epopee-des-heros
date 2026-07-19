<template>
  <div class="comp-renderer" :style="outerStyle">
    <div v-if="!comp" class="comp-loading">
      <span>◧ {{ componentId }}</span>
    </div>
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
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { mmCss } from '@/utils/cssMm.js'
import { flattenComponentElements } from '@/utils/componentDefinition.js'
import AtomRenderer from './AtomRenderer.vue'

const props = defineProps({
  componentId: { type: String, required: true },
  width_mm:    { type: Number, required: true },
  height_mm:   { type: Number, required: true },
})

const store = useEditorStore()

const comp = computed(() => store.componentsCache[props.componentId] ?? null)

const compW = computed(() => comp.value?.width_mm || 60)
const compH = computed(() => comp.value?.height_mm || 40)

const elements = computed(() => flattenComponentElements(comp.value?.definition))

const scaleX = computed(() => props.width_mm / compW.value)
const scaleY = computed(() => props.height_mm / compH.value)

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
  width:  mmCss(compW.value),
  height: mmCss(compH.value),
  transformOrigin: 'top left',
  transform: `scale(${scaleX.value}, ${scaleY.value})`,
  pointerEvents: 'none',
  userSelect: 'none',
}))

function elStyle(el) {
  return {
    position: 'absolute',
    left:   mmCss(el.x_mm),
    top:    mmCss(el.y_mm),
    width:  mmCss(el.width_mm),
    height: mmCss(el.height_mm),
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
