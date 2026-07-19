// frontend/src/utils/trackMatch.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clearAllTextureOverrides,
  isTextureCompatible,
  pickCoin,
  propagateTextureOverrides,
  shuffleTrackTextures,
} from './trackMatch.js'

const t0 = { id: 0, type: 'droit', alignment: 'horizontal', voisins: [1] }
const t1 = { id: 1, type: 'droit', alignment: 'horizontal', voisins: [0] }
const t2 = { id: 2, type: 'coin', alignment: 'both', voisins: [] }

const cells = [
  { idx: 0, requiredType: 'droit', requiredAlignment: 'horizontal', neighborIdxs: [1] },
  { idx: 1, requiredType: 'droit', requiredAlignment: 'horizontal', neighborIdxs: [0] },
]

describe('isTextureCompatible', () => {
  it('requires type and alignment', () => {
    assert.equal(isTextureCompatible(t0, { requiredType: 'droit', requiredAlignment: 'horizontal', neighborTextureIds: [] }), true)
    assert.equal(isTextureCompatible(t0, { requiredType: 'coin', requiredAlignment: 'horizontal', neighborTextureIds: [] }), false)
    assert.equal(isTextureCompatible(t2, { requiredType: 'coin', requiredAlignment: 'vertical', neighborTextureIds: [] }), true)
  })
  it('enforces voisins when neighbors present', () => {
    assert.equal(isTextureCompatible(t0, { requiredType: 'droit', requiredAlignment: 'horizontal', neighborTextureIds: [1] }), true)
    assert.equal(isTextureCompatible(t0, { requiredType: 'droit', requiredAlignment: 'horizontal', neighborTextureIds: [9] }), false)
  })
})

describe('clearAllTextureOverrides', () => {
  it('removes only texture keys and keeps bgColor/svgMediaId', () => {
    const existing = {
      0: { textureId: 1, coin: 90, textureSource: 'user', bgColor: '#abc', svgMediaId: 42 },
      1: { bgColor: '#def' },
    }
    const out = clearAllTextureOverrides(existing)
    assert.deepEqual(out, {
      0: { bgColor: '#abc', svgMediaId: 42 },
      1: { bgColor: '#def' },
    })
  })

  it('drops entries that only held texture fields', () => {
    const out = clearAllTextureOverrides({ 0: { textureId: 1, coin: 0, textureSource: 'system' } })
    assert.deepEqual(out, {})
  })
})

describe('propagateTextureOverrides', () => {
  it('sets texture on track cells without erasing other keys', () => {
    const existing = {
      0: { bgColor: '#abc', svgMediaId: 7 },
      2: { bgColor: '#keep' },
    }
    const out = propagateTextureOverrides(cells, { textureId: 1, coin: 180 }, existing)
    assert.equal(out[0].textureId, 1)
    assert.equal(out[0].coin, 180)
    assert.equal(out[0].textureSource, 'user')
    assert.equal(out[0].bgColor, '#abc')
    assert.equal(out[0].svgMediaId, 7)
    assert.equal(out[1].textureSource, 'user')
    assert.equal(out[2].bgColor, '#keep')
    assert.equal(out[2].textureId, undefined)
  })
})

describe('shuffleTrackTextures', () => {
  it('keeps user overrides and fills others as system', () => {
    const existing = { 0: { textureId: 0, coin: 0, textureSource: 'user' } }
    const out = shuffleTrackTextures({ cells, textures: [t0, t1], existingOverrides: existing })
    assert.equal(out[0].textureSource, 'user')
    assert.equal(out[0].textureId, 0)
    assert.ok(!out[1] || out[1].textureSource === 'system' || out[1].textureId == null)
  })

  it('preserves bgColor/svgMediaId while reshuffling system textures', () => {
    const existing = {
      0: { textureId: 0, coin: 0, textureSource: 'system', bgColor: '#abc', svgMediaId: 3 },
      1: { textureId: 1, coin: 0, textureSource: 'system', bgColor: '#def' },
    }
    const out = shuffleTrackTextures({ cells, textures: [t0, t1], existingOverrides: existing })
    assert.equal(out[0].bgColor, '#abc')
    assert.equal(out[0].svgMediaId, 3)
    assert.equal(out[1].bgColor, '#def')
    assert.equal(out[0].textureSource, 'system')
    assert.ok(out[0].textureId != null)
  })

  it('does not pin user overrides without textureId (coin-only edits)', () => {
    const existing = {
      0: { coin: 90, textureSource: 'user' },
      1: { textureId: 0, coin: 0, textureSource: 'user' },
    }
    const out = shuffleTrackTextures({ cells, textures: [t0, t1], existingOverrides: existing })
    assert.equal(out[0].textureSource, 'system')
    assert.ok(out[0].textureId != null)
    assert.equal(out[1].textureSource, 'user')
    assert.equal(out[1].textureId, 0)
  })
})

const omniH = { id: 10, type: 'omnidirectionnel', alignment: 'horizontal', voisins: [] }
const omniBoth = { id: 11, type: 'omnidirectionnel', alignment: 'both', voisins: [] }

describe('omnidirectionnel', () => {
  it('matches any required role when alignment OK', () => {
    for (const requiredType of ['droit', 'coin', 'impasse']) {
      assert.equal(
        isTextureCompatible(omniBoth, { requiredType, requiredAlignment: 'horizontal', neighborTextureIds: [] }),
        true,
      )
    }
  })
  it('still enforces alignment', () => {
    assert.equal(
      isTextureCompatible(omniH, { requiredType: 'droit', requiredAlignment: 'vertical', neighborTextureIds: [] }),
      false,
    )
    assert.equal(
      isTextureCompatible(omniH, { requiredType: 'coin', requiredAlignment: 'horizontal', neighborTextureIds: [] }),
      true,
    )
  })
  it('pickCoin always returns 0', () => {
    for (const dir of ['horizontal', 'vertical', 'up', 'down', 'left', 'right']) {
      assert.equal(pickCoin(dir, 'omnidirectionnel'), 0)
    }
  })
})
