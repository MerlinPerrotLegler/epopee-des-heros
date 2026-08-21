import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COMPONENT_DIM_MIN,
  COMPONENT_DIM_MAX,
  normalizeComponentMeta,
} from './componentMeta.js'

describe('normalizeComponentMeta', () => {
  it('trims name and keeps only provided fields', () => {
    assert.deepEqual(
      normalizeComponentMeta({ name: '  Foo  ' }),
      { ok: true, patch: { name: 'Foo' } },
    )
  })

  it('accepts valid dims', () => {
    assert.deepEqual(
      normalizeComponentMeta({ width_mm: 40, height_mm: 25 }),
      { ok: true, patch: { width_mm: 40, height_mm: 25 } },
    )
  })

  it('accepts the min and max bounds', () => {
    assert.deepEqual(
      normalizeComponentMeta({ width_mm: COMPONENT_DIM_MIN, height_mm: COMPONENT_DIM_MAX }),
      { ok: true, patch: { width_mm: 1, height_mm: 500 } },
    )
  })

  it('rejects a blank name', () => {
    assert.deepEqual(
      normalizeComponentMeta({ name: '  ' }),
      { ok: false, status: 400, error: 'Le nom est requis' },
    )
  })

  it('rejects non-finite or out-of-range width', () => {
    for (const width_mm of [0, 0.5, 501, NaN, 'abc']) {
      const r = normalizeComponentMeta({ width_mm })
      assert.equal(r.ok, false)
      assert.equal(r.status, 400)
    }
  })

  it('skips missing and null fields (name-only PATCH stays valid)', () => {
    assert.deepEqual(normalizeComponentMeta({ name: 'A' }), { ok: true, patch: { name: 'A' } })
    assert.deepEqual(normalizeComponentMeta({}), { ok: true, patch: {} })
    assert.deepEqual(
      normalizeComponentMeta({ name: null, width_mm: null, height_mm: undefined }),
      { ok: true, patch: {} },
    )
  })

  it('coerces numeric strings', () => {
    assert.deepEqual(
      normalizeComponentMeta({ width_mm: '12.5', height_mm: '20' }),
      { ok: true, patch: { width_mm: 12.5, height_mm: 20 } },
    )
  })
})
