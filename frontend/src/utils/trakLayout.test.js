import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildTrakCells, hitTestTrakCell } from './trakLayout.js'

describe('buildTrakCells', () => {
  it('numbers cells from n_start to n_end and applies text overrides', () => {
    const cells = buildTrakCells({
      params: {
        n_start: 1,
        n_end: 3,
        cellSize: 0.25,
        cellOverrides: { 1: { text: 'X' } },
      },
      width_mm: 40,
      height_mm: 5,
      texturesById: {},
    })
    assert.deepEqual(cells.map((cell) => cell.n), [1, 2, 3])
    assert.deepEqual(cells.map((cell) => cell.text), [1, 'X', 3])
    assert.equal(cells[1].x, cells[0].w)
  })

  it('reverses numbering when reverse is set', () => {
    const cells = buildTrakCells({
      params: { n_start: 0, n_end: 2, reverse: true, cellSize: 0.2 },
      width_mm: 50,
      height_mm: 5,
      texturesById: {},
    })
    assert.deepEqual(cells.map((cell) => cell.n), [2, 1, 0])
  })
})

describe('hitTestTrakCell', () => {
  it('returns the cell index under the pointer', () => {
    const args = {
      params: { n_start: 0, n_end: 2, cellSize: 0.25 },
      width_mm: 40,
      height_mm: 5,
      texturesById: {},
    }
    const cells = buildTrakCells(args)
    assert.equal(hitTestTrakCell({ ...args, relX_mm: cells[1].cx, relY_mm: cells[1].cy }), 1)
    assert.equal(hitTestTrakCell({ ...args, relX_mm: -1, relY_mm: 1 }), null)
  })
})
