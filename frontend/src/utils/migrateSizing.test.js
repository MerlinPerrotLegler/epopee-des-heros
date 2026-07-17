import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { migrateDefinitionSizing } from './migrateSizing.js'

describe('migrateDefinitionSizing', () => {
  it('no-op when sizing is mm', () => {
    const def = { sizing: 'mm', layers: [{ kind: 'element', params: { fontSize: 4.5 } }] }
    const { definition, changed } = migrateDefinitionSizing(def, 88)
    assert.equal(changed, false)
    assert.equal(definition.layers[0].params.fontSize, 4.5)
  })

  it('stamps mm without converting when sizing missing (already physical mm)', () => {
    const def = {
      layers: [{ kind: 'element', params: { fontSize: 4.5, maxFontSize: 12, padding: 2 } }],
    }
    const { definition, changed } = migrateDefinitionSizing(def, 88)
    assert.equal(changed, true)
    assert.equal(definition.sizing, 'mm')
    assert.equal(definition.layers[0].params.fontSize, 4.5)
    assert.equal(definition.layers[0].params.maxFontSize, 12)
    assert.equal(definition.layers[0].params.padding, 2)
  })

  it('converts fontSize percent to mm when sizing is pct', () => {
    const def = {
      sizing: 'pct',
      layers: [{ kind: 'element', params: { fontSize: 4.5, maxFontSize: 12 } }],
    }
    const { definition, changed } = migrateDefinitionSizing(def, 88)
    assert.equal(changed, true)
    assert.equal(definition.sizing, 'mm')
    assert.ok(Math.abs(definition.layers[0].params.fontSize - 3.96) < 1e-9)
    assert.ok(Math.abs(definition.layers[0].params.maxFontSize - 10.56) < 1e-9)
  })

  it('converts rows[].fontSize when sizing is pct', () => {
    const def = {
      sizing: 'pct',
      layers: [{
        kind: 'group',
        children: [{
          kind: 'element',
          params: { rows: [{ value: 'a', fontSize: 2.8 }, { value: 'b', fontSize: null }] },
        }],
      }],
    }
    const { definition, changed } = migrateDefinitionSizing(def, 100)
    assert.equal(changed, true)
    assert.equal(definition.layers[0].children[0].params.rows[0].fontSize, 2.8)
    assert.equal(definition.layers[0].children[0].params.rows[1].fontSize, null)
  })

  it('is idempotent after stamp', () => {
    const def = { layers: [{ kind: 'element', params: { fontSize: 4.5 } }] }
    const once = migrateDefinitionSizing(def, 88)
    const twice = migrateDefinitionSizing(once.definition, 88)
    assert.equal(twice.changed, false)
    assert.equal(twice.definition.layers[0].params.fontSize, 4.5)
  })
})
