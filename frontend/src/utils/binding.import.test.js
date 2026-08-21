import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isSyncableImportSource } from './binding.js'

describe('isSyncableImportSource', () => {
  it('allows only http(s) URLs', () => {
    assert.equal(isSyncableImportSource('https://docs.google.com/spreadsheets/d/x/pub?output=csv'), true)
    assert.equal(isSyncableImportSource('file:cartes.csv'), false)
    assert.equal(isSyncableImportSource('manual'), false)
  })
})
