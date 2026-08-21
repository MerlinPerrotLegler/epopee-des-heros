import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { unresolvedMediaBindings, mediaTypeForBinding } from './missingMediaDetect.js'

describe('unresolvedMediaBindings', () => {
  it('keeps only non-empty *.mediaId paths', () => {
    assert.deepEqual(
      unresolvedMediaBindings({
        'art.mediaId': 'missing-art',
        'header.icon.mediaId': 'ico-1',
        'card_name.text': 'Épée',
        'empty.mediaId': '',
        'zero.mediaId': 0,
        skip: 'x',
      }),
      [
        { binding_path: 'art.mediaId', media_id_ref: 'missing-art' },
        { binding_path: 'header.icon.mediaId', media_id_ref: 'ico-1' },
      ],
    )
  })

  it('returns [] for empty or null data', () => {
    assert.deepEqual(unresolvedMediaBindings(null), [])
    assert.deepEqual(unresolvedMediaBindings({}), [])
  })
})

describe('mediaTypeForBinding', () => {
  const layers = [{
    kind: 'group',
    children: [
      { type: 'atom', atomType: 'image', nameInLayout: 'icon', params: { ai_media_type: 'icon' } },
      { type: 'atom', atomType: 'image', nameInLayout: 'art', params: { ai_media_type: 'illustration' } },
      { type: 'atom', atomType: 'title', nameInLayout: 'card_name', params: {} },
    ],
  }]

  it('reads ai_media_type from the nested image atom', () => {
    assert.equal(mediaTypeForBinding(layers, 'header.icon.mediaId'), 'icon')
    assert.equal(mediaTypeForBinding(layers, 'art.mediaId'), 'illustration')
  })

  it('defaults to illustration when the image has no type', () => {
    assert.equal(mediaTypeForBinding([], 'ghost.mediaId'), 'illustration')
    assert.equal(
      mediaTypeForBinding(
        [{ type: 'atom', atomType: 'image', nameInLayout: 'ghost', params: {} }],
        'ghost.mediaId',
      ),
      'illustration',
    )
  })
})
