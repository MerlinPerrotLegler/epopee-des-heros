import { ref, computed } from 'vue'

/**
 * Composable for drag-and-drop with snap grid.
 * Works with mm coordinates snapped to grid.
 */
export function useDragAndDrop(store, mmScale) {
  const isDragging = ref(false)
  const isResizing = ref(false)
  const resizeHandle = ref(null) // 'n','s','e','w','ne','nw','se','sw'

  let startMouse = { x: 0, y: 0 }
  let startEl = { x: 0, y: 0, w: 0, h: 0 }
  let currentElementId = null

  function startDrag(e, elementId) {
    const el = findElement(elementId)
    if (!el || el._layerLocked) return
    
    e.preventDefault()
    e.stopPropagation()
    
    isDragging.value = true
    currentElementId = elementId
    startMouse = { x: e.clientX, y: e.clientY }
    startEl = { x: el.x_mm, y: el.y_mm, w: el.width_mm, h: el.height_mm }
    
    store.selectedElementId = elementId

    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
  }

  function startResize(e, elementId, handle) {
    const el = findElement(elementId)
    if (!el || el._layerLocked) return

    e.preventDefault()
    e.stopPropagation()

    isResizing.value = true
    resizeHandle.value = handle
    currentElementId = elementId
    startMouse = { x: e.clientX, y: e.clientY }
    startEl = { x: el.x_mm, y: el.y_mm, w: el.width_mm, h: el.height_mm }

    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }

  function onDragMove(e) {
    if (!isDragging.value || !currentElementId) return
    const dx = mmScale.pxToMm(e.clientX - startMouse.x)
    const dy = mmScale.pxToMm(e.clientY - startMouse.y)

    const newX = store.snap(startEl.x + dx)
    const newY = store.snap(startEl.y + dy)

    store.updateElement(currentElementId, { x_mm: newX, y_mm: newY })
  }

  function onDragEnd() {
    isDragging.value = false
    currentElementId = null
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
  }

  function onResizeMove(e) {
    if (!isResizing.value || !currentElementId) return
    const dx = mmScale.pxToMm(e.clientX - startMouse.x)
    const dy = mmScale.pxToMm(e.clientY - startMouse.y)
    const handle = resizeHandle.value
    const MIN_SIZE = 2 // mm

    let { x, y, w, h } = startEl

    if (handle.includes('e')) w = Math.max(MIN_SIZE, store.snap(w + dx))
    if (handle.includes('w')) { 
      const newW = Math.max(MIN_SIZE, store.snap(w - dx))
      x = store.snap(x + (w - newW))
      w = newW
    }
    if (handle.includes('s')) h = Math.max(MIN_SIZE, store.snap(h + dy))
    if (handle.includes('n')) {
      const newH = Math.max(MIN_SIZE, store.snap(h - dy))
      y = store.snap(y + (h - newH))
      h = newH
    }

    store.updateElement(currentElementId, { x_mm: x, y_mm: y, width_mm: w, height_mm: h })
  }

  function onResizeEnd() {
    isResizing.value = false
    resizeHandle.value = null
    currentElementId = null
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
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
    isDragging, isResizing, resizeHandle,
    startDrag, startResize, resizeCursor
  }
}
