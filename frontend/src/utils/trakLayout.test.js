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
    assert.equal(cells[0].w, cells[0].h)
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

  it('keeps square cells when a texture has margins', () => {
    const cells = buildTrakCells({
      params: {
        n_start: 0,
        n_end: 1,
        cellSize: 0.2,
        cellOverrides: { 0: { textureId: 3 } },
      },
      width_mm: 50,
      height_mm: 5,
      texturesById: {
        3: { margins: { left: 0.1, right: 0.2 } },
      },
    })
    assert.equal(cells[0].w, 10)
    assert.equal(cells[0].h, 10)
    assert.equal(cells[1].x, 10)
    assert.equal(cells[0].image.w, 13)
    assert.equal(cells[0].image.x, -1)
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
