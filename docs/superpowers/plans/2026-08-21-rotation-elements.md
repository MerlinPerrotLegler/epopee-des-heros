# Rotation des éléments (TSD-030) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une poignée de rotation façon Figma sur l’élément primaire du canvas, avec Shift 15° et rotation multi-sélection autour du centre du set.

**Architecture:** Toute la géométrie vit dans un helper pur `elementRotation.js` (angles, snap, orbit). `useDragAndDrop` orchestre le geste (snapshot au mousedown, Δ appliqué depuis les positions de départ). Le store n’ajoute pas d’action dédiée : on étend `getDragStartPositions` et on réutilise `updateElement`. Le rendu CSS `rotate()` existe déjà.

**Tech Stack:** Vue 3 Composition API, Pinia, ESM, tests Node (`node --test` / `node:assert/strict`).

**Spec:** `specs/TSD-030-rotation-elements.md`

## Global Constraints

- Mesures canvas en **mm** ; pointeur via `clientPointToCardMm` (TSD-025) — jamais `mm × zoom → px`
- `rotation` en degrés CSS (horaire positif, `transform-origin` 50% 50%)
- Plage stockée : `normalizeDeg` → `(-180, 180]`
- Poignées / toolbar : uniquement sur `selectedElementId` (TSD-028) ; pas de boîte englobante visible
- Resize axes locaux : **hors scope** — ne pas modifier `onResizeMove`
- Pas de TypeScript ; alias `@/`
- Commit **uniquement** si l’utilisateur le demande (sinon skip les steps Commit)
- Mettre à jour `specs/WORKPLAN.md` et le statut TSD-030 en fin d’implémentation

---

## File map

| Path | Responsibility |
|------|----------------|
| `frontend/src/utils/elementRotation.js` | Géométrie pure : normalize, snap, pivot, orbit, Δ de geste |
| `frontend/src/utils/elementRotation.test.js` | Tests Node assert (couverts par `npm test`) |
| `frontend/src/stores/editor.js` | `getDragStartPositions` enrichi (`width_mm`, `height_mm`, `rotation`) |
| `frontend/src/composables/useDragAndDrop.js` | `startRotate` / move / end + libellé d’angle |
| `frontend/src/components/editor/EditorCanvas.vue` | Poignée + trait + badge écran ; double-clic → 0° |
| `frontend/src/components/editor/PropertiesPanel.vue` | Normaliser `rotation` à la saisie |
| `specs/TSD-030-rotation-elements.md` | Status → Done + critères cochés en fin d’impl |
| `specs/WORKPLAN.md` | Journal + case TSD-030 implémenté |

**Inchangés (déjà `rotate` CSS) :** `CardPreview.vue`, `ComponentRenderer.vue`. Vérifier au Task 5, ne pas retoucher sauf régression.

---

### Task 1: Helper `elementRotation` + tests

**Files:**
- Create: `frontend/src/utils/elementRotation.js`
- Create: `frontend/src/utils/elementRotation.test.js`

**Interfaces:**
- Produces (signatures exactes, utilisées par les tasks suivantes) :

```js
normalizeDeg(deg: number) → number
snapDeg(deg: number, step?: number) → number   // défaut step = 15
shortestAngleDelta(fromDeg: number, toDeg: number) → number  // (-180, 180]
elementCenter(el: { x_mm, y_mm, width_mm, height_mm }) → { x: number, y: number }
selectionPivot(els: el[]) → { x: number, y: number }  // centre AABB des centres ; [] → { x: 0, y: 0 }
pointerAngleDeg(x_mm: number, y_mm: number, cx: number, cy: number) → number
rotatePoint(x: number, y: number, cx: number, cy: number, deltaDeg: number) → { x, y }
applyRotationDelta(els: el[], deltaDeg: number, pivot: { x, y }) → Array<{ id, x_mm, y_mm, rotation }>
gestureAppliedDelta(startRotation: number, pointerDeltaDeg: number, shiftKey: boolean) → number
resetAppliedDelta(startRotation: number) → number  // plus court chemin vers 0°
```

- `el` pour `applyRotationDelta` : `{ id, x_mm, y_mm, width_mm, height_mm, rotation }`
- `rotation` absente / non finie → `0`
- `applyRotationDelta` : orbit du **centre** autour de `pivot`, puis `x_mm = cx' - w/2`, `y_mm = cy' - h/2`, `rotation = normalizeDeg(start + deltaDeg)`
- Un élément dont le centre == pivot : `x_mm` / `y_mm` inchangés (tolérance float)
- `gestureAppliedDelta` : `target = startRotation + pointerDeltaDeg`, si `shiftKey` alors `target = snapDeg(target)`, retourne `target - startRotation` **sans** normaliser le Δ (l’orbit a besoin du Δ brut)
- Matrice d’orbit (degrés CSS, y vers le bas) :

```
rad = deltaDeg * π/180
x' = cx + dx·cos − dy·sin
y' = cy + dx·sin + dy·cos
```

- [ ] **Step 1: Écrire les tests (fail attendu)**

```js
// frontend/src/utils/elementRotation.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeDeg,
  snapDeg,
  shortestAngleDelta,
  elementCenter,
  selectionPivot,
  pointerAngleDeg,
  rotatePoint,
  applyRotationDelta,
  gestureAppliedDelta,
  resetAppliedDelta,
} from './elementRotation.js'

const box = (id, x, y, w = 10, h = 10, rotation = 0) => ({
  id, x_mm: x, y_mm: y, width_mm: w, height_mm: h, rotation,
})

describe('normalizeDeg', () => {
  it('maps 190 to -170 and -190 to 170', () => {
    assert.equal(normalizeDeg(190), -170)
    assert.equal(normalizeDeg(-190), 170)
  })
  it('keeps 180 and maps -180 to 180', () => {
    assert.equal(normalizeDeg(180), 180)
    assert.equal(normalizeDeg(-180), 180)
  })
  it('maps 0 and 360 to 0', () => {
    assert.equal(normalizeDeg(0), 0)
    assert.equal(normalizeDeg(360), 0)
  })
  it('returns 0 for non-finite', () => {
    assert.equal(normalizeDeg(NaN), 0)
  })
})

describe('snapDeg', () => {
  it('snaps 37 to 30 and 38 to 45', () => {
    assert.equal(snapDeg(37), 30)
    assert.equal(snapDeg(38), 45)
  })
})

describe('shortestAngleDelta', () => {
  it('crosses the branch cut without a 360 jump', () => {
    assert.equal(shortestAngleDelta(170, -170), 20)
    assert.equal(shortestAngleDelta(-170, 170), -20)
  })
})

describe('pointerAngleDeg', () => {
  it('is 0 to the right, 90 below, -90 above (y-down / CSS clockwise)', () => {
    assert.equal(pointerAngleDeg(15, 5, 5, 5), 0)
    assert.equal(pointerAngleDeg(5, 15, 5, 5), 90)
    assert.equal(pointerAngleDeg(5, -5, 5, 5), -90)
  })
})

describe('applyRotationDelta — one element', () => {
  it('changes rotation only; x_mm/y_mm stay put', () => {
    const el = box('a', 0, 0)
    const pivot = elementCenter(el)
    const out = applyRotationDelta([el], 45, pivot)
    assert.equal(out.length, 1)
    assert.equal(out[0].id, 'a')
    assert.equal(out[0].rotation, 45)
    assert.ok(Math.abs(out[0].x_mm - 0) < 1e-9)
    assert.ok(Math.abs(out[0].y_mm - 0) < 1e-9)
  })
})

describe('applyRotationDelta — two elements', () => {
  it('orbits centers around the selection pivot and adds the same Δ', () => {
    const a = box('a', 0, 0)
    const b = box('b', 20, 0)
    const pivot = selectionPivot([a, b])
    assert.deepEqual(pivot, { x: 15, y: 5 })
    const out = applyRotationDelta([a, b], 90, pivot)
    const byId = Object.fromEntries(out.map(u => [u.id, u]))
    assert.equal(byId.a.rotation, 90)
    assert.equal(byId.b.rotation, 90)
    assert.ok(Math.abs(byId.a.x_mm - 10) < 1e-9)
    assert.ok(Math.abs(byId.a.y_mm - (-10)) < 1e-9)
    assert.ok(Math.abs(byId.b.x_mm - 10) < 1e-9)
    assert.ok(Math.abs(byId.b.y_mm - 10) < 1e-9)
  })
})

describe('gestureAppliedDelta', () => {
  it('returns raw Δ without normalizing (orbit needs it)', () => {
    assert.equal(gestureAppliedDelta(170, 20, false), 20)
  })
  it('snaps the absolute target when Shift is held', () => {
    assert.equal(gestureAppliedDelta(0, 37, true), 30)
    assert.equal(gestureAppliedDelta(0, 38, true), 45)
  })
})

describe('resetAppliedDelta', () => {
  it('takes the shortest path to 0', () => {
    assert.equal(resetAppliedDelta(45), -45)
    assert.equal(resetAppliedDelta(0), 0)
    assert.equal(resetAppliedDelta(-90), 90)
  })
})
```

- [ ] **Step 2: Lancer les tests — doivent échouer**

Run: `node --test frontend/src/utils/elementRotation.test.js`

Expected: FAIL (`Cannot find module` ou exports manquants)

- [ ] **Step 3: Implémenter le helper**

```js
// frontend/src/utils/elementRotation.js

export function normalizeDeg(deg) {
  if (!Number.isFinite(deg)) return 0
  let d = deg % 360
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

export function snapDeg(deg, step = 15) {
  if (!Number.isFinite(deg) || !step) return 0
  return Math.round(deg / step) * step
}

export function shortestAngleDelta(fromDeg, toDeg) {
  let d = toDeg - fromDeg
  while (d > 180) d -= 360
  while (d <= -180) d += 360
  return d
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function elementCenter(el) {
  const w = num(el.width_mm)
  const h = num(el.height_mm)
  return {
    x: num(el.x_mm) + w / 2,
    y: num(el.y_mm) + h / 2,
  }
}

export function selectionPivot(els) {
  if (!els?.length) return { x: 0, y: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of els) {
    const c = elementCenter(el)
    if (c.x < minX) minX = c.x
    if (c.y < minY) minY = c.y
    if (c.x > maxX) maxX = c.x
    if (c.y > maxY) maxY = c.y
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}

export function pointerAngleDeg(x_mm, y_mm, cx, cy) {
  return Math.atan2(y_mm - cy, x_mm - cx) * (180 / Math.PI)
}

export function rotatePoint(x, y, cx, cy, deltaDeg) {
  const rad = deltaDeg * (Math.PI / 180)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

export function applyRotationDelta(els, deltaDeg, pivot) {
  const out = []
  for (const el of els) {
    const w = num(el.width_mm)
    const h = num(el.height_mm)
    const c = elementCenter(el)
    const c2 = rotatePoint(c.x, c.y, pivot.x, pivot.y, deltaDeg)
    out.push({
      id: el.id,
      x_mm: c2.x - w / 2,
      y_mm: c2.y - h / 2,
      rotation: normalizeDeg(num(el.rotation) + deltaDeg),
    })
  }
  return out
}

export function gestureAppliedDelta(startRotation, pointerDeltaDeg, shiftKey) {
  const rawTarget = startRotation + pointerDeltaDeg
  const target = shiftKey ? snapDeg(rawTarget, 15) : rawTarget
  return target - startRotation
}

export function resetAppliedDelta(startRotation) {
  return shortestAngleDelta(num(startRotation), 0)
}
```

- [ ] **Step 4: Relancer les tests — doivent passer**

Run: `node --test frontend/src/utils/elementRotation.test.js`

Expected: PASS (tous les `it` verts)

- [ ] **Step 5: Commit** (skip si l’utilisateur n’a pas demandé)

```bash
git add frontend/src/utils/elementRotation.js frontend/src/utils/elementRotation.test.js
git commit -m "$(cat <<'EOF'
test: helper de rotation d’éléments (normalize, snap, orbit)

EOF
)"
```

---

### Task 2: Enrichir `getDragStartPositions`

**Files:**
- Modify: `frontend/src/stores/editor.js` — fonction `getDragStartPositions` (vers ligne 1295)

**Interfaces:**
- Consumes: inchangé (`clickedId`)
- Produces: chaque entrée du tableau devient

```js
{
  id: string,
  x: number,          // alias conservé pour le drag existant
  y: number,
  x_mm: number,
  y_mm: number,
  width_mm: number,
  height_mm: number,
  rotation: number,
}
```

Le drag continue d’utiliser `p.x` / `p.y`. La rotation (Task 3) utilise `x_mm`, `y_mm`, `width_mm`, `height_mm`, `rotation`.

- [ ] **Step 1: Modifier le `out.push` dans `getDragStartPositions`**

Remplacer :

```js
      out.push({ id, x: item.x_mm || 0, y: item.y_mm || 0 })
```

par :

```js
      out.push({
        id,
        x: item.x_mm || 0,
        y: item.y_mm || 0,
        x_mm: item.x_mm || 0,
        y_mm: item.y_mm || 0,
        width_mm: item.width_mm || 0,
        height_mm: item.height_mm || 0,
        rotation: item.rotation || 0,
      })
```

Ne pas changer la collecte d’ids (racines TSD-028, skip lockés / groupes).

- [ ] **Step 2: Vérifier que les tests store existants passent toujours**

Run: `node --test frontend/src/stores/editor.test.js`

Expected: PASS (les tests Plan / multi-sélection n’assertent pas la forme de `getDragStartPositions`)

- [ ] **Step 3: Commit** (skip si non demandé)

```bash
git add frontend/src/stores/editor.js
git commit -m "$(cat <<'EOF'
feat: snapshot drag inclut rotation et taille pour le geste rotate

EOF
)"
```

---

### Task 3: Geste `startRotate` dans `useDragAndDrop`

**Files:**
- Modify: `frontend/src/composables/useDragAndDrop.js`

**Interfaces:**
- Consumes: helper Task 1 ; `store.getDragStartPositions` (Task 2) ; `clientPointToCardMm` depuis `@/utils/cssMm.js`
- Produces (retournés par le composable) :

```js
isRotating: Ref<boolean>
rotateLabel: Ref<null | { text: string, x: number, y: number }>
startRotate(e: MouseEvent, elementId: string) → void
```

Comportement :
- `mousedown` avec `e.detail >= 2` : ne **pas** démarrer un drag-rotate ; appliquer `resetAppliedDelta` (double-clic → 0°). Si Δ === 0, no-op (pas de snapshot).
- Sinon : `store._snapshot()`, `isRotating = true`, pivot = `selectionPivot(startEls)` **figé**, angle pointeur vs **ce pivot**
- Move : accumuler `shortestAngleDelta` (évite le saut ±360 au cut 180°) ; `appliedDelta = gestureAppliedDelta(startPrimaryRotation, accumulated, e.shiftKey)` ; `applyRotationDelta(startEls, appliedDelta, pivot)` puis `store.updateElement(id, { x_mm, y_mm, rotation }, { noHistory: true })`
- `rotateLabel` : `{ text: `${Math.round(normalizeDeg(startPrimaryRotation + appliedDelta))}°`, x: e.clientX + 12, y: e.clientY + 12 }`
- End : `isRotating = false`, `rotateLabel = null`, retirer listeners
- Lecture seule : `startRotate` no-op si `findElement` absent / `_layerLocked` (comme drag)
- Ne **pas** modifier `onResizeMove` / `resizeCursor`

- [ ] **Step 1: Ajouter les imports et l’état rotate**

En tête du fichier, étendre l’import cssMm :

```js
import { clientDeltaToCardMm, clientPointToCardMm } from '@/utils/cssMm.js'
import {
  applyRotationDelta,
  gestureAppliedDelta,
  normalizeDeg,
  pointerAngleDeg,
  resetAppliedDelta,
  selectionPivot,
  shortestAngleDelta,
} from '@/utils/elementRotation.js'
```

Dans `useDragAndDrop`, après `const resizeHandle = ref(null)` :

```js
  const isRotating = ref(false)
  const rotateLabel = ref(null)

  let startRotateEls = []
  let rotatePivot = { x: 0, y: 0 }
  let startPrimaryRotation = 0
  let lastPointerAngle = 0
  let accumulatedPointerDelta = 0
```

- [ ] **Step 2: Implémenter `startRotate` / move / end / reset**

Ajouter avant `findElement` :

```js
  function startElsFrom(elementId) {
    const raw = typeof store.getDragStartPositions === 'function'
      ? store.getDragStartPositions(elementId)
      : []
    return raw.map(p => ({
      id: p.id,
      x_mm: p.x_mm ?? p.x ?? 0,
      y_mm: p.y_mm ?? p.y ?? 0,
      width_mm: p.width_mm ?? p.w ?? 0,
      height_mm: p.height_mm ?? p.h ?? 0,
      rotation: p.rotation || 0,
    }))
  }

  function applyUpdates(updates, noHistory) {
    for (const u of updates) {
      store.updateElement(u.id, {
        x_mm: u.x_mm,
        y_mm: u.y_mm,
        rotation: u.rotation,
      }, { noHistory })
    }
  }

  function pointerOnCard(e) {
    const cardEl = getCardEl()
    if (!cardEl) return null
    return clientPointToCardMm(
      cardEl,
      e.clientX,
      e.clientY,
      getCardWidthMm(),
      getCardHeightMm()
    )
  }

  function setLabel(e, appliedDelta) {
    const deg = Math.round(normalizeDeg(startPrimaryRotation + appliedDelta))
    rotateLabel.value = { text: `${deg}°`, x: e.clientX + 12, y: e.clientY + 12 }
  }

  function resetRotationToZero(elementId) {
    const els = startElsFrom(elementId)
    if (!els.length) return
    const primary = els.find(el => el.id === elementId) || els[0]
    const delta = resetAppliedDelta(primary.rotation)
    if (delta === 0) return
    store._snapshot()
    const pivot = selectionPivot(els)
    applyUpdates(applyRotationDelta(els, delta, pivot), false)
  }

  function startRotate(e, elementId) {
    const el = findElement(elementId)
    if (!el || el._layerLocked) return

    e.preventDefault()
    e.stopPropagation()

    if (e.detail >= 2) {
      resetRotationToZero(elementId)
      return
    }

    const pt = pointerOnCard(e)
    if (!pt) return

    store._snapshot()
    isRotating.value = true
    currentElementId = elementId
    startRotateEls = startElsFrom(elementId)
    if (!startRotateEls.length) {
      isRotating.value = false
      return
    }
    rotatePivot = selectionPivot(startRotateEls)
    const primary = startRotateEls.find(item => item.id === elementId) || startRotateEls[0]
    startPrimaryRotation = primary.rotation || 0
    lastPointerAngle = pointerAngleDeg(pt.x_mm, pt.y_mm, rotatePivot.x, rotatePivot.y)
    accumulatedPointerDelta = 0
    setLabel(e, 0)

    document.addEventListener('mousemove', onRotateMove)
    document.addEventListener('mouseup', onRotateEnd)
  }

  function onRotateMove(e) {
    if (!isRotating.value) return
    const pt = pointerOnCard(e)
    if (!pt) return
    const ang = pointerAngleDeg(pt.x_mm, pt.y_mm, rotatePivot.x, rotatePivot.y)
    accumulatedPointerDelta += shortestAngleDelta(lastPointerAngle, ang)
    lastPointerAngle = ang
    const appliedDelta = gestureAppliedDelta(
      startPrimaryRotation,
      accumulatedPointerDelta,
      e.shiftKey
    )
    applyUpdates(applyRotationDelta(startRotateEls, appliedDelta, rotatePivot), true)
    setLabel(e, appliedDelta)
  }

  function onRotateEnd() {
    isRotating.value = false
    currentElementId = null
    startRotateEls = []
    rotateLabel.value = null
    document.removeEventListener('mousemove', onRotateMove)
    document.removeEventListener('mouseup', onRotateEnd)
  }
```

- [ ] **Step 3: Exporter les nouveaux symboles**

Remplacer le `return` du composable par :

```js
  return {
    isDragging, isResizing, isRotating, resizeHandle,
    rotateLabel,
    startDrag, startResize, startRotate, resizeCursor,
  }
```

- [ ] **Step 4: Relancer les tests helper (pas de régression)**

Run: `node --test frontend/src/utils/elementRotation.test.js`

Expected: PASS

- [ ] **Step 5: Commit** (skip si non demandé)

```bash
git add frontend/src/composables/useDragAndDrop.js
git commit -m "$(cat <<'EOF'
feat: geste de rotation canvas (Shift 15°, reset double-clic)

EOF
)"
```

---

### Task 4: Poignée canvas + normalisation panneau

**Files:**
- Modify: `frontend/src/components/editor/EditorCanvas.vue` — template poignées (~L187), badge, CSS
- Modify: `frontend/src/components/editor/PropertiesPanel.vue` — `update()` (~L897) + input rotation (~L28)

**Interfaces:**
- Consumes: `dragDrop.startRotate`, `dragDrop.rotateLabel` (Task 3)
- Poignée **oui** sur les composants (`el.type === 'component'`), **non** sur fond / locké / dessin / `width_mm <= 0` / `height_mm <= 0`
- Resize : condition **inchangée** (`el.type !== 'component'` reste)

- [ ] **Step 1: Extraire `rotateLabel` dans le script de `EditorCanvas.vue`**

Juste après `const dragDrop = useDragAndDrop(...)` :

```js
const rotateLabel = dragDrop.rotateLabel
```

Ajouter une fonction :

```js
function showRotateHandle(el) {
  return store.selectedElementId === el.id
    && !el._layerLocked
    && !BACKGROUND_ATOM_TYPES.has(el.atomType)
    && !drawingMode.active.value
    && (el.width_mm || 0) > 0
    && (el.height_mm || 0) > 0
}
```

- [ ] **Step 2: Injecter la poignée dans le template**

**Après** le bloc des resize handles (avant `</div>` qui ferme `.canvas-element`), ajouter :

```html
          <div
            v-if="showRotateHandle(el)"
            class="rotate-handle"
            title="Rotation (Shift : 15°)"
            @mousedown.stop="dragDrop.startRotate($event, el.id)"
          ></div>
```

**Après** `</div>` du viewport / au niveau de `.editor-canvas` (frère, **pas** enfant de l’élément tourné), ajouter le badge `position: fixed` :

```html
    <div
      v-if="rotateLabel"
      class="rotate-angle-badge"
      :style="{ left: rotateLabel.x + 'px', top: rotateLabel.y + 'px' }"
    >{{ rotateLabel.text }}</div>
```

Le placer dans la racine du template (`div.editor-canvas` ou équivalent existant) pour qu’il ne subisse ni `rotate` élément ni `scale` viewport. Coordonnées = `clientX/Y` déjà écran.

- [ ] **Step 3: CSS de la poignée et du badge**

Dans le `<style scoped>` de `EditorCanvas.vue`, après `.handle-sw` :

```css
.rotate-handle {
  position: absolute;
  left: 50%;
  top: -5.2mm;
  width: 1.6mm;
  height: 1.6mm;
  transform: translateX(-50%);
  background: var(--accent-primary);
  border: 0.15mm solid white;
  border-radius: 50%;
  z-index: 102;
  cursor: grab;
}
.rotate-handle::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 1.6mm;
  width: 0.2mm;
  height: 3mm;
  transform: translateX(-50%);
  background: var(--accent-primary);
  pointer-events: none;
}
.rotate-handle:active {
  cursor: grabbing;
}
```

Badge : **sans** `scoped` qui casserait un téléport — rester scoped, classe sur l’élément dans ce SFC :

```css
.rotate-angle-badge {
  position: fixed;
  z-index: 400;
  pointer-events: none;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
```

(`fixed` est viewport-relative : le zoom carte ne l’affecte pas.)

- [ ] **Step 4: Normaliser la saisie panneau**

Dans `PropertiesPanel.vue`, ajouter l’import :

```js
import { normalizeDeg } from '@/utils/elementRotation.js'
```

(placer avec les autres imports du `<script setup>`.)

Remplacer `update` :

```js
function update(key, value) {
  if (key === 'rotation') value = normalizeDeg(value)
  store.updateElement(el.value.id, { [key]: value })
}
```

L’input existant reste :

```html
          <input type="number" :value="el.rotation || 0" @input="update('rotation', +$event.target.value)" step="1" />
```

- [ ] **Step 5: Tests helper + store**

Run:

```bash
node --test frontend/src/utils/elementRotation.test.js frontend/src/stores/editor.test.js
```

Expected: PASS

- [ ] **Step 6: Commit** (skip si non demandé)

```bash
git add frontend/src/components/editor/EditorCanvas.vue frontend/src/components/editor/PropertiesPanel.vue
git commit -m "$(cat <<'EOF'
feat: poignée de rotation canvas et normalisation du champ degrés

EOF
)"
```

---

### Task 5: Vérifications, spec, workplan

**Files:**
- Verify (no edit unless broken): `frontend/src/components/cards/CardPreview.vue`, `frontend/src/components/editor/ComponentRenderer.vue`
- Modify: `specs/TSD-030-rotation-elements.md` (Status Done + cases §6/§8)
- Modify: `specs/WORKPLAN.md` (case implémenté, journal, prochaines actions)

**Interfaces:** aucune API nouvelle.

- [ ] **Step 1: Confirmer le rendu preview/print**

Grep : `transform: el.rotation ? \`rotate(\${el.rotation}deg)\`` présent dans `CardPreview.vue` et `ComponentRenderer.vue`. Ne pas changer la formule.

- [ ] **Step 2: Suite de tests racine**

Run: `npm test`

Expected: PASS (inclut `frontend/src/utils/**/*.test.js` donc `elementRotation.test.js`)

- [ ] **Step 3: QA manuelle (éditeur layout)**

1. Sélectionner un atome → poignée au-dessus du bord haut
2. Glisser → l’élément tourne autour de son centre ; le champ panneau suit ; Undo = une étape
3. Shift → multiples de 15°
4. Saisir `190` dans le panneau → affiche `-170`
5. Double-clic poignée → `0°`
6. Cmd+clic deux atomes → poignée sur le primaire ; les deux orbitent autour du milieu ; locké ignoré
7. Composant : poignée oui, pas de resize
8. Fond / locké / dessin : pas de poignée
9. Resize d’un élément à 0° : inchangé

- [ ] **Step 4: Marquer TSD-030 Done**

- Header `Status` → `Done`
- Cocher toutes les cases §6 Implementation steps et §8 Acceptance criteria

- [ ] **Step 5: Mettre à jour `specs/WORKPLAN.md`**

- Cocher `TSD-030 implémenté`
- Recalculer Phase 1 (~100 % si plus rien de Phase 1 ouvert hors TSD-029 types)
- Journal : ligne du jour, résumé rotation canvas
- Prochaines actions : retirer TSD-030, laisser TSD-029 types en tête Phase 1

- [ ] **Step 6: Commit** (skip si non demandé)

```bash
git add specs/TSD-030-rotation-elements.md specs/WORKPLAN.md
git commit -m "$(cat <<'EOF'
docs: clôturer TSD-030 rotation éléments

EOF
)"
```

---

## Spec coverage (self-review)

| Exigence TSD-030 | Task |
|------------------|------|
| Poignée primaire, au-dessus du bord haut | 4 |
| Geste autour du centre (1) / pivot AABB centres (n) | 1 + 3 |
| Shift 15° | 1 `gestureAppliedDelta` + 3 `e.shiftKey` |
| Libellé d’angle écran | 3 `rotateLabel` + 4 badge `fixed` |
| Double-clic → 0° (set suit) | 3 `e.detail >= 2` + `resetAppliedDelta` |
| Champ panneau normalisé | 4 |
| Helper + tests | 1 |
| `getDragStartPositions` + `updateElement` | 2 + 3 |
| Pas de poignée fond/locké/dessin | 4 `showRotateHandle` |
| Composants : rotate oui, resize non | 4 |
| Preview/print CSS inchangé | 5 |
| Resize axes carte inchangé | 3 (ne pas toucher `onResizeMove`) |
| Undo un snapshot mousedown | 3 `store._snapshot()` |
| Wrap ±180° pendant le geste | 1 `shortestAngleDelta` (précision vs formule brute du TSD) |
| Groupe seul : pas de poignée | 4 (`selectedElementId` null) |

## Placeholder scan

Aucun TBD / « similar to Task N » / tests vagues.

## Type consistency

- `applyRotationDelta(els, deltaDeg, pivot)` → `{ id, x_mm, y_mm, rotation }[]` utilisé tel quel dans Task 3
- `getDragStartPositions` fournit `x_mm`/`y_mm`/`width_mm`/`height_mm`/`rotation` (+ alias `x`/`y` pour le drag)
- `rotateLabel` : `{ text, x, y }` en px écran
- `startRotate(e, elementId)` : même ordre d’arguments que `startDrag` / `startResize` (event, id)
