import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseBool,
  mapRowToBindingData,
  decideImportAction,
  importRowKey,
  cardsMissingFromCsv,
  escapeCsvField,
  serializeCsv,
} from './importHelpers.js'

describe('parseBool', () => {
  it('defaults when value is empty', () => {
    assert.equal(parseBool(undefined, true), true)
    assert.equal(parseBool('', false), false)
  })

  it('accepts real booleans and string flags', () => {
    assert.equal(parseBool(true, false), true)
    assert.equal(parseBool('false', true), false)
    assert.equal(parseBool('1', false), true)
    assert.equal(parseBool('0', true), false)
  })
})

describe('mapRowToBindingData', () => {
  it('copies mapped non-empty cells', () => {
    const data = mapRowToBindingData(
      { name: 'Épée', atk: '4', skip: 'x' },
      { name: 'card_name.text', atk: 'stats.attack.value', skip: '' },
    )
    assert.deepEqual(data, {
      'card_name.text': 'Épée',
      'stats.attack.value': '4',
    })
  })
})

describe('decideImportAction', () => {
  it('creates when no existing row', () => {
    assert.equal(decideImportAction(null, true), 'create')
    assert.equal(decideImportAction(null, false), 'create')
  })

  it('updates existing only when overwrite is on', () => {
    assert.equal(decideImportAction({ id: '1' }, true), 'update')
    assert.equal(decideImportAction({ id: '1' }, false), 'skip')
  })
})

describe('cardsMissingFromCsv', () => {
  it('returns cards of this job whose key is not in the CSV', () => {
    const existing = [
      { id: 'a', layout_id: 'L1', name: 'Épée' },
      { id: 'b', layout_id: 'L1', name: 'Bouclier' },
      { id: 'c', layout_id: 'L2', name: 'Épée' },
    ]
    const seen = new Set([importRowKey('L1', 'Épée')])
    assert.deepEqual(
      cardsMissingFromCsv(existing, seen).map((c) => c.id),
      ['b', 'c'],
    )
  })
})

describe('escapeCsvField / serializeCsv', () => {
  it('quotes commas, quotes and newlines', () => {
    assert.equal(escapeCsvField('a,b'), '"a,b"')
    assert.equal(escapeCsvField('dit "feu"'), '"dit ""feu"""')
    assert.equal(escapeCsvField('l1\nl2'), '"l1\nl2"')
    assert.equal(escapeCsvField('ok'), 'ok')
  })

  it('serializes a header row and data rows', () => {
    const csv = serializeCsv(['name', 'desc'], [
      { name: 'Épée', desc: 'a,b' },
    ])
    assert.equal(csv, 'name,desc\nÉpée,"a,b"')
  })
})
