import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildTrakPathCells, orthogonalDirections } from './trakPathLayout.js'

const baseArgs = {
  cellSize: 0.1,
  n_start: 0,
  cellOverrides: {},
  texturesById: {},
  width_mm: 50,
  height_mm: 40,
}

describe('orthogonalDirections', () => {
  it('returns the two perpendicular directions', () => {
    assert.deepEqual(orthogonalDirections('right').sort(), ['down', 'up'])
    assert.deepEqual(orthogonalDirections('up').sort(), ['left', 'right'])
  })
})

describe('buildTrakPathCells', () => {
  it('chains segments with continuous numbering and inferred roles', () => {
    const { cells } = buildTrakPathCells({
      ...baseArgs,
      segments: [
        { direction: 'right', count: 3 },
        { direction: 'down', count: 2 },
      ],
    })

    assert.deepEqual(cells.map((cell) => cell.n), [0, 1, 2, 3, 4])
    assert.deepEqual(cells.map((cell) => cell.role), [
      'impasse', 'droit', 'droit', 'coin', 'impasse',
    ])
    assert.deepEqual(cells.map((cell) => cell.requiredAlignment), [
      'horizontal', 'horizontal', 'horizontal', 'vertical', 'vertical',
    ])
    assert.deepEqual(
      cells.map(({ x, y }) => ({ x, y })),
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
        { x: 15, y: 0 },
        { x: 15, y: 4 },
      ],
    )
  })

  it('normalizes paths that extend up or left into a positive bounding box', () => {
    const result = buildTrakPathCells({
      ...baseArgs,
      segments: [
        { direction: 'left', count: 2 },
        { direction: 'up', count: 2 },
      ],
    })

    assert.deepEqual(
      result.cells.map(({ x, y }) => ({ x, y })),
      [
        { x: 5, y: 8 },
        { x: 0, y: 8 },
        { x: 0, y: 4 },
        { x: 0, y: 0 },
      ],
    )
    assert.equal(result.contentW, 10)
    assert.equal(result.contentH, 13)
  })

  it('advances by texture footprints along the segment direction', () => {
    const { cells, contentW } = buildTrakPathCells({
      ...baseArgs,
      segments: [{ direction: 'right', count: 2 }],
      cellOverrides: { 0: { textureId: 7 } },
      texturesById: {
        7: { mediaId: 'track.png', margins: { left: 0.1, right: 0.2 } },
      },
    })

    assert.equal(cells[0].w, 6.5)
    assert.equal(cells[1].x, 6.5)
    assert.equal(cells[0].texture.mediaId, 'track.png')
    assert.equal(contentW, 11.5)
  })

  it('returns an empty zero-sized layout for invalid segments', () => {
    assert.deepEqual(buildTrakPathCells({
      ...baseArgs,
      segments: [{ direction: 'diagonal', count: 3 }, { direction: 'right', count: 0 }],
    }), {
      cells: [],
      contentW: 0,
      contentH: 0,
    })
  })
})
