import { baseCellSizeMm, textureDrawRect } from './trackFootprint.js'
import { resolveTrackCellText } from './trackCellText.js'

export function trakCellNumbers(params = {}) {
  const start = params.n_start ?? 0
  const end = params.n_end ?? 10
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const arr = []
  if (params.reverse) {
    for (let i = hi; i >= lo; i--) arr.push(i)
  } else {
    for (let i = lo; i <= hi; i++) arr.push(i)
  }
  return arr
}

export function buildTrakCells({
  params = {},
  width_mm,
  height_mm,
  texturesById = {},
} = {}) {
  const numbers = trakCellNumbers(params)
  const isVertical = params.direction === 'vertical'
  const baseSize = baseCellSizeMm({
    cellSize: params.cellSize ?? 0.1,
    axisLengthMm: isVertical ? height_mm : width_mm,
  })
  const overrides = params.cellOverrides || {}
  const cells = []
  let offset = 0

  for (let idx = 0; idx < numbers.length; idx++) {
    const n = numbers[idx]
    const override = overrides[idx] || {}
    const texture = texturesById[override.textureId] || null
    const x = isVertical ? 0 : offset
    const y = isVertical ? offset : 0
    offset += baseSize
    cells.push({
      idx,
      n,
      text: resolveTrackCellText(override, n),
      x,
      y,
      w: baseSize,
      h: baseSize,
      cx: x + baseSize / 2,
      cy: y + baseSize / 2,
      image: textureDrawRect(x, y, baseSize, baseSize, texture?.margins),
      texture,
      coin: Number(override.coin) || 0,
      textureSource: override.textureSource,
    })
  }

  return cells
}

export function hitTestTrakCell({
  params,
  width_mm,
  height_mm,
  texturesById,
  relX_mm,
  relY_mm,
}) {
  const cells = buildTrakCells({ params, width_mm, height_mm, texturesById })
  return cells.find((cell) =>
    relX_mm >= cell.x && relX_mm < cell.x + cell.w &&
    relY_mm >= cell.y && relY_mm < cell.y + cell.h
  )?.idx ?? null
}
