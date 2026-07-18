import { CSS_PX_PER_MM } from './cssMm.js'

const STORAGE_KEY = 'cd:oneToOneZoom'
const CALIBRATED_KEY = 'cd:oneToOneCalibrated'

/**
 * Zoom factor so that CSS-mm card world × scale ≈ true physical size on screen.
 * CSS `mm` uses the 96dpi reference — on Retina/HiDPI that reads smaller than a ruler.
 */
export function estimateOneToOneZoom() {
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
  // Empirical: CSS mm undersizes on typical Retina (~220dpi, dpr=2) by ~15–20%.
  if (dpr >= 2) return 1.18
  if (dpr > 1) return 1.08
  return 1
}

export function isOneToOneCalibrated() {
  try {
    return localStorage.getItem(CALIBRATED_KEY) === '1'
  } catch {
    return false
  }
}

export function getOneToOneZoom() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    if (Number.isFinite(stored) && stored >= 0.5 && stored <= 4) return stored
  } catch { /* ignore */ }
  return estimateOneToOneZoom()
}

export function setOneToOneZoom(zoom) {
  const z = Number(zoom)
  if (!Number.isFinite(z) || z < 0.5 || z > 4) return
  try {
    localStorage.setItem(STORAGE_KEY, String(z))
    localStorage.setItem(CALIBRATED_KEY, '1')
  } catch { /* ignore */ }
}

/** CSS px occupied by 1 physical mm after applying one-to-one zoom. */
export function physicalCssPxPerMm() {
  return CSS_PX_PER_MM * getOneToOneZoom()
}
