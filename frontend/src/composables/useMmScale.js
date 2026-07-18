/**
 * Screen-only mm↔px helpers (rulers, fit-to-view math).
 *
 * Card rendering MUST NOT use this: lengths go through `mmCss()` (CSS `mm`),
 * and editor zoom/pan is applied only via viewport `translate` + `scale`.
 * Pointer → card mm: `clientPointToCardMm` / `clientDeltaToCardMm` in `@/utils/cssMm.js`.
 *
 * Prefer importing `CSS_PX_PER_MM` from `@/utils/cssMm.js` directly.
 */
import { computed } from 'vue'
import { CSS_PX_PER_MM } from '@/utils/cssMm.js'

export { CSS_PX_PER_MM }

/**
 * @deprecated Card DOM must use `mmCss()`, not px. Kept for optional screen/ruler math.
 * @param {import('vue').Ref<number>|number} [zoom]
 */
export function useMmScale(zoom) {
  const pxPerMm = computed(() => {
    const z = typeof zoom === 'object' && zoom != null ? (zoom.value ?? 1) : (zoom ?? 1)
    return CSS_PX_PER_MM * z
  })

  function mmToPx(mm) {
    return mm * pxPerMm.value
  }

  function pxToMm(px) {
    return px / pxPerMm.value
  }

  /** @deprecated Do not use for card styles — use `mmCss(mm)` instead. */
  function mmToPxStyle(mm) {
    return `${mmToPx(mm)}px`
  }

  return { pxPerMm, mmToPx, pxToMm, mmToPxStyle }
}
