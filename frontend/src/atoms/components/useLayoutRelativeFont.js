/**
 * Tailles de texte relatives à la hauteur du layout en cours.
 *
 * Convention : `fontSize` = pourcentage de `layout.height_mm`
 *   ex. fontSize 3 sur un layout de 88 mm → 2.64 mm
 *       fontSize 3 sur un layout de 120 mm → 3.6 mm
 */
import { computed, inject, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor.js'

export const REF_LAYOUT_HEIGHT_MM = 88

/** Clé provide/inject pour la hauteur layout (preview hors store éditeur) */
export const LAYOUT_HEIGHT_MM_KEY = 'layoutHeightMm'

/**
 * Hauteur du layout en cours (mm) — inject > store éditeur > 88.
 */
export function useCurrentLayoutHeightMm() {
  const injected = inject(LAYOUT_HEIGHT_MM_KEY, null)
  const store = useEditorStore()
  const { layout } = storeToRefs(store)

  return computed(() => {
    const fromInject = injected != null ? Number(unref(injected)) : NaN
    if (Number.isFinite(fromInject) && fromInject > 0) return fromInject
    const h = Number(layout.value?.height_mm)
    if (Number.isFinite(h) && h > 0) return h
    return REF_LAYOUT_HEIGHT_MM
  })
}

/**
 * @param {import('vue').Ref<number>|import('vue').ComputedRef<number>|number} fontSizePct
 *        Pourcentage de la hauteur du layout (ex. 3 = 3 %)
 * @returns {import('vue').ComputedRef<number>} taille effective en mm
 */
export function useLayoutRelativeFontMm(fontSizePct) {
  const layoutH = useCurrentLayoutHeightMm()

  return computed(() => {
    const pct = typeof fontSizePct === 'object' && fontSizePct != null
      ? Number(fontSizePct.value ?? 0)
      : Number(fontSizePct ?? 0)
    if (!Number.isFinite(pct) || pct <= 0) return 0
    return (pct / 100) * layoutH.value
  })
}

/**
 * Facteur vs carte de référence 88 mm (utile autosize / legacy).
 */
export function useLayoutScale() {
  const layoutH = useCurrentLayoutHeightMm()
  return computed(() => layoutH.value / REF_LAYOUT_HEIGHT_MM)
}
