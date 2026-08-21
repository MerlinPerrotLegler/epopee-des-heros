import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { HEX_POINTS_PCT, hexPolygonPoints } from './hexGeometry.js'

describe('hexPolygonPoints', () => {
  it('maps percentage vertices to the given mm box', () => {
    const pts = hexPolygonPoints(10, 11.5)
    const expected = HEX_POINTS_PCT
      .map(([xp, yp]) => `${(xp / 100) * 10},${(yp / 100) * 11.5}`)
      .join(' ')
    assert.equal(pts, expected)
    assert.ok(pts.startsWith('5,0 '))
  })
})
