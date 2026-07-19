import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveEffectiveAtomParams } from './effectiveAtomParams.js'

describe('resolveEffectiveAtomParams', () => {
  it('applies global fallbacks and fixed atom params to binding-resolved params', () => {
    const config = {
      bgColor: '#123456',
      atomParamRules: {
        trakPath: {
          cellSize: { fixedEnabled: true, fixedValue: 0.2 },
          segments: {
            fixedEnabled: true,
            fixedValue: [{ direction: 'down', count: 4 }],
          },
        },
      },
    }

    assert.deepEqual(resolveEffectiveAtomParams({
      atomType: 'trakPath',
      params: {
        bgColor: null,
        cellSize: 0.1,
        segments: [{ direction: 'right', count: 2 }],
      },
      config,
    }), {
      bgColor: '#123456',
      cellSize: 0.2,
      segments: [{ direction: 'down', count: 4 }],
    })
  })

  it('preserves non-null local params when no atom rule fixes them', () => {
    assert.deepEqual(resolveEffectiveAtomParams({
      atomType: 'trakPath',
      params: { cellSize: 0.15, textColor: '#ffffff' },
      config: { cellSize: 0.25, textColor: '#000000' },
    }), {
      cellSize: 0.15,
      textColor: '#ffffff',
    })
  })
})
