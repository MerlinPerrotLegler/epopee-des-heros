// frontend/src/utils/trackFootprint.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { baseCellSizeMm, cellFootprintMm } from './trackFootprint.js'

describe('baseCellSizeMm', () => {
  it('multiplies ratio by axis length', () => {
    assert.equal(baseCellSizeMm({ cellSize: 0.1, axisLengthMm: 50 }), 5)
  })
})

describe('cellFootprintMm', () => {
  it('expands with positive margins and shrinks with negative', () => {
    const a = cellFootprintMm(10, 10, { left: 0.1, right: 0.1, top: 0, bottom: 0 })
    assert.equal(a.w, 12)
    assert.equal(a.h, 10)
    const b = cellFootprintMm(10, 10, { left: -0.1, right: 0, top: 0, bottom: 0 })
    assert.equal(b.w, 9)
  })
})
