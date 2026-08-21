// frontend/src/utils/trackFootprint.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { baseCellSizeMm, cellFootprintMm, plusTilePreviewLayout, textureDrawRect } from './trackFootprint.js'

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

describe('textureDrawRect', () => {
  it('keeps the cell origin and overflows by side insets', () => {
    const r = textureDrawRect(20, 10, 10, 10, { left: 0.1, top: 0.2 })
    assert.equal(r.x, 19)
    assert.equal(r.y, 8)
    assert.equal(r.w, 11)
    assert.equal(r.h, 12)
  })
})

describe('plusTilePreviewLayout', () => {
  it('places five tiles in an orthogonal plus on a 3×3 logical grid', () => {
    const { viewW, viewH, tiles } = plusTilePreviewLayout()
    assert.equal(viewW, 3)
    assert.equal(viewH, 3)
    assert.deepEqual(tiles.map((t) => t.key), ['n', 'w', 'c', 'e', 's'])
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t]))
    assert.equal(byKey.c.x, 1)
    assert.equal(byKey.c.y, 1)
    assert.equal(byKey.n.x, 1)
    assert.equal(byKey.n.y, 0)
    assert.equal(byKey.w.x, 0)
    assert.equal(byKey.e.x, 2)
    assert.equal(byKey.s.y, 2)
    assert.ok(tiles.every((t) => t.w === 1 && t.h === 1))
  })

  it('overlaps neighbors when a side margin is positive', () => {
    const { viewW, tiles } = plusTilePreviewLayout({ left: 0.1 })
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t]))
    assert.equal(viewW, 3.1)
    assert.equal(byKey.w.x, 0)
    assert.equal(byKey.w.w, 1.1)
    assert.equal(byKey.c.x, 1)
    assert.ok(byKey.w.x + byKey.w.w > byKey.c.x)
  })

  it('leaves a gap when a side margin is negative', () => {
    const { viewW, tiles } = plusTilePreviewLayout({ left: -0.1 })
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t]))
    assert.equal(viewW, 3)
    assert.equal(byKey.c.x, 1.1)
    assert.equal(byKey.w.x + byKey.w.w, 1)
    assert.ok(byKey.w.x + byKey.w.w < byKey.c.x)
  })
})
