import { baseCellSizeMm, cellFootprintMm } from './trackFootprint.js'

const DIRECTIONS = new Set(['up', 'down', 'left', 'right'])

export function orthogonalDirections(direction) {
  if (direction === 'left' || direction === 'right') return ['up', 'down']
  if (direction === 'up' || direction === 'down') return ['left', 'right']
  return []
}

function alignmentForDirection(direction) {
  return direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical'
}

function validSegments(segments) {
  return (Array.isArray(segments) ? segments : [])
    .map((segment) => ({
      direction: segment?.direction,
      count: Math.max(0, Math.trunc(Number(segment?.count) || 0)),
    }))
    .filter((segment) => DIRECTIONS.has(segment.direction) && segment.count > 0)
}

export function buildTrakPathCells({
  segments,
  cellSize,
  n_start,
  cellOverrides,
  texturesById,
  width_mm,
  height_mm,
}) {
  const pathSegments = validSegments(segments)
  const total = pathSegments.reduce((sum, segment) => sum + segment.count, 0)
  if (total === 0) return { cells: [], contentW: 0, contentH: 0 }

  const overrides = cellOverrides || {}
  const textures = texturesById || {}
  const cells = []
  let cursorX = 0
  let cursorY = 0

  for (let segmentIdx = 0; segmentIdx < pathSegments.length; segmentIdx += 1) {
    const segment = pathSegments[segmentIdx]
    const alignment = alignmentForDirection(segment.direction)
    const axisLengthMm = alignment === 'horizontal' ? width_mm : height_mm
    const baseSize = baseCellSizeMm({ cellSize, axisLengthMm })

    for (let segmentCellIdx = 0; segmentCellIdx < segment.count; segmentCellIdx += 1) {
      const idx = cells.length
      const override = overrides[idx] || {}
      const texture = textures[override.textureId] || null
      const footprint = cellFootprintMm(baseSize, baseSize, texture?.margins)

      if (segment.direction === 'left') cursorX -= footprint.w
      if (segment.direction === 'up') cursorY -= footprint.h

      const isPathEnd = idx === 0 || idx === total - 1
      const role = isPathEnd
        ? 'impasse'
        : segmentIdx > 0 && segmentCellIdx === 0
          ? 'coin'
          : 'droit'

      cells.push({
        idx,
        n: (Number(n_start) || 0) + idx,
        x: cursorX,
        y: cursorY,
        w: footprint.w,
        h: footprint.h,
        cx: cursorX + footprint.w / 2,
        cy: cursorY + footprint.h / 2,
        direction: segment.direction,
        role,
        requiredType: role,
        requiredAlignment: alignment,
        neighborIdxs: [
          ...(idx > 0 ? [idx - 1] : []),
          ...(idx < total - 1 ? [idx + 1] : []),
        ],
        texture,
        coin: Number(override.coin) || 0,
        textureSource: override.textureSource,
      })

      if (segment.direction === 'right') cursorX += footprint.w
      if (segment.direction === 'down') cursorY += footprint.h
    }
  }

  const minX = Math.min(...cells.map((cell) => cell.x))
  const minY = Math.min(...cells.map((cell) => cell.y))
  const maxX = Math.max(...cells.map((cell) => cell.x + cell.w))
  const maxY = Math.max(...cells.map((cell) => cell.y + cell.h))

  for (const cell of cells) {
    cell.x -= minX
    cell.y -= minY
    cell.cx -= minX
    cell.cy -= minY
  }

  return {
    cells,
    contentW: maxX - minX,
    contentH: maxY - minY,
  }
}
