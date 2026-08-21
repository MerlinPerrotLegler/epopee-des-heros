import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { safePngFilename } from './exportCardPng.js'

describe('safePngFilename', () => {
  it('keeps a simple name and adds .png', () => {
    assert.equal(safePngFilename('Épée-feu'), 'Épée-feu.png')
  })

  it('strips unsafe characters', () => {
    assert.equal(safePngFilename('a/b c.png'), 'a-b-c-png.png')
  })
})
