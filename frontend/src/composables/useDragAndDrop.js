import { ref } from 'vue'
import { clientDeltaToCardMm, clientPointToCardMm } from '@/utils/cssMm.js'
import {
  applyRotationDelta,
  gestureAppliedDelta,
  normalizeDeg,
  pointerAngleDeg,
  resetAppliedDelta,
  selectionPivot,
  shortestAngleDelta,
} from '@/utils/elementRotation.js'

/**
 * Composable for drag-and-drop with snap grid.
 * Works with mm coordinates snapped to grid.
 *
 * @param {object} store
 * @param {() => HTMLElement|null} getCardEl
 * @param {() => number} getCardWidthMm
 * @param {() => number} getCardHeightMm
 */
export function useDragAndDrop(store, getCardEl, getCardWidthMm, getCardHeightMm) {
  const isDragging = ref(false)
  const isResizing = ref(false)
  const isRotating = ref(false)
  const resizeHandle = ref(null) // 'n','s','e','w','ne','nw','se','sw'
  const rotateLabel = ref(null)

  let startRotateEls = []
  let rotatePivot = { x: 0, y: 0 }
  let startPrimaryRotation = 0
  let lastPointerAngle = 0
  let accumulatedPointerDelta = 0

  let startMouse = { x: 0, y: 0 }
  let startEl = { x: 0, y: 0, w: 0, h: 0 }
  let currentElementId = null
  let startPositions = []
  let dragMoved = false
  let onPureClick = null

  function startDrag(e, elementId, opts = {}) {
    const el = findElement(elementId)
    if (!el || el._layerLocked) return

    e.preventDefault()
    e.stopPropagation()

    store._snapshot() // snapshot avant le début du drag
    isDragging.value = true
    currentElementId = elementId
    startMouse = { x: e.clientX, y: e.clientY }
    startEl = { x: el.x_mm, y: el.y_mm, w: el.width_mm, h: el.height_mm }
    startPositions = typeof store.getDragStartPositions === 'function'
      ? store.getDragStartPositions(elementId)
      : [{ id: elementId, x: el.x_mm, y: el.y_mm }]
    dragMoved = false
    onPureClick = opts.onPureClick || null

    store.refreshGuides(el)

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }

  function startResize(e, elementId, handle) {
    const el = findElement(elementId)
    if (!el || el._layerLocked) return

    e.preventDefault()
    e.stopPropagation()

    store._snapshot() // snapshot avant le début du resize
    isResizing.value = true
    resizeHandle.value = handle
    currentElementId = elementId
    startMouse = { x: e.clientX, y: e.clientY }
    startEl = { x: el.x_mm, y: el.y_mm, w: el.width_mm, h: el.height_mm }
    store.refreshGuides(el)

    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }

  function onDragMove(e) {
    if (!isDragging.value || !currentElementId) return
    const cardEl = getCardEl()
    if (!cardEl) return
    const { dx_mm, dy_mm } = clientDeltaToCardMm(
      cardEl,
      e.clientX - startMouse.x,
      e.clientY - startMouse.y,
      getCardWidthMm(),
      getCardHeightMm()
    )

    const newX = store.snap(startEl.x + dx_mm)
    const newY = store.snap(startEl.y + dy_mm)
    const appliedDx = newX - startEl.x
    const appliedDy = newY - startEl.y
    if (appliedDx !== 0 || appliedDy !== 0) {
      dragMoved = true
      onPureClick = null
    }

    for (const p of startPositions) {
      store.updateElement(p.id, { x_mm: p.x + appliedDx, y_mm: p.y + appliedDy }, { noHistory: true })
    }
    store.refreshGuides(findElement(currentElementId))
  }

  function onDragEnd() {
    const clickHandler = (!dragMoved && onPureClick) ? onPureClick : null
    isDragging.value = false
    currentElementId = null
    startPositions = []
    dragMoved = false
    onPureClick = null
    store.clearGuides()
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
    if (clickHandler) clickHandler()
  }

  function onResizeMove(e) {
    if (!isResizing.value || !currentElementId) return
    const cardEl = getCardEl()
    if (!cardEl) return
    const { dx_mm, dy_mm } = clientDeltaToCardMm(
      cardEl,
      e.clientX - startMouse.x,
      e.clientY - startMouse.y,
      getCardWidthMm(),
      getCardHeightMm()
    )
    const handle = resizeHandle.value
    const MIN_SIZE = 2 // mm

    let { x, y, w, h } = startEl

    if (handle.includes('e')) w = Math.max(MIN_SIZE, store.snap(w + dx_mm))
    if (handle.includes('w')) {
      const newW = Math.max(MIN_SIZE, store.snap(w - dx_mm))
      x = store.snap(x + (w - newW))
      w = newW
    }
    if (handle.includes('s')) h = Math.max(MIN_SIZE, store.snap(h + dy_mm))
    if (handle.includes('n')) {
      const newH = Math.max(MIN_SIZE, store.snap(h - dy_mm))
      y = store.snap(y + (h - newH))
      h = newH
    }

    store.updateElement(currentElementId, { x_mm: x, y_mm: y, width_mm: w, height_mm: h }, { noHistory: true })
    store.refreshGuides(findElement(currentElementId))
  }

  function onResizeEnd() {
    isResizing.value = false
    resizeHandle.value = null
    currentElementId = null
    store.clearGuides()
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  }

  function startElsFrom(elementId) {
    const raw = typeof store.getDragStartPositions === 'function'
      ? store.getDragStartPositions(elementId)
      : []
    return raw.map(p => ({
      id: p.id,
      x_mm: p.x_mm ?? p.x ?? 0,
      y_mm: p.y_mm ?? p.y ?? 0,
      width_mm: p.width_mm ?? p.w ?? 0,
      height_mm: p.height_mm ?? p.h ?? 0,
      rotation: p.rotation || 0,
    }))
  }

  function applyUpdates(updates, noHistory) {
    for (const u of updates) {
      store.updateElement(u.id, {
        x_mm: u.x_mm,
        y_mm: u.y_mm,
        rotation: u.rotation,
      }, { noHistory })
    }
  }

  function pointerOnCard(e) {
    const cardEl = getCardEl()
    if (!cardEl) return null
    return clientPointToCardMm(
      cardEl,
      e.clientX,
      e.clientY,
      getCardWidthMm(),
      getCardHeightMm()
    )
  }

  function setLabel(e, appliedDelta) {
    const deg = Math.round(normalizeDeg(startPrimaryRotation + appliedDelta))
    rotateLabel.value = { text: `${deg}°`, x: e.clientX + 12, y: e.clientY + 12 }
  }

  function resetRotationToZero(elementId) {
    const els = startElsFrom(elementId)
    if (!els.length) return
    const primary = els.find(item => item.id === elementId) || els[0]
    const delta = resetAppliedDelta(primary.rotation)
    if (delta === 0) return
    store._snapshot()
    const pivot = selectionPivot(els)
    applyUpdates(applyRotationDelta(els, delta, pivot), true)
  }

  function startRotate(e, elementId) {
    const el = findElement(elementId)
    if (!el || el._layerLocked) return

    e.preventDefault()
    e.stopPropagation()

    if (e.detail >= 2) {
      resetRotationToZero(elementId)
      return
    }

    const pt = pointerOnCard(e)
    if (!pt) return

    store._snapshot()
    isRotating.value = true
    currentElementId = elementId
    startRotateEls = startElsFrom(elementId)
    if (!startRotateEls.length) {
      isRotating.value = false
      return
    }
    rotatePivot = selectionPivot(startRotateEls)
    const primary = startRotateEls.find(item => item.id === elementId) || startRotateEls[0]
    startPrimaryRotation = primary.rotation || 0
    lastPointerAngle = pointerAngleDeg(pt.x_mm, pt.y_mm, rotatePivot.x, rotatePivot.y)
    accumulatedPointerDelta = 0
    setLabel(e, 0)

    document.addEventListener('mousemove', onRotateMove)
    document.addEventListener('mouseup', onRotateEnd)
  }

  function onRotateMove(e) {
    if (!isRotating.value) return
    const pt = pointerOnCard(e)
    if (!pt) return
    const ang = pointerAngleDeg(pt.x_mm, pt.y_mm, rotatePivot.x, rotatePivot.y)
    accumulatedPointerDelta += shortestAngleDelta(lastPointerAngle, ang)
    lastPointerAngle = ang
    const appliedDelta = gestureAppliedDelta(
      startPrimaryRotation,
      accumulatedPointerDelta,
      e.shiftKey
    )
    applyUpdates(applyRotationDelta(startRotateEls, appliedDelta, rotatePivot), true)
    setLabel(e, appliedDelta)
  }

  function onRotateEnd() {
    isRotating.value = false
    currentElementId = null
    startRotateEls = []
    rotateLabel.value = null
    document.removeEventListener('mousemove', onRotateMove)
    document.removeEventListener('mouseup', onRotateEnd)
  }

  function findElement(id) {
    return store.allElements.find(e => e.id === id)
  }

  // Cursor helper for resize handles
  function resizeCursor(handle) {
    const map = {
      n: 'ns-resize', s: 'ns-resize',
      e: 'ew-resize', w: 'ew-resize',
      ne: 'nesw-resize', sw: 'nesw-resize',
      nw: 'nwse-resize', se: 'nwse-resize'
    }
    return map[handle] || 'default'
  }

  return {
    isDragging, isResizing, isRotating, resizeHandle,
    rotateLabel,
    startDrag, startResize, startRotate, resizeCursor,
  }
}
