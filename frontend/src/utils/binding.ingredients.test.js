import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  extractBindingPaths,
  getBindablePaths,
  isContentBindingPath,
  partitionBindablePaths,
  mergeDataWithBindablePaths,
} from './binding.js'
import {
  defaultMoleculeNameInLayout,
  INGREDIENTS_FABRICATION_MOLECULE_ID,
  INGREDIENTS_DEFAULT_NAME_IN_LAYOUT,
} from './ingredientSlots.js'
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

describe('defaultMoleculeNameInLayout', () => {
  it('returns craft for ingredients molecule', () => {
    assert.equal(
      defaultMoleculeNameInLayout(INGREDIENTS_FABRICATION_MOLECULE_ID),
      INGREDIENTS_DEFAULT_NAME_IN_LAYOUT,
    )
    assert.equal(defaultMoleculeNameInLayout('mol-other'), '')
  })
})

describe('content binding helpers', () => {
  it('classifies content vs style params', () => {
    assert.equal(isContentBindingPath('craft.ingredient1.ref'), true)
    assert.equal(isContentBindingPath('craft.ingredient1q.text'), true)
    assert.equal(isContentBindingPath('craft.title.text'), true)
    assert.equal(isContentBindingPath('craft.ingredient1.fontSize'), false)
    assert.equal(isContentBindingPath('craft.ingredient1.opacity'), false)
  })

  it('partitions molecule bindable paths', () => {
    const layout = {
      layers: [{
        kind: 'element',
        type: 'molecule',
        moleculeId: INGREDIENTS_FABRICATION_MOLECULE_ID,
        nameInLayout: 'craft',
        params: {},
      }],
    }
    const molRegistry = {
      [INGREDIENTS_FABRICATION_MOLECULE_ID]: {
        definition: buildIngredientsFabricationDefinition(),
      },
    }
    const paths = getBindablePaths(layout, null, {}, molRegistry)
    const { content, advanced } = partitionBindablePaths(paths)
    assert.ok(content.some((p) => p.path === 'craft.ingredient1.ref'))
    assert.ok(content.some((p) => p.path === 'craft.title.text'))
    assert.ok(advanced.length > 0)
    assert.ok(advanced.every((p) => !isContentBindingPath(p.path)))
  })

  it('merges missing bindable paths as empty strings', () => {
    const merged = mergeDataWithBindablePaths(
      { 'craft.ingredient1.ref': 'fer' },
      [{ path: 'craft.ingredient1.ref' }, { path: 'craft.ingredient2.ref' }],
    )
    assert.equal(merged['craft.ingredient1.ref'], 'fer')
    assert.equal(merged['craft.ingredient2.ref'], '')
  })
})
