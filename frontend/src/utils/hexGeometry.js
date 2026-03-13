// Hexagone pointy-top inscrit dans son rectangle englobant
// height = width × (2 / √3) ≈ width × 1.15470

export const HEX_RATIO = 2 / Math.sqrt(3) // ≈ 1.15470

// Les 6 sommets en pourcentages du rectangle englobant (pointy-top)
export const HEX_POINTS_PCT = [
  [50,   0],   // haut centre
  [100, 25],   // haut droite
  [100, 75],   // bas droite
  [50, 100],   // bas centre
  [0,   75],   // bas gauche
  [0,   25],   // haut gauche
]

export function isHexLayout(layout) {
  return layout?.shape === 'hexagon'
}

/** Renvoie la valeur CSS clip-path polygon() pour un hexagone pointy-top */
export function hexClipPathCss() {
  return `polygon(${HEX_POINTS_PCT.map(([x, y]) => `${x}% ${y}%`).join(', ')})`
}

/** Calcule la hauteur en mm à partir de la largeur */
export function hexHeightFromWidth(widthMm) {
  return Math.round(widthMm * HEX_RATIO * 10) / 10
}

/**
 * Génère le SVG d'un masque hexagonal pour sharp (export PNG).
 * @param {number} w — largeur en pixels
 * @param {number} h — hauteur en pixels
 */
export function hexMaskSvg(w, h) {
  const pts = HEX_POINTS_PCT.map(([xp, yp]) => `${(xp / 100) * w},${(yp / 100) * h}`).join(' ')
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><polygon points="${pts}" fill="white"/></svg>`
  )
}
