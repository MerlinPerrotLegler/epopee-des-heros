# Layer keyboard shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ctrl/Cmd+D duplique le calque sélectionné (élément ou groupe) ; Delete/Backspace le supprime via `removeItem`.

**Architecture:** Helper pur `cloneLayerItem` (nouveaux IDs + offset mm) testé en unit ; store `duplicateItem` l’utilise et remplace la logique de `duplicateElement` ; raccourcis branchés dans `EditorView` et `ComponentEditorView`.

**Tech Stack:** Vue 3 Composition API, Pinia, ESM, tests Node (`node --test` / assert).

**Spec:** `docs/superpowers/specs/2026-07-19-layer-shortcuts-design.md`

## Global Constraints

- Cible = `selectedItemId` (élément **ou** groupe)
- Delete **et** Backspace → `removeItem` (pas de confirmation)
- Ctrl/Cmd+D → `duplicateItem` ; `preventDefault`
- Ignorer si focus INPUT / TEXTAREA / SELECT
- `assertEditable()` / readOnly → no-op
- Élément : `+2 mm` x/y ; `nameInLayout` → `_copy` si non vide
- Groupe : clone profond, nouveaux IDs partout ; offset `+2 mm` sur chaque enfant élément
- Pas de TypeScript ; ESM ; alias `@/`
- Commit uniquement si l’utilisateur le demande (sinon skip les steps Commit) — **sauf** si exécution Subagent-Driven choisie explicitement

---

## File map

| Path | Responsibility |
|------|----------------|
| `frontend/src/utils/cloneLayerItem.js` | Clone pur + re-ID + offset |
| `frontend/src/utils/cloneLayerItem.test.js` | Tests helper |
| `frontend/src/stores/editor.js` | `duplicateItem` ; `duplicateElement` délègue |
| `frontend/src/views/EditorView.vue` | Raccourcis layout |
| `frontend/src/views/ComponentEditorView.vue` | Raccourcis composant |
| `specs/WORKPLAN.md` | Journal session |

---

### Task 1: Helper `cloneLayerItem`

**Files:**
- Create: `frontend/src/utils/cloneLayerItem.js`
- Create: `frontend/src/utils/cloneLayerItem.test.js`

**Interfaces:**
- Produces:
  ```js
  /**
   * @param {object} item  element or group layer node
   * @param {{ offsetMm?: number }} [opts]
   * @returns {object} deep clone with new ids; elements offset by offsetMm (default 2)
   */
  export function cloneLayerItem(item, opts)
  ```

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { cloneLayerItem } from './cloneLayerItem.js'

describe('cloneLayerItem', () => {
  it('clones element with new id and +2mm offset', () => {
    const el = {
      id: 'a', kind: 'element', type: 'text',
      x_mm: 10, y_mm: 20, nameInLayout: 'title',
      params: { text: 'Hi' },
    }
    const c = cloneLayerItem(el)
    assert.notEqual(c.id, 'a')
    assert.equal(c.x_mm, 12)
    assert.equal(c.y_mm, 22)
    assert.equal(c.nameInLayout, 'title_copy')
    assert.equal(c.params.text, 'Hi')
    assert.equal(el.x_mm, 10) // original untouched
  })

  it('leaves empty nameInLayout empty', () => {
    const el = { id: 'a', kind: 'element', x_mm: 0, y_mm: 0, nameInLayout: '' }
    const c = cloneLayerItem(el)
    assert.equal(c.nameInLayout, '')
  })

  it('deep-clones group with new ids and offsets child elements', () => {
    const g = {
      id: 'g1', kind: 'group', name: 'G',
      children: [
        { id: 'e1', kind: 'element', x_mm: 1, y_mm: 2, nameInLayout: 'a' },
        {
          id: 'g2', kind: 'group', name: 'inner',
          children: [
            { id: 'e2', kind: 'element', x_mm: 5, y_mm: 6, nameInLayout: '' },
          ],
        },
      ],
    }
    const c = cloneLayerItem(g)
    assert.notEqual(c.id, 'g1')
    assert.equal(c.kind, 'group')
    assert.notEqual(c.children[0].id, 'e1')
    assert.equal(c.children[0].x_mm, 3)
    assert.equal(c.children[0].y_mm, 4)
    assert.equal(c.children[0].nameInLayout, 'a_copy')
    assert.notEqual(c.children[1].id, 'g2')
    assert.notEqual(c.children[1].children[0].id, 'e2')
    assert.equal(c.children[1].children[0].x_mm, 7)
    assert.equal(c.children[1].children[0].y_mm, 8)
    const ids = [c.id, c.children[0].id, c.children[1].id, c.children[1].children[0].id]
    assert.equal(new Set(ids).size, 4)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd frontend && node --test src/utils/cloneLayerItem.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```js
// frontend/src/utils/cloneLayerItem.js

function newId() {
  return crypto.randomUUID()
}

function offsetElement(node, offsetMm) {
  if (typeof node.x_mm === 'number') node.x_mm += offsetMm
  if (typeof node.y_mm === 'number') node.y_mm += offsetMm
  if (node.nameInLayout) node.nameInLayout = `${node.nameInLayout}_copy`
}

/**
 * Deep-clone a layer tree node (element or group), assigning new UUIDs.
 * Element nodes (and nested elements) are offset by `offsetMm` (default 2).
 *
 * @param {object} item
 * @param {{ offsetMm?: number }} [opts]
 * @returns {object}
 */
export function cloneLayerItem(item, opts = {}) {
  const offsetMm = opts.offsetMm ?? 2
  const clone = JSON.parse(JSON.stringify(item))

  function walk(node) {
    node.id = newId()
    if (node.kind === 'group') {
      for (const child of node.children || []) walk(child)
    } else {
      offsetElement(node, offsetMm)
    }
  }

  walk(clone)
  return clone
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd frontend && node --test src/utils/cloneLayerItem.test.js`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit** (si demandé / SDD)

```bash
git add frontend/src/utils/cloneLayerItem.js frontend/src/utils/cloneLayerItem.test.js
git commit -m "feat: add cloneLayerItem helper for layer duplicate"
```

---

### Task 2: Store `duplicateItem`

**Files:**
- Modify: `frontend/src/stores/editor.js`

**Interfaces:**
- Consumes: `cloneLayerItem(item, { offsetMm })`
- Produces: `duplicateItem(id) → clone | undefined` ; `duplicateElement(id)` délègue à `duplicateItem`

- [ ] **Step 1: Import + replace duplicateElement**

At top of `editor.js`, add:

```js
import { cloneLayerItem } from '@/utils/cloneLayerItem.js'
```

Replace existing `duplicateElement` with:

```js
function duplicateItem(id) {
  if (!assertEditable()) return
  const parentArr = _findParentArray(definition.value.layers, id)
  if (!parentArr) return
  const item = parentArr.find(i => i.id === id)
  if (!item) return
  _snapshot()
  const clone = cloneLayerItem(item)
  const idx = parentArr.indexOf(item)
  parentArr.splice(idx + 1, 0, clone)
  selectedItemId.value = clone.id
  if (clone.kind === 'group') {
    selectedElementId.value = null
  } else {
    selectedElementId.value = clone.id
  }
  markDirty()
  return clone
}

function duplicateElement(elementId) {
  return duplicateItem(elementId)
}
```

- [ ] **Step 2: Export `duplicateItem`**

In the store `return { ... }`:

```js
addElement, updateElement, removeElement, duplicateElement, duplicateItem,
```

- [ ] **Step 3: Smoke** — Vite HMR loads without error.

- [ ] **Step 4: Commit** (si demandé / SDD)

```bash
git add frontend/src/stores/editor.js
git commit -m "feat(editor): duplicateItem for elements and groups"
```

---

### Task 3: Wire shortcuts in editor views

**Files:**
- Modify: `frontend/src/views/EditorView.vue`
- Modify: `frontend/src/views/ComponentEditorView.vue`

**Interfaces:**
- Consumes: `store.duplicateItem`, `store.removeItem`, `store.selectedItemId`

- [ ] **Step 1: Update `EditorView.vue` `onKeyDown`**

```js
function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!store.readOnly && (store.mode !== 'layout' || store.layoutLockHeld)) {
      store.saveDefinition()
    }
  }

  if (isInputFocused()) return

  if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
    if (store.selectedItemId) {
      e.preventDefault()
      store.duplicateItem(store.selectedItemId)
    }
    return
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedItemId) {
    e.preventDefault()
    store.removeItem(store.selectedItemId)
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    if (store.selectedElementId) {
      e.preventDefault()
      const input = document.querySelector('[data-param-key="text"]')
      if (input) { input.focus(); input.select() }
    }
  }
}
```

- [ ] **Step 2: Update `ComponentEditorView.vue` `onKeyDown`**

```js
function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    store.saveDefinition()
  }

  if (isInputFocused()) return

  if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
    if (store.selectedItemId) {
      e.preventDefault()
      store.duplicateItem(store.selectedItemId)
    }
    return
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedItemId) {
    e.preventDefault()
    store.removeItem(store.selectedItemId)
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    if (store.selectedElementId) {
      e.preventDefault()
      const input = document.querySelector('[data-param-key="text"]')
      if (input) { input.focus(); input.select() }
    }
  }
}
```

- [ ] **Step 3: Manual QA (spec §6)**

1. Élément → Cmd/Ctrl+D → clone +2 mm sélectionné
2. Groupe → Cmd/Ctrl+D → enfants nouveaux IDs, groupe sélectionné
3. Delete / Backspace → suppression
4. Focus champ propriétés → raccourcis ignorés

- [ ] **Step 4: Commit** (si demandé / SDD)

```bash
git add frontend/src/views/EditorView.vue frontend/src/views/ComponentEditorView.vue
git commit -m "feat(editor): Ctrl+D duplicate and Delete/Backspace remove layers"
```

---

### Task 4: WORKPLAN journal

**Files:**
- Modify: `specs/WORKPLAN.md`

- [ ] **Step 1: Add journal line** at top of section f:

```markdown
| 2026-07-19 | Raccourcis calques : Ctrl/Cmd+D duplique `selectedItemId` (élément/groupe) ; Delete/Backspace → `removeItem` ; helper `cloneLayerItem`. |
```

- [ ] **Step 2: Commit** (si demandé / SDD)

```bash
git add specs/WORKPLAN.md
git commit -m "docs: WORKPLAN session layer keyboard shortcuts"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Helper clone + re-ID + offset | 1 |
| `duplicateItem` + `duplicateElement` délègue | 2 |
| Ctrl/Cmd+D | 3 |
| Delete + Backspace → `removeItem` | 3 |
| Ignore inputs | 3 |
| EditorView + ComponentEditorView | 3 |
| WORKPLAN | 4 |
