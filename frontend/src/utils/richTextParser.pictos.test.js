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
console.log('ok richTextParser pictos')
