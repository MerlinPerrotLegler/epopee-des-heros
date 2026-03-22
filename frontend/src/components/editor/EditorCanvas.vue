<template>
  <div
    class="canvas-container"
    ref="containerRef"
    @wheel.prevent="onWheel"
    @mousedown="onCanvasBgClick"
  >
    <!-- Pannable/zoomable viewport -->
    <div class="canvas-viewport" :style="viewportStyle">
      <!-- Hex inactive-zone overlay: semi-transparent mask outside the hexagon (evenodd SVG) -->
      <svg
        v-if="isHex"
        class="hex-inactive-overlay"
        :width="mmToPx(cardW)"
        :height="mmToPx(cardH)"
        style="pointer-events:none; position:absolute; top:0; left:0; z-index:5"
      >
        <path
          :d="`
            M0,0 H${mmToPx(cardW)} V${mmToPx(cardH)} H0 Z
            M${mmToPx(cardW)*0.5},0
            L${mmToPx(cardW)},${mmToPx(cardH)*0.25}
            L${mmToPx(cardW)},${mmToPx(cardH)*0.75}
            L${mmToPx(cardW)*0.5},${mmToPx(cardH)}
            L0,${mmToPx(cardH)*0.75}
            L0,${mmToPx(cardH)*0.25} Z
          `"
          fill="rgba(0,0,0,0.38)"
          fill-rule="evenodd"
        />
      </svg>

      <!-- Card boundary -->
      <div
        class="card-boundary"
        ref="cardBoundaryRef"
        :style="cardStyle"
        @dragover.prevent="onDropDragOver"
        @drop="onDropAdd"
      >
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
            'drawing-active': drawingMode.active.value && drawingMode.drawingElementId.value === el.id,
          }"
          :style="elementStyle(el)"
          @mousedown="onElementMouseDown($event, el)"
          @dblclick.stop="onElementDblClick($event, el)"
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
            :live-stroke="(drawingMode.active.value && drawingMode.drawingElementId.value === el.id) ? drawingMode.liveStroke.value : null"
          />

          <!-- Component renderer -->
          <ComponentRenderer
            v-else-if="el.type === 'component'"
            :component-id="el.componentId"
            :width_mm="el.width_mm"
            :height_mm="el.height_mm"
            :zoom="store.zoom"
          />

          <!-- Icône verrou déplacement — atome drawing sélectionné, hors mode dessin -->
          <button
            v-if="el.type === 'atom' && el.atomType === 'drawing' && store.selectedElementId === el.id && !drawingMode.active.value"
            class="drawing-lock-btn"
            :class="{ locked: el.params?.moveLocked }"
            :title="el.params?.moveLocked ? 'Déplacement verrouillé — cliquer pour déverrouiller' : 'Déplacement libre — cliquer pour verrouiller'"
            @mousedown.stop
            @click.stop="store.updateElement(el.id, { params: { ...el.params, moveLocked: !el.params?.moveLocked } })"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <template v-if="el.params?.moveLocked">
                <!-- cadenas fermé -->
                <path d="M18 8h-1V6A5 5 0 007 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z"/>
              </template>
              <template v-else>
                <!-- cadenas ouvert -->
                <path d="M18 8h-1V6A5 5 0 007 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zM8.9 8V6a3.1 3.1 0 016.2 0v2"/>
              </template>
            </svg>
          </button>

          <!-- Drawing toolbar (mode dessin actif) -->
          <DrawingToolbar
            v-if="drawingMode.active.value && drawingMode.drawingElementId.value === el.id"
            :pens="drawingMode.pens.value"
            :active-pen-idx="drawingMode.activePenIdx.value"
            @select-pen="drawingMode.selectPen"
            @erase-last="drawingMode.deleteLastStroke"
            @done="drawingMode.exit"
          />

          <!-- Drawing overlay : capture pointer events during drawing mode -->
          <!-- @mousedown.stop empêche le bubble vers onElementMouseDown qui déclencherait un drag -->
          <div
            v-if="drawingMode.active.value && drawingMode.drawingElementId.value === el.id"
            class="drawing-overlay"
            @mousedown.stop
            @pointerdown.stop="drawingMode.onPointerDown($event, cardBoundaryRef)"
            @pointermove.stop="drawingMode.onPointerMove($event, cardBoundaryRef)"
            @pointerup.stop="drawingMode.onPointerUp($event, cardBoundaryRef)"
          />

          <!-- Floating toolbar : pas de duplication pour le fond ni en mode dessin -->
          <div
            v-if="store.selectedElementId === el.id && !el._layerLocked && !drawingMode.active.value"
            class="element-toolbar"
            @mousedown.stop
          >
            <button v-if="!BACKGROUND_ATOM_TYPES.has(el.atomType)" class="el-btn el-btn-dup" title="Dupliquer" @click.stop="store.duplicateElement(el.id)">⧉</button>
            <button class="el-btn el-btn-del" title="Supprimer" @click.stop="store.removeElement(el.id)">🗑</button>
          </div>

          <!-- Resize handles : pas pour le fond ni pour les composants ni en mode dessin -->
          <template v-if="store.selectedElementId === el.id && !el._layerLocked && el.type !== 'component' && !BACKGROUND_ATOM_TYPES.has(el.atomType) && !drawingMode.active.value">
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
import DrawingToolbar from './DrawingToolbar.vue'
import { BACKGROUND_ATOM_TYPES } from '@/atoms/index.js'
import { isHexLayout, hexClipPathCss } from '@/utils/hexGeometry.js'
import { useDrawingMode } from '@/composables/useDrawingMode.js'

const store = useEditorStore()
const containerRef    = ref(null)
const cardBoundaryRef = ref(null)

const drawingMode = useDrawingMode(store, () => store.zoom)

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

const isHex = computed(() => isHexLayout(store.layout))
const hexClip = hexClipPathCss()

const cardStyle = computed(() => ({
  width: `${mmToPx(cardW.value)}px`,
  height: `${mmToPx(cardH.value)}px`,
  clipPath: isHex.value ? hexClip : undefined,
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

function onElementDblClick(_e, el) {
  if (el.type === 'atom' && el.atomType === 'drawing' && !el._layerLocked) {
    drawingMode.enter(el.id)
  }
}

function onElementMouseDown(e, el) {
  // In drawing mode, clicks outside the active drawing element exit drawing mode
  if (drawingMode.active.value && drawingMode.drawingElementId.value !== el.id) {
    drawingMode.exit()
  }
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

  // Le fond de carte n'est pas déplaçable, pas de drag en mode dessin, ni si moveLocked
  const isMoveLocked = el.type === 'atom' && el.atomType === 'drawing' && el.params?.moveLocked
  if (!el._layerLocked && !BACKGROUND_ATOM_TYPES.has(el.atomType) && !drawingMode.active.value && !isMoveLocked) {
    dragDrop.startDrag(e, el.id)
  }
}

function onCanvasBgClick(e) {
  if (e.target === containerRef.value || e.target.classList.contains('card-boundary') || e.target.classList.contains('canvas-viewport')) {
    if (drawingMode.active.value) { drawingMode.exit(); return }
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

function onDropDragOver(e) {
  const types = Array.from(e.dataTransfer?.types || [])
  const hasPayload = types.includes('application/x-card-designer-add')
  if (hasPayload) e.dataTransfer.dropEffect = 'copy'
}

function onDropAdd(e) {
  const raw = e.dataTransfer?.getData('application/x-card-designer-add')
  if (!raw) return

  let payload = null
  try {
    payload = JSON.parse(raw)
  } catch {
    return
  }
  if (!payload || !cardBoundaryRef.value) return

  // Position de drop en mm dans la carte (coordonnées relatives au card-boundary)
  const rect = cardBoundaryRef.value.getBoundingClientRect()
  const dropXmm = pxToMm(e.clientX - rect.left)
  const dropYmm = pxToMm(e.clientY - rect.top)

  let element = null
  if (payload.kind === 'atom' && payload.atomType) {
    element = {
      type: 'atom',
      atomType: payload.atomType,
    }
  } else if (payload.kind === 'component' && payload.componentId) {
    element = {
      type: 'component',
      componentId: payload.componentId,
      width_mm: payload.width_mm || 30,
      height_mm: payload.height_mm || 20,
      params: {},
    }
  }
  if (!element) return

  // Ajout puis repositionnement proche du point de lâcher (centré sous le curseur)
  const created = store.addElement(element)
  if (!created) return
  if (created.type === 'atom' && BACKGROUND_ATOM_TYPES.has(created.atomType)) return

  const w = created.width_mm || 0
  const h = created.height_mm || 0
  const x = store.snap(dropXmm - w / 2)
  const y = store.snap(dropYmm - h / 2)

  store.updateElement(created.id, { x_mm: x, y_mm: y }, { noHistory: true })
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
  const tag = document.activeElement?.tagName
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable

  // Drawing mode shortcuts
  if (drawingMode.active.value) {
    if (e.key === 'Escape') { e.preventDefault(); drawingMode.exit(); return }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !inInput) {
      e.preventDefault(); drawingMode.deleteLastStroke(); return
    }
  }

  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  if (inInput) return
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

/* Drawing atom — icône verrou déplacement */
.drawing-lock-btn {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 60;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid var(--border-default, #2a3050);
  background: var(--bg-secondary, #1e2235);
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.75;
  transition: opacity 80ms, color 80ms, border-color 80ms;
}
.drawing-lock-btn:hover          { opacity: 1; color: var(--text-primary, #e8eaf0); }
.drawing-lock-btn.locked         { color: #f97316; border-color: rgba(249,115,22,0.4); opacity: 1; }
.drawing-lock-btn.locked:hover   { color: #fb923c; }

/* Drawing mode */
.canvas-element.drawing-active {
  outline: 1.5px dashed #4ade80;
  outline-offset: 2px;
  cursor: crosshair;
}

.drawing-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  cursor: crosshair;
  touch-action: none;
  pointer-events: all;
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
