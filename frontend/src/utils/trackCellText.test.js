import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cellTextLayout, normalizeCellTextAlign, resolveTrackCellText } from './trackCellText.js'

describe('resolveTrackCellText', () => {
  it('falls back to the auto number when no override text is set', () => {
    assert.equal(resolveTrackCellText(undefined, 7), 7)
    assert.equal(resolveTrackCellText({}, 7), 7)
    assert.equal(resolveTrackCellText({ textureId: 1 }, 7), 7)
  })

  it('uses a custom string, including an empty cell', () => {
    assert.equal(resolveTrackCellText({ text: 'START' }, 0), 'START')
    assert.equal(resolveTrackCellText({ text: '' }, 3), '')
  })

  it('treats null text as unset', () => {
    assert.equal(resolveTrackCellText({ text: null }, 4), 4)
  })
})

describe('cellTextLayout', () => {
  const cell = { x: 10, y: 20, w: 10, h: 10, cx: 15, cy: 25 }

  it('defaults to the cell center', () => {
    assert.deepEqual(cellTextLayout(cell), {
      x: 15, y: 25, textAnchor: 'middle', dominantBaseline: 'central',
    })
    assert.equal(normalizeCellTextAlign(''), 'center')
    assert.equal(normalizeCellTextAlign('centre'), 'center')
  })

  it('pins text to each compass edge', () => {
    assert.equal(cellTextLayout(cell, 'east', { insetMm: 1 }).x, 19)
    assert.equal(cellTextLayout(cell, 'est', { insetMm: 1 }).textAnchor, 'end')
    assert.equal(cellTextLayout(cell, 'west', { insetMm: 1 }).x, 11)
    assert.equal(cellTextLayout(cell, 'north', { insetMm: 1 }).y, 21)
    assert.equal(cellTextLayout(cell, 'sud', { insetMm: 1 }).y, 29)
  })
})
