import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveTrackCellText } from './trackCellText.js'

describe('resolveTrackCellText', () => {
  it('falls back to the auto number when no override text is set', () => {
    assert.equal(resolveTrackCellText(undefined, 7), 7)
    assert.equal(resolveTrackCellText({}, 7), 7)
    assert.equal(resolveTrackCellText({ textureId: 1 }, 7), 7)
  })

  it('uses a custom string, including an empty cell', () => {
    assert.equal(resolveTrackCellText({ text: 'START' }, 0), 'START')
    assert.equal(resolveTrackCellText({ text: '' }, 3), '')
  })

  it('treats null text as unset', () => {
    assert.equal(resolveTrackCellText({ text: null }, 4), 4)
  })
})
