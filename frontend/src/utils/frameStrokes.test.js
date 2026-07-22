import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildFramePaths, estimateTitleGapWidth } from './frameStrokes.js'

describe('buildFramePaths', () => {
  it('returns double-line segments for basic tier', () => {
    const paths = buildFramePaths(500, 180, 'basic', 42, { strokeWidthMm: 0.12 })
    assert.ok(paths.length >= 8, 'expects at least 8 line rects + ornaments')
    assert.ok(paths.every(p => p.d && typeof p.opacity === 'number'))
  })

  it('uses fewer elements for fin tier (single line)', () => {
    const basic = buildFramePaths(500, 180, 'basic', 42).length
    const fin = buildFramePaths(500, 180, 'fin', 42).length
    assert.ok(fin < basic)
  })

  it('respects strokeWidthMm in path geometry', () => {
    const thin = buildFramePaths(500, 180, 'fin', 42, { strokeWidthMm: 0.08 })
    const thick = buildFramePaths(500, 180, 'fin', 42, { strokeWidthMm: 0.24 })
    // thicker stroke → taller rect in path (v component)
    const thinH = thin[0].d.match(/v ([\d.]+)/)?.[1]
    const thickH = thick[0].d.match(/v ([\d.]+)/)?.[1]
    assert.ok(Number(thickH) > Number(thinH))
  })

  it('splits top edge when title gap is set', () => {
    const full = buildFramePaths(500, 180, 'basic', 42).length
    const split = buildFramePaths(500, 180, 'basic', 42, {
      titleGapWidth: 120,
      titleCenterX: 250,
    }).length
    assert.ok(split >= full, 'title gap should not remove ornaments')
  })

  it('scales with frame dimensions (more segments on larger frame)', () => {
    const small = buildFramePaths(200, 80, 'basic', 42)
    const large = buildFramePaths(800, 320, 'basic', 42)
    assert.ok(large.length >= small.length)
  })
})

describe('estimateTitleGapWidth', () => {
  it('returns 0 for empty title', () => {
    assert.equal(estimateTitleGapWidth('', 28), 0)
  })

  it('grows with title length', () => {
    const short = estimateTitleGapWidth('A', 28)
    const long = estimateTitleGapWidth('Longer title', 28)
    assert.ok(long > short)
  })
})
