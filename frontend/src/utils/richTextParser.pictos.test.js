/**
 * TSD-026 — legacy pictos tests remplacés.
 * Ancien /D8, \ref, withLabel → nouveaux /d8, /ref{view}
 */
import assert from 'node:assert/strict'
import { tokenize } from './richTextParser.js'

const tokens = tokenize('Coût /pieces{both} et /epee-longue puis /d8{3}')
const flat = []
for (const t of tokens) {
  if (t.children) flat.push(...t.children)
  else if (t.items) for (const it of t.items) flat.push(...it)
  else flat.push(t)
}

const picto = flat.find((t) => t.type === 'picto' && t.ref === 'pieces')
assert.ok(picto)
assert.equal(picto.view, 'both')

const sword = flat.find((t) => t.type === 'picto' && t.ref === 'epee-longue')
assert.ok(sword)
assert.equal(sword.view, 'icon')

const die = flat.find((t) => t.type === 'die')
assert.equal(die.sides, 8)
assert.equal(die.value, '3')

const statBare = tokenize('/INI')
assert.equal(statBare[0].type, 'paragraph')
assert.equal(statBare[0].children[0].type, 'stat')
assert.equal(statBare[0].children[0].stat, 'INI')

console.log('ok richTextParser pictos (TSD-026)')
