// frontend/src/utils/trackMatch.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isTextureCompatible, shuffleTrackTextures } from './trackMatch.js'

const t0 = { id: 0, type: 'droit', alignment: 'horizontal', voisins: [1] }
const t1 = { id: 1, type: 'droit', alignment: 'horizontal', voisins: [0] }
const t2 = { id: 2, type: 'coin', alignment: 'both', voisins: [] }

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

describe('shuffleTrackTextures', () => {
  it('keeps user overrides and fills others as system', () => {
    const cells = [
      { idx: 0, requiredType: 'droit', requiredAlignment: 'horizontal', neighborIdxs: [1] },
      { idx: 1, requiredType: 'droit', requiredAlignment: 'horizontal', neighborIdxs: [0] },
    ]
    const existing = { 0: { textureId: 0, coin: 0, textureSource: 'user' } }
    const out = shuffleTrackTextures({ cells, textures: [t0, t1], existingOverrides: existing })
    assert.equal(out[0].textureSource, 'user')
    assert.equal(out[0].textureId, 0)
    assert.ok(!out[1] || out[1].textureSource === 'system' || out[1].textureId == null)
  })
})
