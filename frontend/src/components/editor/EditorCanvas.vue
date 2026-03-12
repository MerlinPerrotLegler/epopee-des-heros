<template>
  <div
    class="canvas-container"
    ref="containerRef"
    @wheel.prevent="onWheel"
    @mousedown="onCanvasBgClick"
  >
    <!-- Pannable/zoomable viewport -->
    <div class="canvas-viewport" :style="viewportStyle">
      <!-- Card boundary -->
      <div class="card-boundary" ref="cardBoundaryRef" :style="cardStyle">
        <!-- Grid overlay -->
        <svg
          v-if="store.showGrid"
          class="grid-overlay"
          :width="mmToPx(cardW)" :height="mmToPx(cardH)"
        >
          <defs>
            <pattern
              id="grid-pattern"
              :width="mmToPx(store.snapGrid)"
              :height="mmToPx(store.snapGrid)"
              patternUnits="userSpaceOnUse"
            >
              <path
                :d="`M ${mmToPx(store.snapGrid)} 0 L 0 0 0 ${mmToPx(store.snapGrid)}`"
                fill="none"
                stroke="rgba(108,122,255,0.08)"
                stroke-width="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>

        <!-- Rendered elements -->
        <div
          v-for="el in store.allElements" :key="el.id"
          class="canvas-element"
          :class="{
            selected: store.selectedElementId === el.id,
            locked: el._layerLocked,
            'is-background': BACKGROUND_ATOM_TYPES.has(el.atomType),
          }"
          :style="elementStyle(el)"
          @mousedown="onElementMouseDown($event, el)"
        >
          <!-- Atom renderer -->
          <AtomRenderer
            v-if="el.type === 'atom'"
            :atomType="el.atomType"
            :params="resolvedParams(el)"
            :width_mm="el.width_mm"
            :height_mm="el.height_mm"
            :zoom="store.zoom"
            :selected="store.selectedElementId === el.id"
          />

          <!-- Component renderer -->
          <ComponentRenderer
            v-else-if="el.type === 'component'"
            :component-id="el.componentId"
            :width_mm="el.width_mm"
            :height_mm="el.height_mm"
            :zoom="store.zoom"
          />

          <!-- Floating toolbar : pas de duplication pour le fond -->
          <div
            v-if="store.selectedElementId === el.id && !el._layerLocked"
            class="element-toolbar"
            @mousedown.stop
          >
            <button v-if="!BACKGROUND_ATOM_TYPES.has(el.atomType)" class="el-btn el-btn-dup" title="Dupliquer" @click.stop="store.duplicateElement(el.id)">⧉</button>
            <button class="el-btn el-btn-del" title="Supprimer" @click.stop="store.removeElement(el.id)">🗑</button>
          </div>

          <!-- Resize handles : pas pour le fond ni pour les composants -->
          <template v-if="store.selectedElementId === el.id && !el._layerLocked && el.type !== 'component' && !BACKGROUND_ATOM_TYPES.has(el.atomType)">
            <div
              v-for="handle in resizeHandles" :key="handle"
              class="resize-handle"
              :class="`handle-${handle}`"
              :style="{ cursor: dragDrop.resizeCursor(handle) }"
              @mousedown.stop="dragDrop.startResize($event, el.id, handle)"
            ></div>
          </template>
        </div>
      </div>
    </div>

    <!-- Rulers -->
    <div class="ruler ruler-h">
      <svg :width="rulerLen" height="20">
        <g v-for="tick in hTicks" :key="tick.mm">
          <line
            :x1="tick.px" :x2="tick.px"
            :y1="tick.major ? 0 : 12" y2="20"
            stroke="var(--text-muted)" stroke-width="0.5"
          />
          <text
            v-if="tick.major"
            :x="tick.px + 2" y="10"
            fill="var(--text-muted)" font-size="8" font-family="var(--font-mono)"
          >{{ tick.mm }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { useMmScale } from '@/composables/useMmScale.js'
import { useDragAndDrop } from '@/composables/useDragAndDrop.js'
import { resolveElementParams } from '@/utils/binding.js'
import { hitTestCardTrackCell } from '@/utils/cardTrackLayout.js'
import AtomRenderer from './AtomRenderer.vue'
import ComponentRenderer from './ComponentRenderer.vue'
import { BACKGROUND_ATOM_TYPES } from '@/atoms/index.js'

const store = useEditorStore()
const containerRef = ref(null)
const cardBoundaryRef = ref(null)

const zoom = computed(() => store.zoom)
const { mmToPx, pxToMm } = useMmScale(zoom)
const dragDrop = useDragAndDrop(store, { pxToMm })

const resizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const cardW = computed(() => store.layout?.width_mm || 63)
const cardH = computed(() => store.layout?.height_mm || 88)

const rulerLen = computed(() => Math.max(mmToPx(cardW.value) + 200, 1000))

const hTicks = computed(() => {
  const ticks = []
  const maxMm = Math.ceil(pxToMm(rulerLen.value))
  for (let mm = 0; mm <= maxMm; mm += store.snapGrid) {
    ticks.push({
      mm,
      px: mmToPx(mm) + store.panX,
      major: mm % 10 === 0
    })
  }
  return ticks
})

const viewportStyle = computed(() => ({
  transform: `translate(${store.panX}px, ${store.panY}px)`
}))

const cardStyle = computed(() => ({
  width: `${mmToPx(cardW.value)}px`,
  height: `${mmToPx(cardH.value)}px`,
}))

function elementStyle(el) {
  return {
    left: `${mmToPx(el.x_mm)}px`,
    top: `${mmToPx(el.y_mm)}px`,
    width: `${mmToPx(el.width_mm)}px`,
    height: `${mmToPx(el.height_mm)}px`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el._layerOpacity != null ? el._layerOpacity : undefined,
  }
}

function resolvedParams(el) {
  if (store.previewData) {
    return resolveElementParams(el, store.previewData)
  }
  return el.params || {}
}

function onElementMouseDown(e, el) {
  const wasAlreadySelected = store.selectedElementId === el.id
  store.selectedElementId = el.id

  // Clic sur une case d'un CardTrack déjà sélectionné → sélection de case
  if (wasAlreadySelected && !el._layerLocked && el.type === 'atom' && el.atomType === 'cardTrack') {
    const cardEl = containerRef.value?.querySelector('.card-boundary')
    if (cardEl) {
      const cardRect = cardEl.getBoundingClientRect()
      const relX_mm  = pxToMm(e.clientX - cardRect.left) - el.x_mm
      const relY_mm  = pxToMm(e.clientY - cardRect.top)  - el.y_mm
      const idx = hitTestCardTrackCell(el.params || {}, el.width_mm, el.height_mm, relX_mm, relY_mm)
      if (idx !== null) {
        store.activeCellIdx = idx
        return // pas de drag : l'utilisateur sélectionne une case
      }
    }
  }

  // Le fond de carte n'est pas déplaçable
  if (!el._layerLocked && !BACKGROUND_ATOM_TYPES.has(el.atomType)) {
    dragDrop.startDrag(e, el.id)
  }
}

function onCanvasBgClick(e) {
  if (e.target === containerRef.value || e.target.classList.contains('card-boundary') || e.target.classList.contains('canvas-viewport')) {
    store.selectedElementId = null
  }
  // Pan with middle mouse or if clicking on background
  if (e.button === 1) {
    startPan(e)
  }
}

function onWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    store.zoom = Math.max(0.05, store.zoom + (-e.deltaY * 0.001))
  } else {
    store.panX -= e.deltaX
    store.panY -= e.deltaY
  }
}

const PX_PER_MM  = 3.7795
const RULER_SIZE = 40
const FIT_PAD    = 48 // espace autour de la carte en mode fit

function applyFit(mode) {
  if (!containerRef.value) return
  const cw = containerRef.value.offsetWidth  - RULER_SIZE
  const ch = containerRef.value.offsetHeight - RULER_SIZE
  if (mode === 'fit') {
    const fz = Math.min(
      (cw - FIT_PAD * 2) / (cardW.value * PX_PER_MM),
      (ch - FIT_PAD * 2) / (cardH.value * PX_PER_MM)
    )
    store.zoom = fz
    store.panX = (cw - cardW.value * PX_PER_MM * fz) / 2
    store.panY = (ch - cardH.value * PX_PER_MM * fz) / 2
  } else if (mode === '1:1') {
    store.zoom = 1
    store.panX = (cw - cardW.value * PX_PER_MM) / 2
    store.panY = (ch - cardH.value * PX_PER_MM) / 2
  }
}

// Thumbnail capture — html2canvas importé dynamiquement pour ne pas alourdir le bundle initial
async function captureThumbnail() {
  if (!cardBoundaryRef.value) return null
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(cardBoundaryRef.value, {
      scale: 0.5,        // demi-résolution suffit pour une miniature
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    })
    return canvas.toDataURL('image/jpeg', 0.65)
  } catch {
    return null
  }
}

function handleFitRequest(val) {
  if (!val) return
  // double RAF : premier pour que le DOM soit peint, second pour les dimensions finales
  requestAnimationFrame(() => requestAnimationFrame(() => {
    applyFit(val)
    store.requestFit = null
  }))
}

// Cas normal : fit demandé après le montage (boutons toolbar)
watch(() => store.requestFit, handleFitRequest)

// Cas ouverture : EditorCanvas monte APRÈS que loadLayout a posé requestFit
// (EditorView a un v-if="!store.loading" qui cache le canvas pendant le chargement)
// Arrow-key movement of selected layer / group
function onKeyDown(e) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
  if (!store.selectedItemId) return
  e.preventDefault()
  const step = e.shiftKey ? 10 * store.snapGrid : store.snapGrid
  const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
  const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0
  store.moveSelected(dx, dy)
}

onMounted(() => {
  handleFitRequest(store.requestFit)
  store.registerCaptureCallback(captureThumbnail)
  window.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  store.unregisterCaptureCallback()
  window.removeEventListener('keydown', onKeyDown)
})

let panning = false
function startPan(e) {
  panning = true
  const startX = e.clientX, startY = e.clientY
  const startPanX = store.panX, startPanY = store.panY

  const onMove = (e) => {
    if (!panning) return
    store.panX = startPanX + (e.clientX - startX)
    store.panY = startPanY + (e.clientY - startY)
  }
  const onUp = () => {
    panning = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  cursor: default;
}

.canvas-viewport {
  position: absolute;
  top: 40px;
  left: 40px;
}

.card-boundary {
  position: relative;
  background: #ffffff;
  border-radius: 2px;
  box-shadow:
    0 0 0 1px rgba(108, 122, 255, 0.3),
    0 4px 24px rgba(0, 0, 0, 0.4);
  /* overflow: visible so handles and floating toolbar are not clipped at card edges */
  overflow: visible;
}


.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.canvas-element {
  position: absolute;
  cursor: move;
  transition: box-shadow 80ms ease;
}

.canvas-element.selected {
  outline: 1.5px solid var(--accent-primary);
  outline-offset: 1px;
  z-index: 100;
}

/* Le fond sélectionné : contour discret, pas de z-index élevé */
.canvas-element.is-background {
  cursor: default;
  z-index: 0 !important;
}
.canvas-element.is-background.selected {
  outline: 1.5px dashed rgba(108, 122, 255, 0.5);
  outline-offset: -2px;
  z-index: 0 !important;
}

.canvas-element.locked {
  cursor: default;
  opacity: 0.5;
  pointer-events: none;
}

/* Resize handles */
.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--accent-primary);
  border: 1px solid white;
  border-radius: 1px;
  z-index: 101;
}

.handle-n  { top: -4px; left: 50%; transform: translateX(-50%); }
.handle-s  { bottom: -4px; left: 50%; transform: translateX(-50%); }
.handle-e  { right: -4px; top: 50%; transform: translateY(-50%); }
.handle-w  { left: -4px; top: 50%; transform: translateY(-50%); }
.handle-ne { top: -4px; right: -4px; }
.handle-nw { top: -4px; left: -4px; }
.handle-se { bottom: -4px; right: -4px; }
.handle-sw { bottom: -4px; left: -4px; }

/* Placeholder boxes for components/molecules */
.placeholder-box {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-muted);
  border: 1px dashed var(--border-default);
  border-radius: 2px;
}

.component-ph {
  background: rgba(108, 122, 255, 0.05);
  border-color: rgba(108, 122, 255, 0.3);
}

/* Floating element toolbar (delete/duplicate) */
.element-toolbar {
  position: absolute;
  top: -28px;
  right: 0;
  display: flex;
  gap: 2px;
  z-index: 200;
  pointer-events: all;
}

.el-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  background: var(--bg-secondary, #1e2235);
  color: var(--text-primary, #e8eaf0);
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transition: background 80ms;
}

.el-btn:hover { background: var(--bg-tertiary, #2a3050); }
.el-btn-del:hover { background: #ef4444; color: #fff; }

/* Ruler */
.ruler {
  position: absolute;
  top: 0;
  left: 40px;
  height: 20px;
  overflow: hidden;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-subtle);
}
</style>
