// frontend/src/utils/migrateSizing.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { migrateDefinitionSizing } from './migrateSizing.js'

describe('migrateDefinitionSizing', () => {
  it('no-op when sizing is mm', () => {
    const def = { sizing: 'mm', layers: [{ kind: 'element', params: { fontSize: 4.5 } }] }
    const { definition, changed } = migrateDefinitionSizing(def, 88)
    assert.equal(changed, false)
    assert.equal(definition.params?.fontSize ?? definition.layers[0].params.fontSize, 4.5)
  })

  it('converts fontSize percent to mm', () => {
    const def = {
      layers: [{ kind: 'element', params: { fontSize: 4.5, maxFontSize: 12 } }],
    }
    const { definition, changed } = migrateDefinitionSizing(def, 88)
    assert.equal(changed, true)
    assert.equal(definition.sizing, 'mm')
    assert.ok(Math.abs(definition.layers[0].params.fontSize - 3.96) < 1e-9) // 4.5% of 88
    assert.ok(Math.abs(definition.layers[0].params.maxFontSize - 10.56) < 1e-9)
  })

  it('converts rows[].fontSize and walks groups', () => {
    const def = {
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
    assert.equal(definition.layers[0].children[0].params.rows[0].fontSize, 2.8) // 2.8% of 100
    assert.equal(definition.layers[0].children[0].params.rows[1].fontSize, null)
  })

  it('does not convert padding or gap', () => {
    const def = { layers: [{ kind: 'element', params: { fontSize: 5, padding: 2, gap: 1 } }] }
    const { definition } = migrateDefinitionSizing(def, 100)
    assert.equal(definition.layers[0].params.padding, 2)
    assert.equal(definition.layers[0].params.gap, 1)
    assert.equal(definition.layers[0].params.fontSize, 5) // 5% of 100
  })

  it('is idempotent', () => {
    const def = { layers: [{ kind: 'element', params: { fontSize: 4.5 } }] }
    const once = migrateDefinitionSizing(def, 88)
    const twice = migrateDefinitionSizing(once.definition, 88)
    assert.equal(twice.changed, false)
    assert.equal(twice.definition.layers[0].params.fontSize, once.definition.layers[0].params.fontSize)
  })
})
