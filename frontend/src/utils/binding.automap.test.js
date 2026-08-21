import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { autoMapColumns } from './binding.js'

describe('autoMapColumns', () => {
  const paths = [
    { path: 'card_name.text', paramName: 'text', nameInLayout: 'card_name' },
    { path: 'stats.attack.value', paramName: 'value', nameInLayout: 'stats.attack' },
    { path: 'price.or', paramName: 'or', nameInLayout: 'price' },
  ]

  it('matches header to paramName, path, suffix or nameInLayout', () => {
    const mapped = autoMapColumns(['text', 'attack', 'or', 'unknown'], paths)
    assert.equal(mapped.text, 'card_name.text')
    assert.equal(mapped.attack, 'stats.attack.value')
    assert.equal(mapped.or, 'price.or')
    assert.equal(mapped.unknown, undefined)
  })

  it('does not overwrite a column already mapped', () => {
    const mapped = autoMapColumns(['text'], paths, { text: 'keep.me' })
    assert.equal(mapped.text, 'keep.me')
  })
})
