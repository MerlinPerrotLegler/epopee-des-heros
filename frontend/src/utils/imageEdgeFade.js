// frontend/src/utils/imageEdgeFade.js

export function clampFadeMm(fadeMm, sizeMm) {
  const size = Number(sizeMm)
  const fade = Number(fadeMm)
  if (!(size > 0) || !(fade > 0)) return 0
  return Math.min(fade, size * 0.5)
}

function pct(fadeMm, sizeMm) {
  const c = clampFadeMm(fadeMm, sizeMm)
  if (c === 0) return 0
  return (c / sizeMm) * 100
}

/**
 * @returns {Record<string, string>|null}
 */
export function buildImageEdgeFadeMaskStyle({
  fadeTop_mm = 0,
  fadeBottom_mm = 0,
  fadeLeft_mm = 0,
  fadeRight_mm = 0,
  width_mm,
  height_mm,
} = {}) {
  const top = pct(fadeTop_mm, height_mm)
  const bottom = pct(fadeBottom_mm, height_mm)
  const left = pct(fadeLeft_mm, width_mm)
  const right = pct(fadeRight_mm, width_mm)
  if (top === 0 && bottom === 0 && left === 0 && right === 0) return null

  // Opaque in the middle; transparent at edges that have fade > 0
  const v = `linear-gradient(to bottom, ${
    top > 0 ? `transparent 0%, black ${top}%` : 'black 0%'
  }, ${
    bottom > 0 ? `black ${100 - bottom}%, transparent 100%` : 'black 100%'
  })`
  const h = `linear-gradient(to right, ${
    left > 0 ? `transparent 0%, black ${left}%` : 'black 0%'
  }, ${
    right > 0 ? `black ${100 - right}%, transparent 100%` : 'black 100%'
  })`

  const maskImage = `${v}, ${h}`
  return {
    maskImage,
    WebkitMaskImage: maskImage,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskComposite: 'intersect',
    // Safari / older Chromium: source-in ≈ intersect for layered masks
    WebkitMaskComposite: 'source-in',
  }
}
