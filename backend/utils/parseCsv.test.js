import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseCsvText,
  previewCsvText,
  isSyncableImportSource,
} from './parseCsv.js'

describe('parseCsvText', () => {
  it('maps header row to objects', () => {
    const rows = parseCsvText('name,attack\nÉpée,4\nBouclier,0\n')
    assert.deepEqual(rows, [
      { name: 'Épée', attack: '4' },
      { name: 'Bouclier', attack: '0' },
    ])
  })

  it('keeps commas inside quoted fields', () => {
    const rows = parseCsvText('name,desc\n"Épée, feu","Inflige 3, puis 1"\n')
    assert.deepEqual(rows, [
      { name: 'Épée, feu', desc: 'Inflige 3, puis 1' },
    ])
  })

  it('unescapes doubled quotes', () => {
    const rows = parseCsvText('name,text\n"Dit ""feu""","ok"\n')
    assert.deepEqual(rows, [
      { name: 'Dit "feu"', text: 'ok' },
    ])
  })

  it('keeps newlines inside quoted fields', () => {
    const rows = parseCsvText('name,text\n"Épée","ligne 1\nligne 2"\n')
    assert.deepEqual(rows, [
      { name: 'Épée', text: 'ligne 1\nligne 2' },
    ])
  })

  it('accepts CRLF line endings', () => {
    const rows = parseCsvText('name,attack\r\nÉpée,4\r\n')
    assert.deepEqual(rows, [{ name: 'Épée', attack: '4' }])
  })

  it('strips a UTF-8 BOM', () => {
    const rows = parseCsvText('\uFEFFname,attack\nÉpée,4\n')
    assert.deepEqual(rows, [{ name: 'Épée', attack: '4' }])
  })

  it('returns [] for empty input or headers only', () => {
    assert.deepEqual(parseCsvText(''), [])
    assert.deepEqual(parseCsvText('name,attack\n'), [])
  })

  it('fills missing cells with empty string', () => {
    const rows = parseCsvText('name,attack,cost\nÉpée,4\n')
    assert.deepEqual(rows, [{ name: 'Épée', attack: '4', cost: '' }])
  })
})

describe('previewCsvText', () => {
  it('returns headers, first 5 rows and total count', () => {
    const lines = ['name,v', ...Array.from({ length: 8 }, (_, i) => `c${i + 1},${i + 1}`)]
    const preview = previewCsvText(lines.join('\n'))
    assert.deepEqual(preview.headers, ['name', 'v'])
    assert.equal(preview.totalRows, 8)
    assert.equal(preview.preview.length, 5)
    assert.equal(preview.preview[0].name, 'c1')
  })

  it('throws when CSV has no data rows', () => {
    assert.throws(() => previewCsvText('name,v\n'), /CSV vide/)
  })
})

describe('isSyncableImportSource', () => {
  it('allows http(s) URLs only', () => {
    assert.equal(isSyncableImportSource('https://example.com/a.csv'), true)
    assert.equal(isSyncableImportSource('http://example.com/a.csv'), true)
    assert.equal(isSyncableImportSource('file:cartes.csv'), false)
    assert.equal(isSyncableImportSource('manual'), false)
    assert.equal(isSyncableImportSource(''), false)
  })
})
