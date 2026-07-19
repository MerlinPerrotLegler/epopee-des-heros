import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getLinkedVersoId,
  findRectoForVerso,
  getFacePartnerId,
  resolveOpenLayoutId,
  thumbnailForFace,
} from './layoutFaces.js'

const recto = { id: 'r1', is_back: false, back_layout_id: 'v1', thumbnail: 'data:recto' }
const verso = { id: 'v1', is_back: true, back_layout_id: null, thumbnail: 'data:verso' }
const layouts = [recto, verso]

describe('layoutFaces', () => {
  it('getLinkedVersoId', () => {
    assert.equal(getLinkedVersoId(recto), 'v1')
    assert.equal(getLinkedVersoId({ id: 'r2', back_layout_id: null }), null)
  })
  it('findRectoForVerso', () => {
    assert.equal(findRectoForVerso('v1', layouts)?.id, 'r1')
    assert.equal(findRectoForVerso('missing', layouts), null)
  })
  it('getFacePartnerId', () => {
    assert.equal(getFacePartnerId(recto, layouts), 'v1')
    assert.equal(getFacePartnerId(verso, layouts), 'r1')
  })
  it('resolveOpenLayoutId', () => {
    assert.equal(resolveOpenLayoutId(recto, 'recto'), 'r1')
    assert.equal(resolveOpenLayoutId(recto, 'verso'), 'v1')
  })
  it('thumbnailForFace', () => {
    assert.equal(thumbnailForFace(recto, 'recto', layouts), 'data:recto')
    assert.equal(thumbnailForFace(recto, 'verso', layouts), 'data:verso')
  })
})
