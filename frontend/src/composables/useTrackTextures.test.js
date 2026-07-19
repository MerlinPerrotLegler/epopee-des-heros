import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { useTrackTextures, catalogueByLogicalId } from './useTrackTextures.js'
import { api } from '../utils/api.js'

describe('catalogueByLogicalId', () => {
  it('indexes API media rows by stable track id and exposes upload media id', () => {
    const indexed = catalogueByLogicalId([
      {
        id: 'media-uuid',
        filename: 'texture.svg',
        track_meta: {
          id: 7,
          type: 'coin',
          margins: { left: 0.1, right: 0, top: -0.1, bottom: 0 },
        },
      },
    ])

    assert.deepEqual(indexed[7], {
      id: 7,
      type: 'coin',
      margins: { left: 0.1, right: 0, top: -0.1, bottom: 0 },
      mediaId: 'media-uuid',
      filename: 'texture.svg',
    })
  })
})

describe('useTrackTextures reload', () => {
  it('fetches fresh metadata after the catalogue was cached', async () => {
    const originalGetTrackTextures = api.getTrackTextures
    let calls = 0
    api.getTrackTextures = async () => {
      calls += 1
      return [{
        id: 'media-uuid',
        filename: 'texture.svg',
        track_meta: {
          id: 7,
          margins: { left: calls, right: 0, top: 0, bottom: 0 },
        },
      }]
    }

    try {
      const textures = useTrackTextures()
      await textures.reload()

      assert.equal(calls, 2)
      assert.equal(textures.byLogicalId.value[7].margins.left, 2)
    } finally {
      api.getTrackTextures = originalGetTrackTextures
    }
  })
})
