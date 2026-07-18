// frontend/src/utils/cssMm.js
/** CSS reference px per mm (96dpi). For fit/rulers only — not atom render. */
export const CSS_PX_PER_MM = 96 / 25.4

export function mmCss(n) {
  return `${n}mm`
}

export function clientPointToCardMm(cardEl, clientX, clientY, cardWidthMm, cardHeightMm) {
  const rect = cardEl.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return { x_mm: 0, y_mm: 0 }
  }
  return {
    x_mm: ((clientX - rect.left) / rect.width) * cardWidthMm,
    y_mm: ((clientY - rect.top) / rect.height) * cardHeightMm,
  }
}

export function clientDeltaToCardMm(cardEl, dxPx, dyPx, cardWidthMm, cardHeightMm) {
  const rect = cardEl.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return { dx_mm: 0, dy_mm: 0 }
  }
  return {
    dx_mm: (dxPx / rect.width) * cardWidthMm,
    dy_mm: (dyPx / rect.height) * cardHeightMm,
  }
}
