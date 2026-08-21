// frontend/src/utils/elementRotation.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeDeg,
  snapDeg,
  shortestAngleDelta,
  elementCenter,
  selectionPivot,
  pointerAngleDeg,
  rotatePoint,
  applyRotationDelta,
  gestureAppliedDelta,
  resetAppliedDelta,
} from './elementRotation.js'

const box = (id, x, y, w = 10, h = 10, rotation = 0) => ({
  id, x_mm: x, y_mm: y, width_mm: w, height_mm: h, rotation,
})

describe('normalizeDeg', () => {
  it('maps 190 to -170 and -190 to 170', () => {
    assert.equal(normalizeDeg(190), -170)
    assert.equal(normalizeDeg(-190), 170)
  })
  it('keeps 180 and maps -180 to 180', () => {
    assert.equal(normalizeDeg(180), 180)
    assert.equal(normalizeDeg(-180), 180)
  })
  it('maps 0 and 360 to 0', () => {
    assert.equal(normalizeDeg(0), 0)
    assert.equal(normalizeDeg(360), 0)
  })
  it('returns 0 for non-finite', () => {
    assert.equal(normalizeDeg(NaN), 0)
  })
})

describe('snapDeg', () => {
  it('snaps 37 to 30 and 38 to 45', () => {
    assert.equal(snapDeg(37), 30)
    assert.equal(snapDeg(38), 45)
  })
})

describe('shortestAngleDelta', () => {
  it('crosses the branch cut without a 360 jump', () => {
    assert.equal(shortestAngleDelta(170, -170), 20)
    assert.equal(shortestAngleDelta(-170, 170), -20)
  })
})

describe('pointerAngleDeg', () => {
  it('is 0 to the right, 90 below, -90 above (y-down / CSS clockwise)', () => {
    assert.equal(pointerAngleDeg(15, 5, 5, 5), 0)
    assert.equal(pointerAngleDeg(5, 15, 5, 5), 90)
    assert.equal(pointerAngleDeg(5, -5, 5, 5), -90)
  })
})

describe('applyRotationDelta — one element', () => {
  it('changes rotation only; x_mm/y_mm stay put', () => {
    const el = box('a', 0, 0)
    const pivot = elementCenter(el)
    const out = applyRotationDelta([el], 45, pivot)
    assert.equal(out.length, 1)
    assert.equal(out[0].id, 'a')
    assert.equal(out[0].rotation, 45)
    assert.ok(Math.abs(out[0].x_mm - 0) < 1e-9)
    assert.ok(Math.abs(out[0].y_mm - 0) < 1e-9)
  })
})

describe('applyRotationDelta — two elements', () => {
  it('orbits centers around the selection pivot and adds the same Δ', () => {
    const a = box('a', 0, 0)
    const b = box('b', 20, 0)
    const pivot = selectionPivot([a, b])
    assert.deepEqual(pivot, { x: 15, y: 5 })
    const out = applyRotationDelta([a, b], 90, pivot)
    const byId = Object.fromEntries(out.map(u => [u.id, u]))
    assert.equal(byId.a.rotation, 90)
    assert.equal(byId.b.rotation, 90)
    assert.ok(Math.abs(byId.a.x_mm - 10) < 1e-9)
    assert.ok(Math.abs(byId.a.y_mm - (-10)) < 1e-9)
    assert.ok(Math.abs(byId.b.x_mm - 10) < 1e-9)
    assert.ok(Math.abs(byId.b.y_mm - 10) < 1e-9)
  })
})

describe('gestureAppliedDelta', () => {
  it('returns raw Δ without normalizing (orbit needs it)', () => {
    assert.equal(gestureAppliedDelta(170, 20, false), 20)
  })
  it('snaps the absolute target when Shift is held', () => {
    assert.equal(gestureAppliedDelta(0, 37, true), 30)
    assert.equal(gestureAppliedDelta(0, 38, true), 45)
  })
})

describe('resetAppliedDelta', () => {
  it('takes the shortest path to 0', () => {
    assert.equal(resetAppliedDelta(45), -45)
    assert.equal(resetAppliedDelta(0), 0)
    assert.equal(resetAppliedDelta(-90), 90)
  })
})
