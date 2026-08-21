import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

globalThis.window = globalThis
globalThis.localStorage = {
  getItem() { return null },
  setItem() {},
}

let server
let useEditorStore

before(async () => {
  server = await createServer({
    root: frontendRoot,
    configFile: join(frontendRoot, 'vite.config.js'),
    server: { middlewareMode: true },
    appType: 'custom',
  })
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

describe('editor multi-selection', () => {
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

  function addAtom(id, x = 0, y = 0) {
    store.layout.definition.layers.push({
      id,
      kind: 'element',
      type: 'atom',
      atomType: 'title',
      name: id,
      locked: false,
      visible: true,
      opacity: 1,
      x_mm: x,
      y_mm: y,
      width_mm: 10,
      height_mm: 5,
      params: {},
    })
    return id
  }

  it('toggles items with additive selectItem', () => {
    addAtom('a')
    addAtom('b')
    addAtom('c')
    store.selectItem('a')
    store.selectItem('b', { additive: true })
    assert.deepEqual(store.selectedItemIds, ['a', 'b'])
    assert.equal(store.selectedItemId, 'b')
    assert.equal(store.selectedElementId, 'b')

    store.selectItem('a', { additive: true })
    assert.deepEqual(store.selectedItemIds, ['b'])
    assert.equal(store.selectedItemId, 'b')
  })

  it('groups selected items and moves them together', () => {
    addAtom('a', 1, 2)
    addAtom('b', 4, 6)
    addAtom('c', 10, 10)
    store.selectItem('a')
    store.selectItem('b', { additive: true })

    const group = store.groupSelectedItems()
    assert.ok(group)
    assert.equal(group.kind, 'group')
    assert.deepEqual(group.children.map(i => i.id), ['a', 'b'])
    assert.equal(store.layers.length, 2)
    assert.equal(store.layers[0].id, group.id)
    assert.equal(store.layers[1].id, 'c')
    assert.deepEqual(store.selectedItemIds, [group.id])

    store.moveSelected(3, 5)
    assert.equal(group.children[0].x_mm, 4)
    assert.equal(group.children[0].y_mm, 7)
    assert.equal(group.children[1].x_mm, 7)
    assert.equal(group.children[1].y_mm, 11)
    assert.equal(store.layers[1].x_mm, 10)
  })

  it('moveSelected shifts every selected root without double-moving grouped children', () => {
    addAtom('a', 0, 0)
    addAtom('b', 2, 0)
    store.selectItem('a')
    store.selectItem('b', { additive: true })
    store.moveSelected(1, 0)
    assert.equal(store.layers[0].x_mm, 1)
    assert.equal(store.layers[1].x_mm, 3)
  })

  it('does not group a single item', () => {
    addAtom('a')
    store.selectItem('a')
    assert.equal(store.groupSelectedItems(), null)
    assert.equal(store.layers[0].kind, 'element')
  })
})

describe('editor snap', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useEditorStore()
    store.setAutoSave(false)
    store.snapGrid = 1
  })

  it('rounds to snapGrid while the grid is on', () => {
    store.showGrid = true
    assert.equal(store.snap(3.6), 4)
  })

  it('does not snap when the grid is off', () => {
    store.showGrid = false
    assert.equal(store.snap(3.6), 3.6)
  })
})

describe('editor applyLayoutMeta', () => {
  it('updates name and size without touching definition', () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAutoSave(false)
    const definition = { layers: [{ id: 'el-1', kind: 'element' }], dataSchema: {} }
    store.layout = {
      id: 'cmp-1',
      name: 'Old',
      width_mm: 30,
      height_mm: 20,
      card_type: null,
      definition,
    }

    store.applyLayoutMeta({ name: 'New', width_mm: 40, height_mm: 25 })

    assert.equal(store.layout.name, 'New')
    assert.equal(store.layout.width_mm, 40)
    assert.equal(store.layout.height_mm, 25)
    assert.deepEqual(store.layout.definition, definition)
    assert.equal(store.layout.definition.layers[0].id, 'el-1')
  })

  it('ignores omitted keys (name-only patch)', () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAutoSave(false)
    store.layout = {
      id: 'cmp-1',
      name: 'Old',
      width_mm: 30,
      height_mm: 20,
      definition: { layers: [], dataSchema: {} },
    }

    store.applyLayoutMeta({ name: 'Renamed' })

    assert.equal(store.layout.name, 'Renamed')
    assert.equal(store.layout.width_mm, 30)
    assert.equal(store.layout.height_mm, 20)
  })
})
