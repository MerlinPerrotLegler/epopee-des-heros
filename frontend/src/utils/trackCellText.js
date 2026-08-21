/**
 * Texte affiché dans une case de piste.
 * `text` défini (y compris chaîne vide) remplace le numéro auto.
 */
export function resolveTrackCellText(override, defaultN) {
  if (
    override != null
    && Object.prototype.hasOwnProperty.call(override, 'text')
    && override.text != null
  ) {
    return override.text
  }
  return defaultN
}

export const CELL_TEXT_ALIGNS = ['center', 'east', 'west', 'north', 'south']

const ALIGN_ALIASES = {
  centre: 'center',
  est: 'east',
  ouest: 'west',
  nord: 'north',
  sud: 'south',
}

export function normalizeCellTextAlign(align) {
  const raw = String(align || 'center').toLowerCase()
  const mapped = ALIGN_ALIASES[raw] || raw
  return CELL_TEXT_ALIGNS.includes(mapped) ? mapped : 'center'
}

/**
 * Position SVG du texte dans une case (coordonnées mm).
 * Alignement boussole dans le repère de la case ; inset évite le collage au bord.
 */
export function cellTextLayout(cell, align = 'center', { insetMm = 0.35 } = {}) {
  const x = Number(cell?.x) || 0
  const y = Number(cell?.y) || 0
  const w = Number(cell?.w) || 0
  const h = Number(cell?.h) || 0
  const cx = Number.isFinite(cell?.cx) ? cell.cx : x + w / 2
  const cy = Number.isFinite(cell?.cy) ? cell.cy : y + h / 2
  const padX = Math.min(Math.max(0, Number(insetMm) || 0), w / 2)
  const padY = Math.min(Math.max(0, Number(insetMm) || 0), h / 2)

  switch (normalizeCellTextAlign(align)) {
    case 'east':
      return { x: x + w - padX, y: cy, textAnchor: 'end', dominantBaseline: 'central' }
    case 'west':
      return { x: x + padX, y: cy, textAnchor: 'start', dominantBaseline: 'central' }
    case 'north':
      return { x: cx, y: y + padY, textAnchor: 'middle', dominantBaseline: 'hanging' }
    case 'south':
      return { x: cx, y: y + h - padY, textAnchor: 'middle', dominantBaseline: 'auto' }
    default:
      return { x: cx, y: cy, textAnchor: 'middle', dominantBaseline: 'central' }
  }
}
