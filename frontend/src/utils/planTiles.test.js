import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  tileSizeFromHeight,
  findPlanContext,
  isPlanMarker,
  nudgeableSiblingIds,
} from './planTiles.js'

describe('tileSizeFromHeight', () => {
  it('derives width from texture pixel aspect ratio', () => {
    const size = tileSizeFromHeight(10, { width_px: 200, height_px: 100 })
    assert.deepEqual(size, { width_mm: 20, height_mm: 10 })
  })

  it('falls back to square when pixel dimensions are missing', () => {
    assert.deepEqual(tileSizeFromHeight(12, {}), { width_mm: 12, height_mm: 12 })
    assert.deepEqual(tileSizeFromHeight(12, null), { width_mm: 12, height_mm: 12 })
    assert.deepEqual(tileSizeFromHeight(12, { width_px: 100 }), { width_mm: 12, height_mm: 12 })
    assert.deepEqual(tileSizeFromHeight(12, { width_px: 100, height_px: 0 }), { width_mm: 12, height_mm: 12 })
  })
})

describe('isPlanMarker', () => {
  it('detects plan atoms only', () => {
    assert.equal(isPlanMarker({ type: 'atom', atomType: 'plan' }), true)
    assert.equal(isPlanMarker({ type: 'atom', atomType: 'image' }), false)
    assert.equal(isPlanMarker(null), false)
  })
})

describe('nudgeableSiblingIds', () => {
  it('returns image sibling ids in order, skipping plan marker', () => {
    const ids = nudgeableSiblingIds([
      { id: 'plan', type: 'atom', atomType: 'plan' },
      { id: 'a', type: 'atom', atomType: 'image' },
      { id: 'b', type: 'atom', atomType: 'image' },
      { id: 't', type: 'atom', atomType: 'title' },
    ])
    assert.deepEqual(ids, ['a', 'b'])
  })
})

describe('findPlanContext', () => {
  const groupId = 'g-plan'
  const planId = 'el-plan'
  const tileId = 'el-tile'

  const layers = [
    {
      id: groupId,
      kind: 'group',
      name: 'Plan',
      children: [
        {
          id: planId,
          kind: 'element',
          type: 'atom',
          atomType: 'plan',
          params: { tileGroupId: groupId },
        },
        {
          id: tileId,
          kind: 'element',
          type: 'atom',
          atomType: 'image',
          params: { mediaId: 'm1', textureId: 1 },
        },
      ],
    },
    {
      id: 'other-group',
      kind: 'group',
      children: [
        {
          id: 'other-image',
          kind: 'element',
          type: 'atom',
          atomType: 'image',
          params: {},
        },
      ],
    },
  ]

  it('returns plan and group when the plan atom is selected', () => {
    const ctx = findPlanContext(layers, planId)
    assert.ok(ctx)
    assert.equal(ctx.planEl.id, planId)
    assert.equal(ctx.group.id, groupId)
  })

  it('returns plan and group when a linked image tile is selected', () => {
    const ctx = findPlanContext(layers, tileId)
    assert.ok(ctx)
    assert.equal(ctx.planEl.id, planId)
    assert.equal(ctx.group.id, groupId)
  })

  it('returns null for unrelated selection', () => {
    assert.equal(findPlanContext(layers, 'other-image'), null)
    assert.equal(findPlanContext(layers, groupId), null)
    assert.equal(findPlanContext(layers, null), null)
  })
})
