// frontend/src/utils/alignmentGuides.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { computeAlignmentGuides, VISIBILITY_MM } from './alignmentGuides.js'

const ALL_ON = {
  layoutCenters: true,
  elementEdges: true,
  elementCenters: true,
  margins: true,
  frames: true,
}

function el(id, x, y, w, h) {
  return { id, x_mm: x, y_mm: y, width_mm: w, height_mm: h }
}

describe('computeAlignmentGuides', () => {
  it('returns empty when all options off', () => {
    const guides = computeAlignmentGuides({
      active: el('a', 10, 10, 10, 10),
      candidates: [el('b', 30, 10, 10, 10)],
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { layoutCenters: false, elementEdges: false, elementCenters: false, margins: false, frames: false },
    })
    assert.deepEqual(guides, [])
  })

  it('emits strong layout center when active cx matches mid within snapGrid', () => {
    // layoutW/2 = 31.5 ; active cx = 31.5
    const guides = computeAlignmentGuides({
      active: el('a', 26.5, 10, 10, 10),
      candidates: [],
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { ...ALL_ON, elementEdges: false, elementCenters: false, margins: false, frames: false },
    })
    const vert = guides.filter(g => g.kind === 'line' && g.axis === 'x' && g.source === 'layout')
    assert.equal(vert.length, 1)
    assert.equal(vert[0].position_mm, 31.5)
    assert.equal(vert[0].strong, true)
  })

  it('emits thin line when within VISIBILITY_MM but not strong', () => {
    // mid = 31.5 ; active left = 29 → |Δ| = 2.5 ≤ 3, ≥ snapGrid
    const guides = computeAlignmentGuides({
      active: el('a', 29, 10, 10, 10),
      candidates: [],
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { ...ALL_ON, elementEdges: false, elementCenters: false, margins: false, frames: false },
    })
    const vert = guides.find(g => g.kind === 'line' && g.axis === 'x' && g.source === 'layout')
    assert.ok(vert)
    assert.equal(vert.strong, false)
  })

  it('no layout center line when farther than VISIBILITY_MM', () => {
    const guides = computeAlignmentGuides({
      active: el('a', 0, 10, 10, 10), // cx=5, mid=31.5, Δ≈26.5
      candidates: [],
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { ...ALL_ON, elementEdges: false, elementCenters: false, margins: false, frames: false },
    })
    assert.equal(guides.filter(g => g.source === 'layout').length, 0)
  })

  it('emits edge alignment line between elements', () => {
    const guides = computeAlignmentGuides({
      active: el('a', 10, 10, 10, 10),
      candidates: [el('b', 10, 40, 8, 8)], // same left=10
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { ...ALL_ON, layoutCenters: false, elementCenters: false, margins: false, frames: false },
    })
    const line = guides.find(g => g.kind === 'line' && g.axis === 'x' && g.source === 'edge')
    assert.ok(line)
    assert.equal(line.position_mm, 10)
    assert.equal(line.strong, true)
  })

  it('emits frames for candidates when frames on', () => {
    const b = el('b', 20, 20, 5, 5)
    const guides = computeAlignmentGuides({
      active: el('a', 0, 0, 10, 10),
      candidates: [b],
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { ...ALL_ON, layoutCenters: false, elementEdges: false, elementCenters: false, margins: false },
    })
    assert.equal(guides.filter(g => g.kind === 'frame').length, 1)
    assert.equal(guides[0].x_mm, 20)
  })

  it('emits horizontal and vertical nearest margins', () => {
    // A at (10,10)-(20,20) ; B to the right at (30,10)-(40,20) → gap right = 10
    // C below at (10,30)-(20,40) → gap bottom = 10
    const guides = computeAlignmentGuides({
      active: el('a', 10, 10, 10, 10),
      candidates: [el('b', 30, 10, 10, 10), el('c', 10, 30, 10, 10)],
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { ...ALL_ON, layoutCenters: false, elementEdges: false, elementCenters: false, frames: false },
    })
    const margins = guides.filter(g => g.kind === 'margin')
    assert.ok(margins.some(m => m.side === 'right' && m.distance_mm === 10))
    assert.ok(margins.some(m => m.side === 'bottom' && m.distance_mm === 10))
  })

  it('marks equal margins when L/R gaps match within snapGrid', () => {
    // A centered between B(left) and C(right) with gap 5 each
    const guides = computeAlignmentGuides({
      active: el('a', 20, 10, 10, 10),
      candidates: [el('b', 5, 10, 10, 10), el('c', 35, 10, 10, 10)],
      layoutW: 63, layoutH: 88, snapGrid: 1,
      options: { ...ALL_ON, layoutCenters: false, elementEdges: false, elementCenters: false, frames: false },
    })
    const left = guides.find(g => g.kind === 'margin' && g.side === 'left')
    const right = guides.find(g => g.kind === 'margin' && g.side === 'right')
    assert.ok(left && right)
    assert.equal(left.equal, true)
    assert.equal(right.equal, true)
  })
})
