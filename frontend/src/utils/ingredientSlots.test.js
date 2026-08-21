import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  INGREDIENT_SLOT_COUNT,
  isBlankBindingValue,
  isIngredientSlotEmpty,
  hiddenIngredientGroupNames,
  spaceEvenlyXs,
  layoutIngredientElements,
  resolveIngredientContentValue,
} from './ingredientSlots.js'
import { buildIngredientsFabricationDefinition } from '../../../backend/db/ingredientsFabricationSeed.js'

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

  it('hides empty middle slot and its diamond (legacy component hole)', () => {
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

describe('spaceEvenlyXs', () => {
  it('centers a single item', () => {
    const xs = spaceEvenlyXs([10], 56)
    assert.equal(xs.length, 1)
    assert.ok(Math.abs(xs[0] - 23) < 1e-9)
  })

  it('places equal spaces for two items', () => {
    const xs = spaceEvenlyXs([7.2, 7.2], 56)
    const space = (56 - 14.4) / 3
    assert.ok(Math.abs(xs[0] - space) < 1e-9)
    assert.ok(Math.abs(xs[1] - (space + 7.2 + space)) < 1e-9)
  })

  it('layouts six equal cases across 56 mm', () => {
    const widths = Array(6).fill(7.2)
    const xs = spaceEvenlyXs(widths, 56)
    const space = (56 - 43.2) / 7
    assert.equal(xs.length, 6)
    for (let i = 0; i < 6; i++) {
      assert.ok(Math.abs(xs[i] - (space + i * (7.2 + space))) < 1e-9)
    }
  })

  it('clamps negative space to 0 (pack left)', () => {
    const xs = spaceEvenlyXs([20, 20, 20], 40)
    assert.deepEqual(xs, [0, 20, 40])
  })

  it('returns empty for empty widths', () => {
    assert.deepEqual(spaceEvenlyXs([], 56), [])
  })
})

describe('layoutIngredientElements', () => {
  const def = {
    width_mm: 56,
    height_mm: 28,
    ...buildIngredientsFabricationDefinition(),
  }

  it('keeps header and space-evenly all 6 when hideEmptySlots is false', () => {
    const els = layoutIngredientElements(def, {
      data: {},
      prefix: 'craft',
      hideEmptySlots: false,
      containerWidthMm: 56,
    })
    const cadres = els.filter((e) => e.atomType === 'cadreChanfrein')
    const diamonds = els.filter((e) => e.atomType === 'losange')
    const headerIcons = els.filter((e) => e.nameInLayout === 'headerIcon')
    assert.equal(cadres.length, 6)
    assert.equal(diamonds.length, 5)
    assert.equal(headerIcons.length, 1)

    const space = (56 - 6 * 7.2) / 7
    for (let i = 0; i < 6; i++) {
      assert.ok(Math.abs(cadres[i].x_mm - (space + i * (7.2 + space))) < 1e-6)
    }
  })

  it('with 2 filled refs: 2 cases + 1 diamond, space-evenly, header intact', () => {
    const data = {
      'craft.ingredient1.ref': 'fer',
      'craft.ingredient2.ref': 'bois',
    }
    const els = layoutIngredientElements(def, {
      data,
      prefix: 'craft',
      hideEmptySlots: true,
      containerWidthMm: 56,
    })
    const cadres = els.filter((e) => e.atomType === 'cadreChanfrein')
    const diamonds = els.filter((e) => e.atomType === 'losange')
    assert.equal(cadres.length, 2)
    assert.equal(diamonds.length, 1)
    assert.ok(els.some((e) => e.nameInLayout === 'title'))

    const space = (56 - 14.4) / 3
    assert.ok(Math.abs(cadres[0].x_mm - space) < 1e-6)
    assert.ok(Math.abs(cadres[1].x_mm - (space + 7.2 + space)) < 1e-6)

    const leftEdge = cadres[0].x_mm + 7.2
    const rightEdge = cadres[1].x_mm
    const mid = (leftEdge + rightEdge) / 2
    assert.ok(Math.abs(diamonds[0].x_mm - (mid - 0.8)) < 1e-6)
  })

  it('does not emit a diamond when only slot 2 is filled', () => {
    const data = { 'craft.ingredient2.ref': 'bois' }
    const els = layoutIngredientElements(def, {
      data,
      prefix: 'craft',
      hideEmptySlots: true,
      containerWidthMm: 56,
    })
    assert.equal(els.filter((e) => e.atomType === 'cadreChanfrein').length, 1)
    assert.equal(els.filter((e) => e.atomType === 'losange').length, 0)
  })

  it('places one diamond between slots 1 and 3 when 2 is empty (reflow)', () => {
    const data = {
      'craft.ingredient1.ref': 'fer',
      'craft.ingredient3.ref': 'bois',
    }
    const els = layoutIngredientElements(def, {
      data,
      prefix: 'craft',
      hideEmptySlots: true,
      containerWidthMm: 56,
    })
    assert.equal(els.filter((e) => e.atomType === 'cadreChanfrein').length, 2)
    assert.equal(els.filter((e) => e.atomType === 'losange').length, 1)
  })

  it('does not mutate the definition', () => {
    const before = JSON.stringify(def)
    layoutIngredientElements(def, {
      data: { 'craft.ingredient1.ref': 'fer' },
      prefix: 'craft',
      hideEmptySlots: true,
      containerWidthMm: 56,
    })
    assert.equal(JSON.stringify(def), before)
  })
})

describe('resolveIngredientContentValue', () => {
  const def = buildIngredientsFabricationDefinition()

  it('returns molecule defaults when data has no key', () => {
    assert.equal(
      resolveIngredientContentValue(def, null, 'craft', 'title.text'),
      'INGRÉDIENTS DE FABRICATION',
    )
    assert.equal(
      resolveIngredientContentValue(def, {}, 'craft', 'ingredient1.ref'),
      '',
    )
  })

  it('lets data take precedence when key is present', () => {
    const data = {
      'craft.title.text': 'Custom',
      'craft.ingredient1.ref': 'fer',
    }
    assert.equal(
      resolveIngredientContentValue(def, data, 'craft', 'title.text'),
      'Custom',
    )
    assert.equal(
      resolveIngredientContentValue(def, data, 'craft', 'ingredient1.ref'),
      'fer',
    )
    assert.equal(
      resolveIngredientContentValue(def, { 'craft.title.text': '' }, 'craft', 'title.text'),
      '',
    )
  })
})
