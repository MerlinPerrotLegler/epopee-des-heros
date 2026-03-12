<template>
  <div class="card-preview" :style="outerStyle">
    <div class="card-boundary" :style="cardStyle">
      <div
        v-for="el in elements" :key="el.id"
        class="preview-element"
        :style="elementStyle(el)"
      >
        <AtomRenderer
          v-if="el.type === 'atom'"
          :atomType="el.atomType"
          :params="resolvedParams(el)"
          :width_mm="el.width_mm"
          :height_mm="el.height_mm"
          :zoom="zoom"
        />
        <InlineComponentRenderer
          v-else-if="el.type === 'component'"
          :element="el"
          :cache="componentsCache"
          :zoom="zoom"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineComponent, h } from 'vue'
import { useMmScale } from '@/composables/useMmScale.js'
import { resolveElementParams } from '@/utils/binding.js'
import { api } from '@/utils/api.js'
import AtomRenderer from '@/components/editor/AtomRenderer.vue'

const props = defineProps({
  layout: { type: Object, required: true },
  data:   { type: Object, default: () => ({}) },
  zoom:   { type: Number, default: 1 },
})

const zoomRef = computed(() => props.zoom)
const { mmToPx } = useMmScale(zoomRef)

// ── Flatten layout definition into renderable elements ──────────────────────
const BACKGROUND_ATOM_TYPES = new Set(['rectangle', 'cardType', 'hexTile'])

const elements = computed(() => {
  const def = props.layout.definition
  if (!def) return []
  const bg = [], rest = []
  function collect(items, parentOpacity = 1) {
    for (const item of items) {
      if (item.visible === false) continue
      const opacity = parentOpacity * (item.opacity ?? 1)
      if (item.kind === 'group') {
        collect(item.children || [], opacity)
      } else {
        const el = { ...item, _layerOpacity: opacity }
        if (el.type === 'atom' && BACKGROUND_ATOM_TYPES.has(el.atomType)) bg.push(el)
        else rest.push(el)
      }
    }
  }
  collect(def.layers || [])
  return [...bg, ...rest]
})

// ── Load components used in this layout ────────────────────────────────────
const componentsCache = ref({})

watch(elements, async (els) => {
  const ids = [...new Set(
    els.filter(el => el.type === 'component' && el.componentId).map(el => el.componentId)
  )]
  for (const id of ids) {
    if (!componentsCache.value[id]) {
      try {
        const comp = await api.getComponent(id)
        componentsCache.value[id] = comp
      } catch {}
    }
  }
}, { immediate: true })

// ── Param resolution with data binding ─────────────────────────────────────
function resolvedParams(el) {
  return resolveElementParams(el, props.data)
}

// ── Styles ──────────────────────────────────────────────────────────────────
const cardW = computed(() => props.layout.width_mm || 63)
const cardH = computed(() => props.layout.height_mm || 88)

const outerStyle = computed(() => ({
  width:    `${mmToPx(cardW.value)}px`,
  height:   `${mmToPx(cardH.value)}px`,
  flexShrink: 0,
}))

const cardStyle = computed(() => ({
  position: 'relative',
  width:    `${mmToPx(cardW.value)}px`,
  height:   `${mmToPx(cardH.value)}px`,
  overflow: 'hidden',
}))

function elementStyle(el) {
  return {
    position: 'absolute',
    left:    `${mmToPx(el.x_mm)}px`,
    top:     `${mmToPx(el.y_mm)}px`,
    width:   `${mmToPx(el.width_mm)}px`,
    height:  `${mmToPx(el.height_mm)}px`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el._layerOpacity != null ? el._layerOpacity : undefined,
  }
}

// ── Inline component renderer (avoids dependency on editor store) ───────────
const InlineComponentRenderer = defineComponent({
  name: 'InlineComponentRenderer',
  props: {
    element: { type: Object, required: true },
    cache:   { type: Object, required: true },
    zoom:    { type: Number, default: 1 },
  },
  setup(p) {
    const zoomR = computed(() => p.zoom)
    const { mmToPx: mmToPxInner } = useMmScale(zoomR)

    const comp = computed(() => p.cache[p.element.componentId] ?? null)
    const compW = computed(() => comp.value?.width_mm || 60)
    const compH = computed(() => comp.value?.height_mm || 40)

    const compEls = computed(() => {
      if (!comp.value?.definition) return []
      const def = comp.value.definition
      const result = []
      function flatten(items) {
        for (const item of items) {
          if (item.kind === 'group') flatten(item.children || [])
          else result.push(item)
        }
      }
      flatten(def.elements || def.layers || [])
      return result
    })

    const scaleX = computed(() => p.element.width_mm / compW.value)
    const scaleY = computed(() => p.element.height_mm / compH.value)
    const effectiveZoom = computed(() => p.zoom * Math.min(scaleX.value, scaleY.value))

    return () => {
      if (!comp.value) {
        return h('div', {
          style: 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;border:1px dashed #aaa;border-radius:2px;'
        }, '◧')
      }
      return h('div', { style: 'width:100%;height:100%;overflow:hidden;position:relative;' }, [
        h('div', {
          style: {
            position: 'absolute', top: 0, left: 0,
            width:  `${mmToPxInner(compW.value)}px`,
            height: `${mmToPxInner(compH.value)}px`,
            transformOrigin: 'top left',
            transform: `scale(${scaleX.value}, ${scaleY.value})`,
            pointerEvents: 'none',
          }
        }, compEls.value.map(el => h('div', {
          key: el.id,
          style: {
            position: 'absolute',
            left:   `${mmToPxInner(el.x_mm)}px`,
            top:    `${mmToPxInner(el.y_mm)}px`,
            width:  `${mmToPxInner(el.width_mm)}px`,
            height: `${mmToPxInner(el.height_mm)}px`,
          }
        }, [
          h(AtomRenderer, {
            atomType: el.atomType,
            params: el.params || {},
            width_mm: el.width_mm,
            height_mm: el.height_mm,
            zoom: effectiveZoom.value,
          })
        ])))
      ])
    }
  }
})
</script>

<style scoped>
.card-preview {
  display: inline-block;
  background: white;
  box-shadow: 0 2px 12px rgba(0,0,0,0.18);
}

.card-boundary {
  background: white;
}

.preview-element {
  pointer-events: none;
  user-select: none;
}
</style>
