import test from 'node:test'
import assert from 'node:assert/strict'

import { allocateTrackId, defaultTrackMeta } from './trackTextures.js'

test('allocateTrackId returns the smallest free non-negative integer', async () => {
  const db = {
    prepare() {
      return {
        async all() {
          return [
            { track_meta: JSON.stringify({ id: 0 }) },
            { track_meta: { id: 2 } },
            { track_meta: '{invalid' },
            { track_meta: JSON.stringify({ id: -1 }) },
          ]
        },
      }
    },
  }

  assert.equal(await allocateTrackId(db), 1)
})

test('defaultTrackMeta returns the required track defaults', () => {
  assert.deepEqual(defaultTrackMeta(4), {
    id: 4,
    label: null,
    type: 'droit',
    alignment: 'both',
    voisins: [],
    margins: { left: 0, right: 0, top: 0, bottom: 0 },
  })
})
