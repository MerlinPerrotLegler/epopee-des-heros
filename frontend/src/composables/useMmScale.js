import { computed } from 'vue'

// Base conversion: 1mm at zoom=1
// Standard screen DPI is ~96, 1 inch = 25.4mm, so 1mm ≈ 3.78px
// We use a round number for easier math
const MM_TO_PX_BASE = 3.7795275591 // exact 96dpi conversion

/**
 * Composable for converting between mm and px at a given zoom level.
 */
export function useMmScale(zoom) {
  const pxPerMm = computed(() => MM_TO_PX_BASE * (zoom?.value ?? 1))

  function mmToPx(mm) {
    return mm * pxPerMm.value
  }

  function pxToMm(px) {
    return px / pxPerMm.value
  }

  function mmToPxStyle(mm) {
    return `${mmToPx(mm)}px`
  }

  return { pxPerMm, mmToPx, pxToMm, mmToPxStyle }
}
