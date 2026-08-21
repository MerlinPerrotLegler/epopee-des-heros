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

  it('omits children of groups listed in skipGroupNames', () => {
    const def = {
      layers: [
        { kind: 'group', name: 'header', children: [{ id: 'h', kind: 'element', visible: true }] },
        { kind: 'group', name: 'ingredient3', children: [{ id: 'i3', kind: 'element', visible: true }] },
        { kind: 'group', name: 'diamond3', children: [{ id: 'd3', kind: 'element', visible: true }] },
      ],
    }
    const els = flattenComponentElements(def, { skipGroupNames: new Set(['ingredient3', 'diamond3']) })
    assert.equal(els.length, 1)
    assert.equal(els[0].id, 'h')
  })
})
