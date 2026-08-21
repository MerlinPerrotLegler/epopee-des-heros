import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractBindingPaths, getBindablePaths } from './binding.js'
import { buildIngredientsFabricationDefinition } from '../../../backend/db/ingredientsFabricationSeed.js'

describe('extractBindingPaths — component internals (TSD-027)', () => {
  const registry = {
    'cmp-ingredients-fabrication': {
      definition: buildIngredientsFabricationDefinition(),
    },
  }

  it('extracts craft.ingredientN.ref / ingredientNq.text and header paths', () => {
    const layout = {
      layers: [{
        kind: 'element',
        type: 'component',
        componentId: 'cmp-ingredients-fabrication',
        nameInLayout: 'craft',
        params: {},
      }],
    }
    const paths = extractBindingPaths(layout, registry).map((p) => p.path)
    assert.ok(paths.includes('craft.ingredient1.ref'))
    assert.ok(paths.includes('craft.ingredient1q.text'))
    assert.ok(paths.includes('craft.ingredient6.ref'))
    assert.ok(paths.includes('craft.ingredient6q.text'))
    assert.ok(paths.includes('craft.title.text'))
    assert.ok(paths.includes('craft.subtitle.text'))
    assert.ok(paths.includes('craft.headerIcon.ref'))
    assert.equal(paths.some((p) => p.includes('diamond')), false)
  })
})

describe('getBindablePaths — component registry', () => {
  it('lists nested component paths when a registry is provided', () => {
    const layout = {
      layers: [{
        kind: 'element',
        type: 'component',
        componentId: 'cmp-ingredients-fabrication',
        nameInLayout: 'craft',
        params: {},
      }],
    }
    const registry = {
      'cmp-ingredients-fabrication': {
        definition: buildIngredientsFabricationDefinition(),
      },
    }
    const paths = getBindablePaths(layout, null, registry).map((p) => p.path)
    assert.ok(paths.includes('craft.ingredient1.ref'))
  })
})

describe('extractBindingPaths — molecule internals', () => {
  it('extracts craft.* paths from a placed molecule', () => {
    const layout = {
      layers: [{
        kind: 'element',
        type: 'molecule',
        moleculeId: 'mol-ingredients-fabrication',
        nameInLayout: 'craft',
        params: {},
      }],
    }
    const molRegistry = {
      'mol-ingredients-fabrication': {
        definition: buildIngredientsFabricationDefinition(),
      },
    }
    const paths = extractBindingPaths(layout, {}, molRegistry).map((p) => p.path)
    assert.ok(paths.includes('craft.ingredient1.ref'))
    assert.ok(paths.includes('craft.ingredient1q.text'))
  })
})
