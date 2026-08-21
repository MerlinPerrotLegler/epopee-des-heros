import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { chamferRectPoints, diamondPoints } from './shapePoints.js'

describe('chamferRectPoints', () => {
  it('returns a rectangle when cut is 0', () => {
    assert.deepEqual(chamferRectPoints(10, 8, 0), [
      [0, 0],
      [10, 0],
      [10, 8],
      [0, 8],
    ])
  })

  it('cuts each corner at 45 degrees', () => {
    assert.deepEqual(chamferRectPoints(10, 8, 2), [
      [2, 0],
      [8, 0],
      [10, 2],
      [10, 6],
      [8, 8],
      [2, 8],
      [0, 6],
      [0, 2],
    ])
  })

  it('clamps cut to min(w,h)/2', () => {
    const pts = chamferRectPoints(10, 8, 99)
    assert.deepEqual(pts, chamferRectPoints(10, 8, 4))
    assert.equal(pts[0][0], 4)
  })

  it('clamps negative cut to 0', () => {
    assert.deepEqual(chamferRectPoints(10, 8, -1), chamferRectPoints(10, 8, 0))
  })
})

describe('diamondPoints', () => {
  it('places vertices at side midpoints of the bbox', () => {
    assert.deepEqual(diamondPoints(10, 8), [
      [5, 0],
      [10, 4],
      [5, 8],
      [0, 4],
    ])
  })
})
