import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildCardTrackCells } from './cardTrackLayout.js'

describe('buildCardTrackCells variable footprints', () => {
  it('places each edge sequentially without overlapping adjacent cells', () => {
    const params = { cells_top: 2, cells_left: 2 }
    const footprints = {
      0: { w: 12, h: 11 },
      1: { w: 18, h: 10 },
      2: { w: 15, h: 10 },
      3: { w: 13, h: 12 },
      4: { w: 10, h: 16 },
      5: { w: 10, h: 14 },
      6: { w: 14, h: 13 },
      7: { w: 17, h: 10 },
      8: { w: 16, h: 10 },
      9: { w: 11, h: 12 },
      10: { w: 10, h: 15 },
      11: { w: 10, h: 17 },
    }

    const cells = buildCardTrackCells(params, 63, 88, footprints)

    assert.deepEqual(
      cells.map(({ w, h }) => ({ w, h })),
      Object.values(footprints),
    )
    assert.equal(cells[1].x, cells[0].x + cells[0].w)
    assert.equal(cells[2].x, cells[1].x + cells[1].w)
    assert.equal(cells[3].x, cells[2].x + cells[2].w)
    assert.equal(cells[4].y, cells[3].y + cells[3].h)
    assert.equal(cells[5].y, cells[4].y + cells[4].h)
    assert.equal(cells[6].y, cells[5].y + cells[5].h)
    assert.equal(cells[7].x + cells[7].w, cells[6].x)
    assert.equal(cells[8].x + cells[8].w, cells[7].x)
    assert.equal(cells[9].x + cells[9].w, cells[8].x)
    assert.equal(cells[10].y + cells[10].h, cells[9].y)
    assert.equal(cells[11].y + cells[11].h, cells[10].y)
  })
})
