import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

globalThis.window = globalThis
globalThis.localStorage = {
  getItem() { return null },
  setItem() {},
}

let server
let useEditorStore

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  ;({ useEditorStore } = await server.ssrLoadModule('/src/stores/editor.js'))
})

after(async () => {
  await server?.close()
})

function makeElement(id, atomType) {
  return {
    id,
    kind: 'element',
    type: 'atom',
    atomType,
    params: {},
  }
}

describe('editor Plan operations', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useEditorStore()
    store.setAutoSave(false)
    store.layout = {
      id: 'layout-1',
      width_mm: 63,
      height_mm: 88,
      definition: { layers: [], dataSchema: {} },
    }
  })

  it('adds a linked Plan group and selects its marker', () => {
    const plan = store.addPlan()

    assert.ok(plan)
    assert.equal(store.layers.length, 1)
    const group = store.layers[0]
    assert.equal(group.kind, 'group')
    assert.equal(group.name, 'Plan')
    assert.deepEqual(group.children, [plan])
    assert.equal(plan.atomType, 'plan')
    assert.equal(plan.params.tileGroupId, group.id)
    assert.equal(store.selectedElementId, plan.id)
    assert.equal(store.selectedItemId, plan.id)
  })

  it('removes the whole linked group when its Plan marker is removed', () => {
    const plan = store.addPlan()
    const group = store.layers[0]
    group.children.push(makeElement('tile-1', 'image'))
    plan.params.tileGroupId = 'stale-group-id'

    store.removeItem(plan.id)

    assert.equal(store.layers.length, 0)
    assert.equal(store.selectedElementId, null)
    assert.equal(store.selectedItemId, null)
  })

  it('nudges tiles only among image siblings in a Plan group', () => {
    const plan = store.addPlan()
    const group = store.layers[0]
    group.children.push(
      makeElement('tile-a', 'image'),
      makeElement('label', 'title'),
      makeElement('tile-b', 'image'),
    )

    store.nudgeItemInStack('tile-a', 'forward')

    assert.deepEqual(group.children.map(item => item.id), [
      plan.id,
      'tile-b',
      'label',
      'tile-a',
    ])

    store.nudgeItemInStack(plan.id, 'forward')
    assert.deepEqual(group.children.map(item => item.id), [
      plan.id,
      'tile-b',
      'label',
      'tile-a',
    ])
  })
})
