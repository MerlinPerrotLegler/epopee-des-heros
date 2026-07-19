import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { flattenComponentElements } from './componentDefinition.js'

describe('flattenComponentElements', () => {
  it('prefers layers over empty elements array', () => {
    const def = {
      elements: [],
      layers: [
        { id: 'a', kind: 'element', type: 'atom', atomType: 'title', visible: true },
      ],
    }
    const els = flattenComponentElements(def)
    assert.equal(els.length, 1)
    assert.equal(els[0].id, 'a')
  })

  it('uses legacy elements when layers absent', () => {
    const def = {
      elements: [{ id: 'b', type: 'atom', atomType: 'text' }],
    }
    const els = flattenComponentElements(def)
    assert.equal(els.length, 1)
    assert.equal(els[0].id, 'b')
  })

  it('flattens groups and skips invisible', () => {
    const def = {
      layers: [
        {
          kind: 'group',
          children: [
            { id: 'v', kind: 'element', visible: true },
            { id: 'h', kind: 'element', visible: false },
          ],
        },
      ],
    }
    const els = flattenComponentElements(def)
    assert.equal(els.length, 1)
    assert.equal(els[0].id, 'v')
  })
})
