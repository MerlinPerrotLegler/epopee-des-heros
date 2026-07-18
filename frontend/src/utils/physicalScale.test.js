import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  clear: () => { store.clear() },
  removeItem: (k) => { store.delete(k) },
}

const {
  estimateOneToOneZoom,
  getOneToOneZoom,
  setOneToOneZoom,
  isOneToOneCalibrated,
} = await import('./physicalScale.js')

describe('physicalScale', () => {
  beforeEach(() => {
    store.clear()
  })

  it('estimate is >= 1', () => {
    assert.ok(estimateOneToOneZoom() >= 1)
  })

  it('stores and reads calibrated zoom', () => {
    assert.equal(isOneToOneCalibrated(), false)
    setOneToOneZoom(1.25)
    assert.equal(isOneToOneCalibrated(), true)
    assert.equal(getOneToOneZoom(), 1.25)
  })

  it('rejects out-of-range zoom', () => {
    setOneToOneZoom(1.1)
    setOneToOneZoom(99)
    assert.equal(getOneToOneZoom(), 1.1)
  })
})
