import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PROTECTED_TYPE_CODE,
  slugifyTypeCode,
  normalizeNewType,
  assertCanDeleteType,
  isUniqueConstraintError,
} from './typeCode.js'

describe('slugifyTypeCode', () => {
  it('lowercases, strips accents, and turns non-alnum into underscores', () => {
    assert.equal(slugifyTypeCode('Faveur Royale'), 'faveur_royale')
    assert.equal(slugifyTypeCode('Épopée'), 'epopee')
  })

  it('collapses and trims underscores', () => {
    assert.equal(slugifyTypeCode('  Foo---Bar  '), 'foo_bar')
    assert.equal(slugifyTypeCode('_x_'), 'x')
  })

  it('returns empty string when nothing remains', () => {
    assert.equal(slugifyTypeCode('!!!'), '')
    assert.equal(slugifyTypeCode(''), '')
    assert.equal(slugifyTypeCode(null), '')
  })
})

describe('normalizeNewType', () => {
  it('requires a trimmed label', () => {
    assert.deepEqual(normalizeNewType({ label: '  ' }), {
      ok: false,
      status: 400,
      error: 'Le libellé est requis',
    })
  })

  it('slugs from label when code is empty', () => {
    assert.deepEqual(normalizeNewType({ label: 'Faveur Royale', code: '' }), {
      ok: true,
      label: 'Faveur Royale',
      code: 'faveur_royale',
    })
  })

  it('slugs a provided code', () => {
    assert.deepEqual(normalizeNewType({ label: 'Monstres', code: 'Faveur Royale' }), {
      ok: true,
      label: 'Monstres',
      code: 'faveur_royale',
    })
  })

  it('rejects a code that slugs to empty', () => {
    assert.deepEqual(normalizeNewType({ label: 'X', code: '!!!' }), {
      ok: false,
      status: 400,
      error: 'Code invalide',
    })
  })
})

describe('assertCanDeleteType', () => {
  it('blocks dos', () => {
    assert.equal(PROTECTED_TYPE_CODE, 'dos')
    assert.deepEqual(assertCanDeleteType('dos'), {
      ok: false,
      status: 409,
      error: 'Le type dos ne peut pas être supprimé',
    })
  })

  it('allows other codes', () => {
    assert.deepEqual(assertCanDeleteType('quete'), { ok: true })
  })
})

describe('isUniqueConstraintError', () => {
  it('detects sqlite and mysql duplicates', () => {
    assert.equal(isUniqueConstraintError({ code: 'SQLITE_CONSTRAINT_UNIQUE' }), true)
    assert.equal(isUniqueConstraintError({ message: 'Duplicate entry' }), true)
    assert.equal(isUniqueConstraintError({ message: 'UNIQUE constraint failed' }), true)
    assert.equal(isUniqueConstraintError({ message: 'other' }), false)
  })
})
