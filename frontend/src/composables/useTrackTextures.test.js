import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { catalogueByLogicalId } from './useTrackTextures.js'

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
