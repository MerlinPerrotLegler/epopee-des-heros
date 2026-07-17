import { tokenize } from './richTextParser.js'
import assert from 'node:assert/strict'

const tokens = tokenize('Coût /or et \\epee-longue puis /D8{3}')
const types = tokens.map((t) => t.type)
assert.ok(types.includes('picto'))
assert.ok(types.includes('die'))
const icon = tokens.find((t) => t.type === 'picto' && t.ref === 'or')
assert.equal(icon.withLabel, false)
const labeled = tokens.find((t) => t.type === 'picto' && t.ref === 'epee-longue')
assert.equal(labeled.withLabel, true)
const die = tokens.find((t) => t.type === 'die')
assert.equal(die.sides, 8)

// stat vs picto disambiguation
const statBare = tokenize('/INI')
assert.equal(statBare.length, 1)
assert.equal(statBare[0].type, 'stat')
assert.equal(statBare[0].stat, 'INI')

const statMod = tokenize('/FOR{+1}')
assert.equal(statMod.length, 1)
assert.equal(statMod[0].type, 'stat')
assert.equal(statMod[0].stat, 'FOR')
assert.equal(statMod[0].modifier, '+1')

const pictoSlash = tokenize('/or')
assert.equal(pictoSlash.length, 1)
assert.equal(pictoSlash[0].type, 'picto')
assert.equal(pictoSlash[0].ref, 'or')
assert.equal(pictoSlash[0].withLabel, false)

const pictoBackslash = tokenize('\\or')
assert.equal(pictoBackslash.length, 1)
assert.equal(pictoBackslash[0].type, 'picto')
assert.equal(pictoBackslash[0].ref, 'or')
assert.equal(pictoBackslash[0].withLabel, true)

console.log('ok richTextParser pictos')
