// frontend/src/utils/cornerOrnaments.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCornerOrnaments, CORNER_SHAPES } from './cornerOrnaments.js'

describe('buildCornerOrnaments', () => {
  it('exposes expected shapes', () => {
    assert.deepEqual(CORNER_SHAPES, ['none', 'star4', 'star5', 'circle', 'square', 'triangle'])
  })

  it('returns empty when shape is none', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'none', sizeSvg: 20,
      corners: { TL: true, TR: true, BL: true, BR: true },
    })
    assert.deepEqual(out, [])
  })

  it('returns empty when sizeSvg is zero', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'star4', sizeSvg: 0,
      corners: { TL: true, TR: true, BL: true, BR: true },
    })
    assert.deepEqual(out, [])
  })

  it('returns 4 ornaments by default for star4', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'star4', sizeSvg: 20, corners: {},
    })
    assert.equal(out.length, 4)
    assert.deepEqual(out.map(o => o.key).sort(), ['BL', 'BR', 'TL', 'TR'])
    assert.equal(out.find(o => o.key === 'TL').cx, 10)
    assert.equal(out.find(o => o.key === 'TL').cy, 10)
    assert.equal(out.find(o => o.key === 'BR').cx, 490)
    assert.equal(out.find(o => o.key === 'BR').cy, 170)
  })

  it('honors per-corner visibility', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'circle', sizeSvg: 20,
      corners: { TL: true, TR: false, BL: false, BR: true },
    })
    assert.deepEqual(out.map(o => o.key).sort(), ['BR', 'TL'])
  })

  it('sets outward triangle rotations', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'triangle', sizeSvg: 20, corners: {},
    })
    const rot = Object.fromEntries(out.map(o => [o.key, o.rotationDeg]))
    assert.equal(rot.TL, -45)
    assert.equal(rot.TR, 45)
    assert.equal(rot.BR, 135)
    assert.equal(rot.BL, -135)
  })
})
