// frontend/src/utils/cssMm.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mmCss, clientPointToCardMm, clientDeltaToCardMm } from './cssMm.js'

describe('mmCss', () => {
  it('formats number as CSS mm', () => {
    assert.equal(mmCss(4.5), '4.5mm')
    assert.equal(mmCss(0), '0mm')
  })
})

describe('clientPointToCardMm', () => {
  it('maps client point using element rect', () => {
    const cardEl = {
      getBoundingClientRect: () => ({ left: 100, top: 50, width: 378, height: 528 }),
    }
    // 378px ≈ 100mm width at some zoom; point at left+189 → mid X
    const { x_mm, y_mm } = clientPointToCardMm(cardEl, 100 + 189, 50, 100, 140)
    assert.ok(Math.abs(x_mm - 50) < 1e-9)
    assert.ok(Math.abs(y_mm - 0) < 1e-9)
  })

  it('returns zeros when rect has non-positive size', () => {
    const cardEl = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
    }
    assert.deepEqual(clientPointToCardMm(cardEl, 10, 20, 100, 140), { x_mm: 0, y_mm: 0 })
  })
})

describe('clientDeltaToCardMm', () => {
  it('scales pixel deltas by card mm / rect size', () => {
    const cardEl = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 400 }),
    }
    const { dx_mm, dy_mm } = clientDeltaToCardMm(cardEl, 20, 40, 100, 200)
    assert.ok(Math.abs(dx_mm - 10) < 1e-9)
    assert.ok(Math.abs(dy_mm - 20) < 1e-9)
  })

  it('returns zeros when rect has non-positive size', () => {
    const cardEl = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: -1 }),
    }
    assert.deepEqual(clientDeltaToCardMm(cardEl, 20, 40, 100, 200), { dx_mm: 0, dy_mm: 0 })
  })
})
