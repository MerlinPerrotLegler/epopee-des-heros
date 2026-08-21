import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  INGREDIENT_SLOT_COUNT,
  isBlankBindingValue,
  isIngredientSlotEmpty,
  hiddenIngredientGroupNames,
} from './ingredientSlots.js'

describe('isBlankBindingValue', () => {
  it('treats null, undefined, empty and whitespace as blank', () => {
    assert.equal(isBlankBindingValue(null), true)
    assert.equal(isBlankBindingValue(undefined), true)
    assert.equal(isBlankBindingValue(''), true)
    assert.equal(isBlankBindingValue('  '), true)
    assert.equal(isBlankBindingValue('fer'), false)
  })
})

describe('isIngredientSlotEmpty', () => {
  it('is empty when data is missing or the key is absent', () => {
    assert.equal(isIngredientSlotEmpty(null, 'craft', 1), true)
    assert.equal(isIngredientSlotEmpty({}, 'craft', 1), true)
  })

  it('uses prefix.ingredientN.ref', () => {
    const data = { 'craft.ingredient1.ref': 'fer' }
    assert.equal(isIngredientSlotEmpty(data, 'craft', 1), false)
    assert.equal(isIngredientSlotEmpty(data, 'craft', 2), true)
    assert.equal(isIngredientSlotEmpty(data, 'other', 1), true)
  })
})

describe('hiddenIngredientGroupNames', () => {
  it('hides all 6 slots and diamonds 2–6 when every ref is empty', () => {
    const hidden = hiddenIngredientGroupNames({}, 'craft')
    for (let n = 1; n <= INGREDIENT_SLOT_COUNT; n++) {
      assert.equal(hidden.has(`ingredient${n}`), true)
      if (n >= 2) assert.equal(hidden.has(`diamond${n}`), true)
    }
    assert.equal(hidden.has('header'), false)
  })

  it('keeps 2 slots and the diamond between them when 2/6 refs are filled', () => {
    const data = {
      'craft.ingredient1.ref': 'fer',
      'craft.ingredient2.ref': 'bois',
    }
    const hidden = hiddenIngredientGroupNames(data, 'craft')
    assert.equal(hidden.has('ingredient1'), false)
    assert.equal(hidden.has('ingredient2'), false)
    assert.equal(hidden.has('diamond2'), false)
    assert.equal(hidden.has('ingredient3'), true)
    assert.equal(hidden.has('diamond3'), true)
    assert.equal(hidden.has('ingredient6'), true)
    assert.equal(hidden.has('diamond6'), true)
  })

  it('leaves a visual hole when slot 2 is empty but 1 and 3 are filled', () => {
    const data = {
      'craft.ingredient1.ref': 'fer',
      'craft.ingredient3.ref': 'bois',
    }
    const hidden = hiddenIngredientGroupNames(data, 'craft')
    assert.equal(hidden.has('ingredient2'), true)
    assert.equal(hidden.has('diamond2'), true)
    assert.equal(hidden.has('ingredient3'), false)
    assert.equal(hidden.has('diamond3'), false)
  })
})
