import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CREATE_TYPE_SENTINEL, slugifyTypeCode, typeLabel } from './typeCode.js'

describe('CREATE_TYPE_SENTINEL', () => {
  it('is __create__', () => {
    assert.equal(CREATE_TYPE_SENTINEL, '__create__')
  })
})

describe('slugifyTypeCode (re-export)', () => {
  it('matches backend rules', () => {
    assert.equal(slugifyTypeCode('Faveur Royale'), 'faveur_royale')
  })
})

describe('typeLabel', () => {
  const types = [{ code: 'quete', label: 'Quête' }]

  it('returns the label when known', () => {
    assert.equal(typeLabel('quete', types), 'Quête')
  })

  it('falls back to the raw code when orphaned', () => {
    assert.equal(typeLabel('ghost', types), 'ghost')
  })

  it('falls back to empty string for missing code', () => {
    assert.equal(typeLabel(null, types), '')
  })
})
