<template>
  <div class="card-preview-shell" :style="shellStyle">
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
          />
          <InlineComponentRenderer
            v-else-if="el.type === 'component'"
            :element="el"
            :cache="componentsCache"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineComponent, h } from 'vue'
import { mmCss, CSS_PX_PER_MM } from '@/utils/cssMm.js'
import { resolveElementParams } from '@/utils/binding.js'
import { flattenComponentElements } from '@/utils/componentDefinition.js'
import { api } from '@/utils/api.js'
import AtomRenderer from '@/components/editor/AtomRenderer.vue'

const props = defineProps({
  layout: { type: Object, required: true },
  data:   { type: Object, default: () => ({}) },
  zoom:   { type: Number, default: 1 },
})

const cardW = computed(() => props.layout.width_mm || 63)
const cardH = computed(() => Number(props.layout.height_mm) || 88)

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

// ── Styles: sized shell (layout box) + physical CSS mm + outer preview zoom ─
const shellStyle = computed(() => ({
  width: `${cardW.value * CSS_PX_PER_MM * props.zoom}px`,
  height: `${cardH.value * CSS_PX_PER_MM * props.zoom}px`,
  overflow: 'hidden',
  position: 'relative',
  flexShrink: 0,
}))

const outerStyle = computed(() => ({
  width: mmCss(cardW.value),
  height: mmCss(cardH.value),
  transform: `scale(${props.zoom})`,
  transformOrigin: 'top left',
}))

const cardStyle = computed(() => ({
  position: 'relative',
  width:    mmCss(cardW.value),
  height:   mmCss(cardH.value),
  overflow: 'hidden',
}))

function elementStyle(el) {
  return {
    position: 'absolute',
    left:    mmCss(el.x_mm),
    top:     mmCss(el.y_mm),
    width:   mmCss(el.width_mm),
    height:  mmCss(el.height_mm),
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
  },
  setup(p) {
    const comp = computed(() => p.cache[p.element.componentId] ?? null)
    const compW = computed(() => comp.value?.width_mm || 60)
    const compH = computed(() => comp.value?.height_mm || 40)

    const compEls = computed(() => flattenComponentElements(comp.value?.definition))

    const scaleX = computed(() => p.element.width_mm / compW.value)
    const scaleY = computed(() => p.element.height_mm / compH.value)

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
            width:  mmCss(compW.value),
            height: mmCss(compH.value),
            transformOrigin: 'top left',
            transform: `scale(${scaleX.value}, ${scaleY.value})`,
            pointerEvents: 'none',
          }
        }, compEls.value.map(el => h('div', {
          key: el.id,
          style: {
            position: 'absolute',
            left:   mmCss(el.x_mm),
            top:    mmCss(el.y_mm),
            width:  mmCss(el.width_mm),
            height: mmCss(el.height_mm),
          }
        }, [
          h(AtomRenderer, {
            atomType: el.atomType,
            params: el.params || {},
            width_mm: el.width_mm,
            height_mm: el.height_mm,
          })
        ])))
      ])
    }
  }
})
</script>

<style scoped>
.card-preview-shell {
  display: inline-block;
}

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
