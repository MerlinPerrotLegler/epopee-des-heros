/**
 * Capture a card DOM node to a PNG download (html2canvas).
 * scale 3 ≈ 288 dpi par rapport au CSS 96 dpi.
 */
export async function downloadElementPng(element, filename = 'carte.png', { scale = 3, backgroundColor = '#ffffff' } = {}) {
  if (!element) throw new Error('Élément carte introuvable')
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor,
  })
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`
  a.click()
}

export function safePngFilename(name) {
  const base = String(name || 'carte').replace(/[^\w\-àâäéèêëïîôùûüç]+/gi, '-').replace(/-+/g, '-').slice(0, 80)
  return `${base || 'carte'}.png`
}
