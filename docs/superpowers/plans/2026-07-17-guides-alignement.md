# Guides d’alignement (TSD-023) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher des guides d’alignement (centres layout, bords/centres éléments, marges, cadres) pendant drag/resize/flèches — **affichage seul**, sans magnétisme.

**Architecture:** Helper pur `computeAlignmentGuides()` (testable Node) + état runtime dans le store Pinia (`guideOptions`, `guidesActive`, `activeGuides`) + overlay SVG + branchements drag/resize/clavier + menu toolbar. Aucun snap vers les guides ; le `snapGrid` existant reste inchangé.

**Tech Stack:** Vue 3 Composition API, Pinia, ESM, tests Node (`node --test` / assert).

**Spec:** `specs/TSD-023-guides-alignement.md`

## Global Constraints

- Mesures en **mm** ; rendu via `mmToPx` uniquement
- Visibilité ligne : `|Δ| ≤ 3` mm → fine ; `|Δ| < snapGrid` → épaisse ; sinon pas de ligne
- Pas de magnétisme vers les guides
- Options persistées : `localStorage` clé `card-designer.guideOptions`
- Pas de TypeScript ; alias `@/`
- Commit **uniquement** si l’utilisateur le demande (sinon skip les steps Commit)
- Mettre à jour `specs/WORKPLAN.md` en fin de session

---

## File map

| Path | Responsibility |
|------|----------------|
| `frontend/src/utils/alignmentGuides.js` | Calcul pur des guides (lignes, marges, frames) |
| `frontend/src/utils/alignmentGuides.test.js` | Tests Node |
| `frontend/src/stores/editor.js` | `guideOptions`, load/save, `refreshGuides` / `clearGuides`, runtime |
| `frontend/src/components/editor/AlignmentGuidesOverlay.vue` | Rendu SVG |
| `frontend/src/components/editor/GuidesMenu.vue` | Bouton + panneau toggles |
| `frontend/src/components/editor/EditorCanvas.vue` | Overlay + flèches → refresh/clear |
| `frontend/src/composables/useDragAndDrop.js` | refresh pendant drag/resize, clear à la fin |
| `frontend/src/components/editor/EditorToolbar.vue` | Intégrer `GuidesMenu` |
| `specs/TSD-023-guides-alignement.md` | Status → Done en fin d’impl |
| `specs/WORKPLAN.md` | Journal + checklist |

---

### Task 1: Helper pur `computeAlignmentGuides` + tests

**Files:**
- Create: `frontend/src/utils/alignmentGuides.js`
- Create: `frontend/src/utils/alignmentGuides.test.js`

**Interfaces:**
- Produces:
  - `VISIBILITY_MM = 3`
  - `elementBBox(el) → { left, right, top, bottom, cx, cy, width, height }`
  - `computeAlignmentGuides({ active, candidates, layoutW, layoutH, snapGrid, options }) → Guide[]`
  - Guide shapes (comme TSD §4) : `{ kind:'line', ... } | { kind:'margin', ... } | { kind:'frame', ... }`
  - `options` : `{ layoutCenters, elementEdges, elementCenters, margins, frames }` (bools)
  - Si toutes options false → `[]`
  - Candidats déjà filtrés par l’appelant (non lockés, visibles, ≠ actif)

- [ ] **Step 1: Écrire les tests (fail attendu)**

```js
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
```

- [ ] **Step 2: Lancer les tests — FAIL**

Run: `cd frontend && node --test src/utils/alignmentGuides.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implémenter `alignmentGuides.js`**

```js
// frontend/src/utils/alignmentGuides.js
export const VISIBILITY_MM = 3

export function elementBBox(el) {
  const left = el.x_mm
  const top = el.y_mm
  const width = el.width_mm
  const height = el.height_mm
  return {
    left, top, width, height,
    right: left + width,
    bottom: top + height,
    cx: left + width / 2,
    cy: top + height / 2,
  }
}

function anyOptionOn(o) {
  return o.layoutCenters || o.elementEdges || o.elementCenters || o.margins || o.frames
}

function pushLine(out, seen, axis, position_mm, delta, snapGrid, source) {
  if (Math.abs(delta) > VISIBILITY_MM) return
  const key = `${axis}:${position_mm.toFixed(3)}:${source}`
  const strong = Math.abs(delta) < snapGrid
  if (seen.has(key)) {
    const existing = seen.get(key)
    if (strong && !existing.strong) existing.strong = true
    return
  }
  const guide = { kind: 'line', axis, position_mm, strong, source }
  seen.set(key, guide)
  out.push(guide)
}

export function computeAlignmentGuides({ active, candidates, layoutW, layoutH, snapGrid, options }) {
  if (!active || !anyOptionOn(options)) return []
  const out = []
  const a = elementBBox(active)
  const lineSeen = new Map()
  const step = snapGrid > 0 ? snapGrid : 1

  if (options.layoutCenters) {
    const midX = layoutW / 2
    const midY = layoutH / 2
    for (const v of [a.left, a.cx, a.right]) {
      pushLine(out, lineSeen, 'x', midX, v - midX, step, 'layout')
    }
    for (const v of [a.top, a.cy, a.bottom]) {
      pushLine(out, lineSeen, 'y', midY, v - midY, step, 'layout')
    }
  }

  const xVals = (bb) => {
    const vals = []
    if (options.elementEdges) vals.push({ v: bb.left, s: 'edge' }, { v: bb.right, s: 'edge' })
    if (options.elementCenters) vals.push({ v: bb.cx, s: 'center' })
    return vals
  }
  const yVals = (bb) => {
    const vals = []
    if (options.elementEdges) vals.push({ v: bb.top, s: 'edge' }, { v: bb.bottom, s: 'edge' })
    if (options.elementCenters) vals.push({ v: bb.cy, s: 'center' })
    return vals
  }

  for (const cand of candidates) {
    const b = elementBBox(cand)
    if (options.frames) {
      out.push({ kind: 'frame', x_mm: b.left, y_mm: b.top, width_mm: b.width, height_mm: b.height })
    }
    if (options.elementEdges || options.elementCenters) {
      for (const av of xVals(a)) {
        for (const bv of xVals(b)) {
          pushLine(out, lineSeen, 'x', bv.v, av.v - bv.v, step, av.s === 'center' || bv.s === 'center' ? 'center' : 'edge')
        }
      }
      for (const av of yVals(a)) {
        for (const bv of yVals(b)) {
          pushLine(out, lineSeen, 'y', bv.v, av.v - bv.v, step, av.s === 'center' || bv.s === 'center' ? 'center' : 'edge')
        }
      }
    }
  }

  if (options.margins) {
    const gaps = { left: null, right: null, top: null, bottom: null }
    for (const cand of candidates) {
      const b = elementBBox(cand)
      // horizontal face: vertical overlap
      const vOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (vOverlap > 0) {
        const gapL = a.left - b.right
        if (gapL > 0 && (gaps.left == null || gapL < gaps.left.distance_mm)) {
          const midY = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2
          gaps.left = {
            kind: 'margin', side: 'left', distance_mm: gapL, equal: false,
            from_mm: { x: a.left, y: midY }, to_mm: { x: b.right, y: midY },
          }
        }
        const gapR = b.left - a.right
        if (gapR > 0 && (gaps.right == null || gapR < gaps.right.distance_mm)) {
          const midY = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2
          gaps.right = {
            kind: 'margin', side: 'right', distance_mm: gapR, equal: false,
            from_mm: { x: a.right, y: midY }, to_mm: { x: b.left, y: midY },
          }
        }
      }
      // vertical face: horizontal overlap
      const hOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      if (hOverlap > 0) {
        const gapT = a.top - b.bottom
        if (gapT > 0 && (gaps.top == null || gapT < gaps.top.distance_mm)) {
          const midX = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2
          gaps.top = {
            kind: 'margin', side: 'top', distance_mm: gapT, equal: false,
            from_mm: { x: midX, y: a.top }, to_mm: { x: midX, y: b.bottom },
          }
        }
        const gapB = b.top - a.bottom
        if (gapB > 0 && (gaps.bottom == null || gapB < gaps.bottom.distance_mm)) {
          const midX = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2
          gaps.bottom = {
            kind: 'margin', side: 'bottom', distance_mm: gapB, equal: false,
            from_mm: { x: midX, y: a.bottom }, to_mm: { x: midX, y: b.top },
          }
        }
      }
    }
    if (gaps.left && gaps.right && Math.abs(gaps.left.distance_mm - gaps.right.distance_mm) < step) {
      gaps.left.equal = gaps.right.equal = true
    }
    if (gaps.top && gaps.bottom && Math.abs(gaps.top.distance_mm - gaps.bottom.distance_mm) < step) {
      gaps.top.equal = gaps.bottom.equal = true
    }
    for (const g of Object.values(gaps)) if (g) out.push(g)
  }

  return out
}
```

- [ ] **Step 4: Lancer les tests — PASS**

Run: `cd frontend && node --test src/utils/alignmentGuides.test.js`  
Expected: all tests pass

- [ ] **Step 5: Commit** (si demandé)

```bash
git add frontend/src/utils/alignmentGuides.js frontend/src/utils/alignmentGuides.test.js
git commit -m "$(cat <<'EOF'
feat: add pure alignment guides calculator (TSD-023)

EOF
)"
```

---

### Task 2: Store — options + runtime guides

**Files:**
- Modify: `frontend/src/stores/editor.js`

**Interfaces:**
- Consumes: `computeAlignmentGuides` from `@/utils/alignmentGuides.js`
- Produces:
  - `guideOptions` ref (5 bools, defaults all `true`)
  - `guidesActive` ref(false)
  - `activeGuides` ref([])
  - `loadGuideOptions()` / `setGuideOption(key, value)` → persist `card-designer.guideOptions`
  - `refreshGuides(activeEl)` — filtre candidats depuis `allElements`, appelle compute, pose `guidesActive=true`
  - `clearGuides()` — `guidesActive=false`, `activeGuides=[]`
  - Si `!assertEditable()` ou pas d’élément → clear
  - Group selection (pas d’élément) → clear / no-op

- [ ] **Step 1: Ajouter state + helpers après `showGrid`**

```js
import { computeAlignmentGuides } from '@/utils/alignmentGuides.js'

const GUIDE_OPTIONS_KEY = 'card-designer.guideOptions'
const DEFAULT_GUIDE_OPTIONS = {
  layoutCenters: true,
  elementEdges: true,
  elementCenters: true,
  margins: true,
  frames: true,
}

function _loadGuideOptions() {
  try {
    const raw = localStorage.getItem(GUIDE_OPTIONS_KEY)
    if (!raw) return { ...DEFAULT_GUIDE_OPTIONS }
    return { ...DEFAULT_GUIDE_OPTIONS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_GUIDE_OPTIONS }
  }
}

const guideOptions = ref(_loadGuideOptions())
const guidesActive = ref(false)
const activeGuides = ref([])

function setGuideOption(key, value) {
  if (!(key in guideOptions.value)) return
  guideOptions.value = { ...guideOptions.value, [key]: !!value }
  localStorage.setItem(GUIDE_OPTIONS_KEY, JSON.stringify(guideOptions.value))
}

function refreshGuides(activeEl) {
  if (!activeEl) { clearGuides(); return }
  const opts = guideOptions.value
  if (!opts.layoutCenters && !opts.elementEdges && !opts.elementCenters && !opts.margins && !opts.frames) {
    clearGuides()
    return
  }
  const candidates = allElements.value.filter(e =>
    e.id !== activeEl.id && !e._layerLocked
  )
  const layoutW = layout.value?.width_mm || 63
  const layoutH = Number(layout.value?.height_mm) || 88
  activeGuides.value = computeAlignmentGuides({
    active: activeEl,
    candidates,
    layoutW,
    layoutH,
    snapGrid: snapGrid.value || 1,
    options: opts,
  })
  guidesActive.value = true
}

function clearGuides() {
  guidesActive.value = false
  activeGuides.value = []
}
```

- [ ] **Step 2: Exporter** `guideOptions`, `guidesActive`, `activeGuides`, `setGuideOption`, `refreshGuides`, `clearGuides` dans le `return` du store

- [ ] **Step 3: Vérifier manuellement** dans la console du navigateur (après hot reload) :  
  `useEditorStore().setGuideOption('frames', false)` puis inspecter `localStorage.getItem('card-designer.guideOptions')`

- [ ] **Step 4: Commit** (si demandé)

---

### Task 3: Overlay SVG `AlignmentGuidesOverlay.vue`

**Files:**
- Create: `frontend/src/components/editor/AlignmentGuidesOverlay.vue`

**Interfaces:**
- Consumes: props `guides` (array), `widthMm`, `heightMm`, `zoom` ; `useMmScale`
- Produces: SVG full-size, `pointer-events: none`, z-index au-dessus des éléments (~50), sous toolbars flottantes

- [ ] **Step 1: Créer le composant**

```vue
<template>
  <svg
    class="alignment-guides"
    :width="mmToPx(widthMm)"
    :height="mmToPx(heightMm)"
  >
    <template v-for="(g, i) in guides" :key="i">
      <!-- frames -->
      <rect
        v-if="g.kind === 'frame'"
        :x="mmToPx(g.x_mm)" :y="mmToPx(g.y_mm)"
        :width="mmToPx(g.width_mm)" :height="mmToPx(g.height_mm)"
        fill="none"
        stroke="var(--accent-primary)"
        stroke-opacity="0.35"
        stroke-width="1"
        stroke-dasharray="4 3"
      />
      <!-- lines -->
      <line
        v-else-if="g.kind === 'line' && g.axis === 'x'"
        :x1="mmToPx(g.position_mm)" y1="0"
        :x2="mmToPx(g.position_mm)" :y2="mmToPx(heightMm)"
        :stroke="lineColor(g)"
        :stroke-width="g.strong ? 2.5 : 1"
        stroke-opacity="0.9"
      />
      <line
        v-else-if="g.kind === 'line' && g.axis === 'y'"
        x1="0" :y1="mmToPx(g.position_mm)"
        :x2="mmToPx(widthMm)" :y2="mmToPx(g.position_mm)"
        :stroke="lineColor(g)"
        :stroke-width="g.strong ? 2.5 : 1"
        stroke-opacity="0.9"
      />
      <!-- margins -->
      <g v-else-if="g.kind === 'margin'">
        <line
          :x1="mmToPx(g.from_mm.x)" :y1="mmToPx(g.from_mm.y)"
          :x2="mmToPx(g.to_mm.x)" :y2="mmToPx(g.to_mm.y)"
          :stroke="g.equal ? 'var(--accent-primary)' : 'rgba(108,122,255,0.55)'"
          :stroke-width="g.equal ? 2 : 1"
        />
        <text
          :x="mmToPx((g.from_mm.x + g.to_mm.x) / 2)"
          :y="mmToPx((g.from_mm.y + g.to_mm.y) / 2) - 4"
          fill="var(--accent-primary)"
          font-size="10"
          font-family="var(--font-mono)"
          text-anchor="middle"
        >{{ g.distance_mm.toFixed(1) }} mm</text>
      </g>
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useMmScale } from '@/composables/useMmScale.js'

const props = defineProps({
  guides: { type: Array, default: () => [] },
  widthMm: { type: Number, required: true },
  heightMm: { type: Number, required: true },
  zoom: { type: Number, default: 1 },
})

const zoomRef = computed(() => props.zoom)
const { mmToPx } = useMmScale(zoomRef)

function lineColor(g) {
  return g.strong ? 'var(--accent-primary)' : 'rgba(108,122,255,0.45)'
}
</script>

<style scoped>
.alignment-guides {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 50;
  overflow: visible;
}
</style>
```

- [ ] **Step 2: Commit** (si demandé)

---

### Task 4: Brancher overlay + drag/resize + flèches

**Files:**
- Modify: `frontend/src/components/editor/EditorCanvas.vue`
- Modify: `frontend/src/composables/useDragAndDrop.js`

**Interfaces:**
- Consumes: `store.refreshGuides`, `store.clearGuides`, `store.guidesActive`, `store.activeGuides`
- Pendant drag/resize : après chaque `updateElement`, appeler `store.refreshGuides(findElement(id))`
- Au start : `refreshGuides` ; au end : `clearGuides`
- Flèches : après `moveSelected`, si `selectedElement` existe → `refreshGuides` ; clear différé 300 ms sur keyup Arrow*

- [ ] **Step 1: `useDragAndDrop.js` — appeler refresh/clear**

Dans `startDrag` / `startResize` après snapshot :
```js
store.refreshGuides(el)
```

Dans `onDragMove` / `onResizeMove` après `updateElement` :
```js
store.refreshGuides(findElement(currentElementId))
```

Dans `onDragEnd` / `onResizeEnd` :
```js
store.clearGuides()
```

- [ ] **Step 2: `EditorCanvas.vue` — overlay dans `card-boundary`**

Juste après la grille SVG (avant la boucle éléments), ou juste avant la fermeture de `card-boundary` (après les éléments, pour être au-dessus) :

```vue
<AlignmentGuidesOverlay
  v-if="store.guidesActive"
  :guides="store.activeGuides"
  :width-mm="cardW"
  :height-mm="cardH"
  :zoom="store.zoom"
/>
```

Import : `import AlignmentGuidesOverlay from './AlignmentGuidesOverlay.vue'`

> Placer **après** la boucle `v-for` des éléments pour que z-index 50 soit au-dessus du contenu, mais les handles restent dans chaque élément (z-index 100 sur selected).

- [ ] **Step 3: Flèches — refresh + clear différé**

Dans `onKeyDown`, après `store.moveSelected(dx, dy)` :
```js
if (store.selectedElement) store.refreshGuides(store.selectedElement)
scheduleGuidesClear()
```

Ajouter :
```js
let guidesClearTimer = null
function scheduleGuidesClear() {
  clearTimeout(guidesClearTimer)
  guidesClearTimer = setTimeout(() => store.clearGuides(), 300)
}
function onKeyUp(e) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  scheduleGuidesClear()
}
```

`onMounted` : `window.addEventListener('keyup', onKeyUp)`  
`onBeforeUnmount` : remove + `clearTimeout` + `store.clearGuides()`

- [ ] **Step 4: Test manuel**
  1. Ouvrir un layout avec ≥2 éléments
  2. Draguer un élément près du centre → ligne fine puis épaisse
  3. Aligner un bord → ligne
  4. Relâcher → overlay disparait
  5. Flèches → guides ; pause 300 ms → disparait
  6. Resize → guides

- [ ] **Step 5: Commit** (si demandé)

---

### Task 5: Menu Guides dans la toolbar

**Files:**
- Create: `frontend/src/components/editor/GuidesMenu.vue`
- Modify: `frontend/src/components/editor/EditorToolbar.vue`

**Interfaces:**
- Consumes: `store.guideOptions`, `store.setGuideOption`
- Produces: bouton « Guides » + dropdown 5 checkboxes

- [ ] **Step 1: Créer `GuidesMenu.vue`**

```vue
<template>
  <div class="guides-menu" ref="rootRef">
    <button type="button" class="btn-zoom btn-sm" :class="{ active: open }" @click="open = !open">
      Guides
    </button>
    <div v-if="open" class="guides-panel">
      <label v-for="opt in OPTIONS" :key="opt.key" class="guides-opt">
        <input
          type="checkbox"
          :checked="store.guideOptions[opt.key]"
          @change="store.setGuideOption(opt.key, $event.target.checked)"
        />
        {{ opt.label }}
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editor.js'

const store = useEditorStore()
const open = ref(false)
const rootRef = ref(null)

const OPTIONS = [
  { key: 'layoutCenters', label: 'Centres layout' },
  { key: 'elementEdges', label: 'Bords ↔ éléments' },
  { key: 'elementCenters', label: 'Centres ↔ éléments' },
  { key: 'margins', label: 'Marges' },
  { key: 'frames', label: 'Cadres éléments' },
]

function onDocClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<style scoped>
.guides-menu { position: relative; display: inline-flex; }
.guides-menu .active { outline: 1px solid var(--accent-primary); }
.guides-panel {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 200;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
}
.guides-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 2: Intégrer dans `EditorToolbar.vue`** après le label Snap :

```vue
<span class="toolbar-divider"></span>
<GuidesMenu />
```

Import + register dans script.

- [ ] **Step 3: Test manuel**
  - Toggle Frames off → plus de cadres pendant drag
  - Reload → options persistées
  - Toutes off → aucun overlay

- [ ] **Step 4: Commit** (si demandé)

---

### Task 6: Acceptance + WORKPLAN

**Files:**
- Modify: `specs/TSD-023-guides-alignement.md` (Status → Done, cocher §8)
- Modify: `specs/WORKPLAN.md`

- [ ] **Step 1: Parcourir les acceptance criteria TSD §8** (checklist manuelle)

- [ ] **Step 2: Status TSD → Done**, cocher critères

- [ ] **Step 3: WORKPLAN** — cocher / ajouter tâche guides, journal session, % si besoin

- [ ] **Step 4: Commit** (si demandé)

```bash
git add specs/TSD-023-guides-alignement.md specs/WORKPLAN.md
git commit -m "$(cat <<'EOF'
docs: mark TSD-023 alignment guides done

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Centres layout H/V | T1 + T4 |
| Bords / centres éléments | T1 |
| Marges H+V + equal | T1 |
| Cadres non lockés | T1 + T2 filter |
| Visibilité 3 mm / strong `< snapGrid` | T1 |
| Pas de magnétisme | T4 (refresh only, no position change) |
| Drag + resize + flèches | T4 |
| Menu Guides + localStorage | T2 + T5 |
| Overlay SVG | T3 |
| Mode layout + composant | Même EditorCanvas / store |

**Placeholders:** none  
**Types:** `refreshGuides(activeEl)` / `clearGuides` / `setGuideOption(key, value)` cohérents T2→T5
)
