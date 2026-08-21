import { baseCellSizeMm, textureDrawRect } from './trackFootprint.js'
import { resolveTrackCellText } from './trackCellText.js'

const DIRECTIONS = new Set(['up', 'down', 'left', 'right'])

export function orthogonalDirections(direction) {
  if (direction === 'left' || direction === 'right') return ['up', 'down']
  if (direction === 'up' || direction === 'down') return ['left', 'right']
  return []
}

export function trakPathInteractiveBounds({ contentW, contentH, width_mm, height_mm }) {
  return {
    width: Math.max(Number(width_mm) || 0, Number(contentW) || 0),
    height: Math.max(Number(height_mm) || 0, Number(contentH) || 0),
  }
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
      const n = (Number(n_start) || 0) + idx

      if (segment.direction === 'left') cursorX -= baseSize
      if (segment.direction === 'up') cursorY -= baseSize

      const isPathEnd = idx === 0 || idx === total - 1
      const role = isPathEnd
        ? 'impasse'
        : segmentIdx > 0 && segmentCellIdx === 0
          ? 'coin'
          : 'droit'

      cells.push({
        idx,
        n,
        text: resolveTrackCellText(override, n),
        x: cursorX,
        y: cursorY,
        w: baseSize,
        h: baseSize,
        cx: cursorX + baseSize / 2,
        cy: cursorY + baseSize / 2,
        direction: segment.direction,
        role,
        requiredType: role,
        requiredAlignment: alignment,
        neighborIdxs: [
          ...(idx > 0 ? [idx - 1] : []),
          ...(idx < total - 1 ? [idx + 1] : []),
        ],
        texture,
        image: textureDrawRect(cursorX, cursorY, baseSize, baseSize, texture?.margins),
        coin: Number(override.coin) || 0,
        textureSource: override.textureSource,
      })

      if (segment.direction === 'right') cursorX += baseSize
      if (segment.direction === 'down') cursorY += baseSize
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
    cell.image.x -= minX
    cell.image.y -= minY
  }

  return {
    cells,
    contentW: maxX - minX,
    contentH: maxY - minY,
  }
}
