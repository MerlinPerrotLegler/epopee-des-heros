import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  INGREDIENTS_FABRICATION_ID,
  INGREDIENTS_FABRICATION_MOLECULE_ID,
  buildIngredientsFabricationDefinition,
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

  it('places cases and diamonds at the spec mm coordinates', () => {
    const cadreOf = (name) => {
      const g = def.layers.find((l) => l.name === name)
      return g.children.find((c) => c.atomType === 'cadreChanfrein')
    }
    const diamondOf = (name) => {
      const g = def.layers.find((l) => l.name === name)
      return g.children.find((c) => c.atomType === 'losange')
    }
    assert.equal(cadreOf('ingredient1').x_mm, 0.5)
    assert.equal(cadreOf('ingredient2').x_mm, 9.9)
    assert.equal(cadreOf('ingredient6').x_mm, 47.5)
    assert.equal(cadreOf('ingredient1').y_mm, 11)
    assert.equal(diamondOf('diamond2').x_mm, 8)
    assert.equal(diamondOf('diamond6').x_mm, 45.6)
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
  it('is the stable component id', () => {
    assert.equal(INGREDIENTS_FABRICATION_ID, 'cmp-ingredients-fabrication')
  })
})

describe('INGREDIENTS_FABRICATION_MOLECULE_ID', () => {
  it('is the stable molecule id', () => {
    assert.equal(INGREDIENTS_FABRICATION_MOLECULE_ID, 'mol-ingredients-fabrication')
  })
})
