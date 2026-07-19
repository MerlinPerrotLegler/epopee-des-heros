// frontend/src/utils/imageEdgeFade.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { clampFadeMm, buildImageEdgeFadeMaskStyle } from './imageEdgeFade.js'

describe('clampFadeMm', () => {
  it('zeros negatives and oversize', () => {
    assert.equal(clampFadeMm(-2, 30), 0)
    assert.equal(clampFadeMm(0, 30), 0)
    assert.equal(clampFadeMm(5, 30), 5)
    assert.equal(clampFadeMm(20, 30), 15) // 50% of 30
    assert.equal(clampFadeMm(5, 0), 0)
  })
})

describe('buildImageEdgeFadeMaskStyle', () => {
  it('returns null when all fades are 0', () => {
    assert.equal(
      buildImageEdgeFadeMaskStyle({
        fadeTop_mm: 0,
        fadeBottom_mm: 0,
        fadeLeft_mm: 0,
        fadeRight_mm: 0,
        width_mm: 40,
        height_mm: 30,
      }),
      null,
    )
  })

  it('builds intersect masks for bottom fade only', () => {
    const style = buildImageEdgeFadeMaskStyle({
      fadeTop_mm: 0,
      fadeBottom_mm: 6,
      fadeLeft_mm: 0,
      fadeRight_mm: 0,
      width_mm: 40,
      height_mm: 30,
    })
    assert.ok(style)
    assert.match(style.maskImage, /linear-gradient\(to bottom/)
    assert.match(style.maskImage, /linear-gradient\(to right/)
    assert.equal(style.maskComposite, 'intersect')
    // 6/30 = 20% → opaque until 80%
    assert.match(style.maskImage, /80%/)
  })
})
