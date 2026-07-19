import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cloneLayerItem } from './cloneLayerItem.js'

describe('cloneLayerItem', () => {
  it('clones element with new id and +2mm offset', () => {
    const el = {
      id: 'a', kind: 'element', type: 'text',
      x_mm: 10, y_mm: 20, nameInLayout: 'title',
      params: { text: 'Hi' },
    }
    const c = cloneLayerItem(el)
    assert.notEqual(c.id, 'a')
    assert.equal(c.x_mm, 12)
    assert.equal(c.y_mm, 22)
    assert.equal(c.nameInLayout, 'title_copy')
    assert.equal(c.params.text, 'Hi')
    assert.equal(el.x_mm, 10) // original untouched
  })

  it('leaves empty nameInLayout empty', () => {
    const el = { id: 'a', kind: 'element', x_mm: 0, y_mm: 0, nameInLayout: '' }
    const c = cloneLayerItem(el)
    assert.equal(c.nameInLayout, '')
  })

  it('deep-clones group with new ids and offsets child elements', () => {
    const g = {
      id: 'g1', kind: 'group', name: 'G',
      children: [
        { id: 'e1', kind: 'element', x_mm: 1, y_mm: 2, nameInLayout: 'a' },
        {
          id: 'g2', kind: 'group', name: 'inner',
          children: [
            { id: 'e2', kind: 'element', x_mm: 5, y_mm: 6, nameInLayout: '' },
          ],
        },
      ],
    }
    const c = cloneLayerItem(g)
    assert.notEqual(c.id, 'g1')
    assert.equal(c.kind, 'group')
    assert.notEqual(c.children[0].id, 'e1')
    assert.equal(c.children[0].x_mm, 3)
    assert.equal(c.children[0].y_mm, 4)
    assert.equal(c.children[0].nameInLayout, 'a_copy')
    assert.notEqual(c.children[1].id, 'g2')
    assert.notEqual(c.children[1].children[0].id, 'e2')
    assert.equal(c.children[1].children[0].x_mm, 7)
    assert.equal(c.children[1].children[0].y_mm, 8)
    const ids = [c.id, c.children[0].id, c.children[1].id, c.children[1].children[0].id]
    assert.equal(new Set(ids).size, 4)
  })
})
