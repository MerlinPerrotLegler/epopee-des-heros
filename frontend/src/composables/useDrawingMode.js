/**
 * useDrawingMode.js
 * ─────────────────
 * Composable gérant le mode dessin calligraphique (TSD-019).
 * Gère :
 *   - l'activation / désactivation du mode
 *   - la capture des Pointer Events
 *   - la construction du trait en cours via buildStroke()
 *   - le stockage des traits finalisés dans store
 */
import { ref, computed } from 'vue'
import { buildStroke } from '@/utils/calligraphyStroke.js'

// SCALE : 1 mm = 10 SVG units (cohérent avec tous les autres atomes SVG)
const SCALE      = 10
const PX_PER_MM  = 3.7795

export const DEFAULT_PENS = [
  { name: 'Sergent-major', color: '#2a1a0a', opacity: 1.0,  nibWidth: 1.5, nibAngle: 45, pressureScale: 0.6, smoothing: 0.5 },
  { name: 'Plume fine',    color: '#2a1a0a', opacity: 0.85, nibWidth: 0.5, nibAngle: 0,  pressureScale: 0.3, smoothing: 0.7 },
  { name: 'Pinceau large', color: '#2a1a0a', opacity: 0.75, nibWidth: 3.0, nibAngle: 30, pressureScale: 0.8, smoothing: 0.4 },
  { name: 'Plume 4',       color: '#2a1a0a', opacity: 0.9,  nibWidth: 1.0, nibAngle: 20, pressureScale: 0.5, smoothing: 0.6 },
  { name: 'Plume 5',       color: '#2a1a0a', opacity: 0.8,  nibWidth: 2.0, nibAngle: 60, pressureScale: 0.7, smoothing: 0.45 },
]

/**
 * @param {Object} store   — Pinia editor store
 * @param {Function} getZoom — returns current zoom value
 */
export function useDrawingMode(store, getZoom) {
  const active            = ref(false)
  const drawingElementId  = ref(null)
  const activePenIdx      = ref(0)
  const currentPoints     = ref([])      // points of the stroke being drawn
  const liveStroke        = ref(null)    // { d, color, opacity } or null
  let   isDrawing         = false        // pointer is currently down

  const drawingElement = computed(() =>
    drawingElementId.value
      ? store.allElements.find(el => el.id === drawingElementId.value) || null
      : null
  )

  const pens = computed(() => {
    const p = drawingElement.value?.params?.pens
    return (Array.isArray(p) && p.length === 5) ? p : DEFAULT_PENS
  })

  const activePen = computed(() => pens.value[activePenIdx.value] || pens.value[0])

  // ── Enter / Exit ──────────────────────────────────────────────────────────
  function enter(elementId) {
    active.value           = true
    drawingElementId.value = elementId
    activePenIdx.value     = store.allElements.find(el => el.id === elementId)?.params?.activePenIdx ?? 0
    currentPoints.value    = []
    liveStroke.value       = null
    isDrawing              = false
  }

  function exit() {
    active.value           = false
    drawingElementId.value = null
    currentPoints.value    = []
    liveStroke.value       = null
    isDrawing              = false
  }

  function selectPen(idx) {
    activePenIdx.value = idx
  }

  // ── Erase last stroke ──────────────────────────────────────────────────────
  function deleteLastStroke() {
    if (!drawingElement.value) return
    const strokes = drawingElement.value.params?.strokes || []
    if (strokes.length === 0) return
    store.updateElement(drawingElementId.value, {
      params: { ...drawingElement.value.params, strokes: strokes.slice(0, -1) },
    })
  }

  // ── Coordinate conversion : screen → SVG atom units ───────────────────────
  function toAtomSvg(clientX, clientY, cardBoundaryEl, el, zoom) {
    // Accept both a raw DOM element and a Vue ref wrapper (safety net)
    const domEl = cardBoundaryEl && cardBoundaryEl.nodeType === 1
      ? cardBoundaryEl
      : cardBoundaryEl?.value ?? null
    if (!domEl) return null
    const rect         = domEl.getBoundingClientRect()
    // Screen pixel position relative to the atom's top-left corner
    const atomRelX_px  = clientX - rect.left - el.x_mm * PX_PER_MM * zoom
    const atomRelY_px  = clientY - rect.top  - el.y_mm * PX_PER_MM * zoom
    // Convert to SVG units: (screen_px / (PX_PER_MM * zoom)) * SCALE
    return {
      x: atomRelX_px / (PX_PER_MM * zoom) * SCALE,
      y: atomRelY_px / (PX_PER_MM * zoom) * SCALE,
    }
  }

  // ── Build live preview from currentPoints ─────────────────────────────────
  function rebuildLive() {
    if (currentPoints.value.length < 2) { liveStroke.value = null; return }
    const pen  = activePen.value
    const d    = buildStroke(currentPoints.value, {
      nibWidth_svgu: pen.nibWidth * SCALE,
      nibAngle:      pen.nibAngle,
      pressureScale: pen.pressureScale,
      smoothing:     pen.smoothing,
    })
    liveStroke.value = d ? { d, color: pen.color, opacity: pen.opacity } : null
  }

  // ── Pointer Events ────────────────────────────────────────────────────────
  function onPointerDown(e, cardBoundaryEl) {
    if (!active.value || !drawingElement.value) return
    const pt = toAtomSvg(e.clientX, e.clientY, cardBoundaryEl, drawingElement.value, getZoom())
    if (!pt) return
    isDrawing           = true
    currentPoints.value = [{ ...pt, t: e.timeStamp, pressure: e.pressure ?? 0.5 }]
    liveStroke.value    = null
    // Capture pointer so move/up are received even when leaving the element
    try { e.target.setPointerCapture(e.pointerId) } catch {}
  }

  function onPointerMove(e, cardBoundaryEl) {
    if (!active.value || !isDrawing || !drawingElement.value) return
    const pt = toAtomSvg(e.clientX, e.clientY, cardBoundaryEl, drawingElement.value, getZoom())
    if (!pt) return
    currentPoints.value.push({ ...pt, t: e.timeStamp, pressure: e.pressure ?? 0.5 })
    rebuildLive()
  }

  function onPointerUp(e, cardBoundaryEl) {
    if (!active.value || !drawingElement.value) return
    if (!isDrawing) return
    isDrawing = false

    if (currentPoints.value.length >= 2) {
      const pen = activePen.value
      const d   = buildStroke(currentPoints.value, {
        nibWidth_svgu: pen.nibWidth * SCALE,
        nibAngle:      pen.nibAngle,
        pressureScale: pen.pressureScale,
        smoothing:     pen.smoothing,
      })
      if (d) {
        const el      = drawingElement.value
        const strokes = [...(el.params?.strokes || [])]
        strokes.push({ d, color: pen.color, opacity: pen.opacity, penIdx: activePenIdx.value })
        store.updateElement(drawingElementId.value, {
          params: { ...el.params, strokes },
        })
      }
    }

    currentPoints.value = []
    liveStroke.value    = null
  }

  return {
    active,
    drawingElementId,
    drawingElement,
    activePenIdx,
    pens,
    activePen,
    liveStroke,
    enter,
    exit,
    selectPen,
    deleteLastStroke,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
