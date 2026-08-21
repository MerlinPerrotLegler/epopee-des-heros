import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  INGREDIENTS_FABRICATION_ID,
  INGREDIENTS_FABRICATION_MOLECULE_ID,
  buildIngredientsFabricationDefinition,
  CASE_X,
  DIAMOND_X,
  CASE_W,
  BLOCK_W,
} from './ingredientsFabricationSeed.js'

describe('buildIngredientsFabricationDefinition', () => {
  const def = buildIngredientsFabricationDefinition()

  it('has named groups for header, 6 ingredients and diamonds 2–6', () => {
    const names = def.layers.map((g) => g.name)
    assert.deepEqual(names.filter((n) => n.startsWith('ingredient')), [
      'ingredient1', 'ingredient2', 'ingredient3', 'ingredient4', 'ingredient5', 'ingredient6',
    ])
    assert.deepEqual(names.filter((n) => n.startsWith('diamond')), [
      'diamond2', 'diamond3', 'diamond4', 'diamond5', 'diamond6',
    ])
    assert.ok(names.includes('header'))
  })

  it('places cases space-evenly across block width', () => {
    const cadreOf = (name) => {
      const g = def.layers.find((l) => l.name === name)
      return g.children.find((c) => c.atomType === 'cadreChanfrein')
    }
    const diamondOf = (name) => {
      const g = def.layers.find((l) => l.name === name)
      return g.children.find((c) => c.atomType === 'losange')
    }
    const space = (BLOCK_W - 6 * CASE_W) / 7
    assert.ok(Math.abs(cadreOf('ingredient1').x_mm - space) < 1e-9)
    assert.ok(Math.abs(cadreOf('ingredient2').x_mm - (space + CASE_W + space)) < 1e-9)
    assert.ok(Math.abs(cadreOf('ingredient6').x_mm - CASE_X[5]) < 1e-9)
    assert.equal(cadreOf('ingredient1').y_mm, 11)
    assert.ok(Math.abs(diamondOf('diamond2').x_mm - DIAMOND_X[0]) < 1e-9)
    assert.ok(Math.abs(diamondOf('diamond6').x_mm - DIAMOND_X[4]) < 1e-9)
    assert.equal(diamondOf('diamond2').y_mm, 18.2)
  })

  it('uses ingredientN / ingredientNq nameInLayout and leaves cadre unbound', () => {
    const ing1 = def.layers.find((g) => g.name === 'ingredient1')
    const names = ing1.children.map((c) => c.nameInLayout || null)
    assert.ok(names.includes('ingredient1'))
    assert.ok(names.includes('ingredient1q'))
    assert.ok(names.includes(null) || names.includes(''))
  })
})

describe('INGREDIENTS_FABRICATION_ID', () => {
  it('is the stable legacy component id', () => {
    assert.equal(INGREDIENTS_FABRICATION_ID, 'cmp-ingredients-fabrication')
  })
})

describe('INGREDIENTS_FABRICATION_MOLECULE_ID', () => {
  it('is the stable molecule id', () => {
    assert.equal(INGREDIENTS_FABRICATION_MOLECULE_ID, 'mol-ingredients-fabrication')
  })
})
