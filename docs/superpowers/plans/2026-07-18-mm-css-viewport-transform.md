# CSS mm + Viewport Transform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the entire card world in CSS `mm` (no `mm × zoom` → px), and apply editor zoom/pan only via `transform: translate(...) scale(...)` on the viewport wrapper so text no longer drifts when zooming and print can use the same DOM at scale 1.

**Architecture:** Card surface, elements, atoms, grid, guides, and handles live in one CSS-mm layer. The viewport wrapper owns `translate(pan) scale(zoom)`. Pointer interactions convert screen coords → card mm via `getBoundingClientRect()` of the card surface. Preview and print reuse the same mm rendering; print hides chrome and keeps each card in a `break-inside: avoid` block.

**Tech Stack:** Vue 3 Composition API, Pinia, ESM, CSS `mm` units, `node --test` + `node:assert/strict` for pure helpers.

## Global Constraints

- Card lengths in the DOM use CSS `mm` strings (`4.5mm`), never `px` derived from `mm * zoom`.
- Zoom must not appear in atom/component render math; only on the viewport `transform`.
- Grid, snap, guides, handles, keyboard nudges remain in mm inside the scaled card world.
- Drag & drop / resize stay; pointer → mm via card `getBoundingClientRect()`.
- Print: chrome hidden, viewport transform none, multi-card `break-inside: avoid`.
- Data model stays mm numbers (TSD-022); no value re-migration.
- Spec: `docs/superpowers/specs/2026-07-18-mm-css-viewport-transform-design.md`

---

## File map

| File | Role |
|------|------|
| `frontend/src/utils/cssMm.js` | `mmCss(n)`, `clientPointToCardMm`, `clientDeltaToCardMm` |
| `frontend/src/utils/cssMm.test.js` | Unit tests for helpers |
| `frontend/src/composables/useMmScale.js` | Narrow to screen/ruler helpers or deprecate for card render |
| `frontend/src/atoms/components/useAtomScale.js` | Replace with `mmCss` usage (or thin re-export then delete) |
| `frontend/src/components/editor/EditorCanvas.vue` | Viewport `scale`+`translate`; card/elements in CSS mm |
| `frontend/src/composables/useDragAndDrop.js` | Deltas via card rect / `clientDeltaToCardMm` |
| `frontend/src/composables/useDrawingMode.js` | Pointer → atom SVG using card rect, not `PX_PER_MM * zoom` |
| `frontend/src/components/editor/AlignmentGuidesOverlay.vue` | SVG `viewBox` in mm; drop zoom prop |
| `frontend/src/components/editor/AtomRenderer.vue` | Drop `zoom` prop |
| `frontend/src/components/editor/ComponentRenderer.vue` | Drop `zoom`; embed children in CSS mm + CSS `scale` for fit |
| `frontend/src/atoms/components/Atom*.vue` | All length styles → `mmCss(...)`; remove `zoom` |
| `frontend/src/components/cards/CardPreview.vue` | Same mm pipeline; optional outer preview scale wrapper |
| `frontend/src/views/CardsView.vue` | Print sheet + `break-inside: avoid` cards |
| `specs/TSD-022-unites-mm-physiques.md`, `.cursorrules`, `CLAUDE.md`, `specs/WORKPLAN.md` | Doc alignment |

---

### Task 1: CSS mm helpers + tests

**Files:**
- Create: `frontend/src/utils/cssMm.js`
- Create: `frontend/src/utils/cssMm.test.js`

**Interfaces:**
- Consumes: none
- Produces:
  - `mmCss(n: number): string` → `` `${n}mm` ``
  - `clientPointToCardMm(cardEl, clientX, clientY, cardWidthMm, cardHeightMm): { x_mm, y_mm }`
  - `clientDeltaToCardMm(cardEl, dxPx, dyPx, cardWidthMm, cardHeightMm): { dx_mm, dy_mm }`
  - `CSS_PX_PER_MM = 96 / 25.4` (for fit/1:1 / rulers only — not for atom render)

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/utils/cssMm.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mmCss, clientPointToCardMm, clientDeltaToCardMm } from './cssMm.js'

describe('mmCss', () => {
  it('formats number as CSS mm', () => {
    assert.equal(mmCss(4.5), '4.5mm')
    assert.equal(mmCss(0), '0mm')
  })
})

describe('clientPointToCardMm', () => {
  it('maps client point using element rect', () => {
    const cardEl = {
      getBoundingClientRect: () => ({ left: 100, top: 50, width: 378, height: 528 }),
    }
    // 378px ≈ 100mm width at some zoom; point at left+189 → mid X
    const { x_mm, y_mm } = clientPointToCardMm(cardEl, 100 + 189, 50, 100, 140)
    assert.ok(Math.abs(x_mm - 50) < 1e-9)
    assert.ok(Math.abs(y_mm - 0) < 1e-9)
  })
})

describe('clientDeltaToCardMm', () => {
  it('scales pixel deltas by card mm / rect size', () => {
    const cardEl = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 400 }),
    }
    const { dx_mm, dy_mm } = clientDeltaToCardMm(cardEl, 20, 40, 100, 200)
    assert.ok(Math.abs(dx_mm - 10) < 1e-9)
    assert.ok(Math.abs(dy_mm - 20) < 1e-9)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && node --test src/utils/cssMm.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```js
// frontend/src/utils/cssMm.js
/** CSS reference px per mm (96dpi). For fit/rulers only — not atom render. */
export const CSS_PX_PER_MM = 96 / 25.4

export function mmCss(n) {
  return `${n}mm`
}

export function clientPointToCardMm(cardEl, clientX, clientY, cardWidthMm, cardHeightMm) {
  const rect = cardEl.getBoundingClientRect()
  return {
    x_mm: ((clientX - rect.left) / rect.width) * cardWidthMm,
    y_mm: ((clientY - rect.top) / rect.height) * cardHeightMm,
  }
}

export function clientDeltaToCardMm(cardEl, dxPx, dyPx, cardWidthMm, cardHeightMm) {
  const rect = cardEl.getBoundingClientRect()
  return {
    dx_mm: (dxPx / rect.width) * cardWidthMm,
    dy_mm: (dyPx / rect.height) * cardHeightMm,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && node --test src/utils/cssMm.test.js`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/cssMm.js frontend/src/utils/cssMm.test.js
git commit -m "feat(units): add CSS mm helpers and pointer→card mm mapping"
```

---

### Task 2: EditorCanvas — viewport scale + card world in CSS mm

**Files:**
- Modify: `frontend/src/components/editor/EditorCanvas.vue`

**Interfaces:**
- Consumes: `mmCss`, `CSS_PX_PER_MM`, `clientPointToCardMm` from `@/utils/cssMm.js`
- Produces: Viewport applies both pan and zoom; card/elements sized in CSS mm without `useMmScale(zoom)` for render

- [ ] **Step 1: Change viewportStyle to include scale**

Replace:

```js
const viewportStyle = computed(() => ({
  transform: `translate(${store.panX}px, ${store.panY}px)`
}))
```

with:

```js
const viewportStyle = computed(() => ({
  transform: `translate(${store.panX}px, ${store.panY}px) scale(${store.zoom})`,
  transformOrigin: '0 0',
}))
```

- [ ] **Step 2: Render card + elements in CSS mm**

```js
import { mmCss, CSS_PX_PER_MM, clientPointToCardMm } from '@/utils/cssMm.js'

const cardStyle = computed(() => ({
  width: mmCss(cardW.value),
  height: mmCss(cardH.value),
  clipPath: isHex.value ? hexClip : undefined,
}))

function elementStyle(el) {
  return {
    left: mmCss(el.x_mm),
    top: mmCss(el.y_mm),
    width: mmCss(el.width_mm),
    height: mmCss(el.height_mm),
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el._layerOpacity != null ? el._layerOpacity : undefined,
  }
}
```

- [ ] **Step 3: Grid SVG in mm user space**

Use a viewBox in mm so pattern coordinates are mm (no `mmToPx`):

```html
<svg
  v-if="store.showGrid"
  class="grid-overlay"
  :width="mmCss(cardW)"
  :height="mmCss(cardH)"
  :viewBox="`0 0 ${cardW} ${cardH}`"
>
  <defs>
    <pattern
      id="grid-pattern"
      :width="store.snapGrid"
      :height="store.snapGrid"
      patternUnits="userSpaceOnUse"
    >
      <path
        :d="`M ${store.snapGrid} 0 L 0 0 0 ${store.snapGrid}`"
        fill="none"
        stroke="rgba(108,122,255,0.08)"
        stroke-width="0.05"
      />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid-pattern)" />
</svg>
```

Apply the same viewBox approach to the hex inactive overlay paths (coordinates in mm numbers).

- [ ] **Step 4: Fit / 1:1 use CSS_PX_PER_MM (screen layout only)**

```js
function applyFit(mode) {
  if (!containerRef.value) return
  const cw = containerRef.value.offsetWidth  - RULER_SIZE
  const ch = containerRef.value.offsetHeight - RULER_SIZE
  if (mode === 'fit') {
    const fz = Math.min(
      (cw - FIT_PAD * 2) / (cardW.value * CSS_PX_PER_MM),
      (ch - FIT_PAD * 2) / (cardH.value * CSS_PX_PER_MM)
    )
    store.zoom = fz
    store.panX = (cw - cardW.value * CSS_PX_PER_MM * fz) / 2
    store.panY = (ch - cardH.value * CSS_PX_PER_MM * fz) / 2
  } else if (mode === '1:1') {
    store.zoom = 1
    store.panX = (cw - cardW.value * CSS_PX_PER_MM) / 2
    store.panY = (ch - cardH.value * CSS_PX_PER_MM) / 2
  }
}
```

Ruler ticks (outside scaled card): `px: store.panX + mm * CSS_PX_PER_MM * store.zoom`.

- [ ] **Step 5: Drop `:zoom` on AtomRenderer / ComponentRenderer / AlignmentGuidesOverlay** (props removed in later tasks; stop passing now).

- [ ] **Step 6: Dropzone uses `clientPointToCardMm`**

```js
const { x_mm: dropXmm, y_mm: dropYmm } = clientPointToCardMm(
  cardBoundaryRef.value, e.clientX, e.clientY, cardW.value, cardH.value
)
```

- [ ] **Step 7: Manual smoke**

Run: `npm run dev` → open a layout → zoom in/out: card scales as one unit; values in properties stay in mm.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/editor/EditorCanvas.vue
git commit -m "feat(canvas): CSS mm card world with viewport scale/translate zoom"
```

---

### Task 3: Drag, resize, drawing — pointer mapping without zoom-in-mmToPx

**Files:**
- Modify: `frontend/src/composables/useDragAndDrop.js`
- Modify: `frontend/src/composables/useDrawingMode.js`
- Modify: `frontend/src/components/editor/EditorCanvas.vue` (wire card ref into drag)

**Interfaces:**
- Consumes: `clientDeltaToCardMm`, `clientPointToCardMm`
- Produces: Drag/resize deltas in mm independent of baking zoom into `useMmScale`

- [ ] **Step 1: Change `useDragAndDrop` signature**

```js
/**
 * @param {object} store
 * @param {() => HTMLElement|null} getCardEl
 * @param {() => number} getCardWidthMm
 * @param {() => number} getCardHeightMm
 */
export function useDragAndDrop(store, getCardEl, getCardWidthMm, getCardHeightMm) {
```

In `onDragMove` / `onResizeMove`:

```js
const cardEl = getCardEl()
if (!cardEl) return
const { dx_mm, dy_mm } = clientDeltaToCardMm(
  cardEl,
  e.clientX - startMouse.x,
  e.clientY - startMouse.y,
  getCardWidthMm(),
  getCardHeightMm()
)
const newX = store.snap(startEl.x + dx_mm)
const newY = store.snap(startEl.y + dy_mm)
```

(Same pattern for resize using `dx_mm` / `dy_mm`.)

- [ ] **Step 2: Wire from EditorCanvas**

```js
const dragDrop = useDragAndDrop(
  store,
  () => cardBoundaryRef.value,
  () => cardW.value,
  () => cardH.value
)
```

Remove `useMmScale(zoom)` from drag path. Keep card-track hit test via `clientPointToCardMm` then subtract `el.x_mm` / `el.y_mm`.

- [ ] **Step 3: Fix `useDrawingMode.toAtomSvg`**

Replace `PX_PER_MM * zoom` math with:

```js
function toAtomSvg(clientX, clientY, cardBoundaryEl, el) {
  const { x_mm, y_mm } = clientPointToCardMm(
    cardBoundaryEl, clientX, clientY,
    /* card size from store.layout */ store.layout.width_mm || 63,
    Number(store.layout.height_mm) || 88
  )
  const localXmm = x_mm - el.x_mm
  const localYmm = y_mm - el.y_mm
  // Existing SVG internal SCALE: mm → SVG units
  return { x: localXmm * SCALE, y: localYmm * SCALE }
}
```

Remove `getZoom` parameter from `useDrawingMode` if unused.

- [ ] **Step 4: Manual test**

Drag and resize an element at 50%, 100%, 200% zoom — positions must match cursor; snap still in mm.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/useDragAndDrop.js frontend/src/composables/useDrawingMode.js frontend/src/components/editor/EditorCanvas.vue
git commit -m "fix(canvas): map pointer deltas via card rect instead of zoomed mmToPx"
```

---

### Task 4: Guides + handles in CSS mm layer

**Files:**
- Modify: `frontend/src/components/editor/AlignmentGuidesOverlay.vue`
- Modify: `frontend/src/components/editor/EditorCanvas.vue` (handle CSS)

**Interfaces:**
- Consumes: mm viewBox (no zoom prop)
- Produces: Guides/handles scale with the card world

- [ ] **Step 1: Rewrite AlignmentGuidesOverlay to mm viewBox**

```vue
<template>
  <svg
    class="alignment-guides"
    :width="mmCss(widthMm)"
    :height="mmCss(heightMm)"
    :viewBox="`0 0 ${widthMm} ${heightMm}`"
  >
    <!-- use g.x_mm, g.position_mm, etc. directly as SVG user units (= mm) -->
    <!-- stroke-width in mm user units, e.g. 0.15 / 0.35 -->
  </svg>
</template>

<script setup>
import { mmCss } from '@/utils/cssMm.js'
defineProps({
  guides: { type: Array, default: () => [] },
  widthMm: { type: Number, required: true },
  heightMm: { type: Number, required: true },
})
</script>
```

Remove `zoom` prop and `useMmScale`.

Keep line-style rules already in the component (`stroke-dasharray` by proximity) — only coordinate units change.

- [ ] **Step 2: Resize handles in mm**

In `EditorCanvas.vue` styles, replace px handle sizes with mm, e.g.:

```css
.resize-handle {
  position: absolute;
  width: 1.2mm;
  height: 1.2mm;
  /* ... */
}
.handle-n  { top: -0.6mm; left: 50%; transform: translateX(-50%); }
/* same pattern for other handles */
```

- [ ] **Step 3: Manual test**

Drag near edges/centers: guides appear aligned; handles stay attached to element corners at any zoom.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/editor/AlignmentGuidesOverlay.vue frontend/src/components/editor/EditorCanvas.vue
git commit -m "feat(guides): render alignment guides and handles in CSS mm space"
```

---

### Task 5: Atoms — CSS mm styles, remove zoom

**Files:**
- Modify: `frontend/src/atoms/components/useAtomScale.js` → replace with thin `mmCss` helper or delete after migration
- Modify every atom under `frontend/src/atoms/components/Atom*.vue` that uses `mmToPx` / `zoom`
- Modify: `frontend/src/components/editor/AtomRenderer.vue` (stop passing `zoom`)

**Interfaces:**
- Consumes: `mmCss` from `@/utils/cssMm.js`
- Produces: Atoms render lengths as CSS mm; no `zoom` prop

- [ ] **Step 1: Canonical pattern (apply to AtomTitle first)**

Before:

```js
fontSize: `${mmToPx(props.params.fontSize || 4.5)}px`,
```

After:

```js
import { mmCss } from '@/utils/cssMm.js'
// remove zoom prop
fontSize: mmCss(props.params.fontSize || 4.5),
letterSpacing: props.params.letterSpacing != null
  ? mmCss(props.params.letterSpacing)
  : undefined,
```

- [ ] **Step 2: Migrate all atoms that call `useAtomScale` / hardcode `MM_TO_PX * zoom`**

Checklist (update each file the same way — lengths → `mmCss`, drop `zoom` prop):

- `AtomTitle.vue`, `AtomText.vue`, `AtomRichText.vue`
- `AtomRectangle.vue`, `AtomLine.vue`, `AtomCadre.vue`, `AtomSeparator.vue`
- `AtomPastille.vue`, `AtomBadge.vue`, `AtomCounter.vue`, `AtomPrice.vue`
- `AtomResource.vue`, `AtomResourcePlaceholder.vue`, `AtomCaracteristique.vue`
- `AtomIcon.vue`, `AtomIconMap.vue`, `AtomImage.vue`, `AtomPicto.vue`
- `AtomDice8.vue`, `AtomDice12.vue`, `AtomDrawing.vue`
- `AtomCardType.vue`, `AtomCardPlaceholder.vue`, `AtomCardTrack.vue`
- `AtomTrak.vue`, `AtomTrakCorner.vue`, `AtomHexTile.vue`
- Background atoms: `AtomBackground*.vue` (only if they size with mmToPx)

Special cases:
- `AtomRichText.vue`: replace `dieSize * MM_TO_PX * zoom` with `mmCss(dieSize)`; pass no zoom to nested bits.
- SVG stroke widths that were in px: express in mm user units or `mmCss` on CSS presentation attributes.

- [ ] **Step 3: AtomRenderer — remove zoom prop**

```vue
<component
  :is="comp"
  :params="params"
  :width_mm="width_mm"
  :height_mm="height_mm"
  :selected="selected"
  :live-stroke="liveStroke"
/>
```

Delete `zoom` from `defineProps`.

- [ ] **Step 4: Delete or gut `useAtomScale.js`**

If nothing imports it, delete the file. Otherwise make it:

```js
export { mmCss as mmToPxStyle } from '@/utils/cssMm.js'
// DO NOT multiply by zoom
```

Prefer deletion once greps are clean.

- [ ] **Step 5: Grep gate**

Run: `rg "mmToPx|useAtomScale|:zoom=|MM_TO_PX \\*" frontend/src/atoms frontend/src/components/editor/AtomRenderer.vue`  
Expected: no card-render hits (Drawing SVG internal SCALE constants OK if documented as SVG units, not screen px).

- [ ] **Step 6: Manual test**

Zoom 50% / 100% / 200% on a layout with title + richText + cadre: text must not drift relative to boxes.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/atoms frontend/src/components/editor/AtomRenderer.vue
git commit -m "feat(atoms): render all card lengths as CSS mm without zoom"
```

---

### Task 6: ComponentRenderer + CardPreview same pipeline

**Files:**
- Modify: `frontend/src/components/editor/ComponentRenderer.vue`
- Modify: `frontend/src/components/cards/CardPreview.vue`
- Modify: `frontend/src/views/CardsView.vue` (preview zoom becomes outer scale if kept)

**Interfaces:**
- Consumes: `mmCss`
- Produces: Preview/editor components share CSS mm rendering; fit-to-slot via CSS `scale`, not zoomed `mmToPx`

- [ ] **Step 1: ComponentRenderer**

Inner definition box:

```js
width: mmCss(compW),
height: mmCss(compH),
transform: `scale(${sx}, ${sy})`,
transformOrigin: 'top left',
```

Child elements: `left/top/width/height` via `mmCss`. Do not pass `zoom` to `AtomRenderer`.

- [ ] **Step 2: CardPreview**

```js
const cardStyle = computed(() => ({
  position: 'relative',
  width: mmCss(cardW.value),
  height: mmCss(cardH.value),
  overflow: 'hidden',
}))

function elementStyle(el) {
  return {
    position: 'absolute',
    left: mmCss(el.x_mm),
    top: mmCss(el.y_mm),
    width: mmCss(el.width_mm),
    height: mmCss(el.height_mm),
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el._layerOpacity != null ? el._layerOpacity : undefined,
  }
}
```

If UI still wants a smaller preview, wrap with:

```js
const outerStyle = computed(() => ({
  width: mmCss(cardW.value),
  height: mmCss(cardH.value),
  transform: `scale(${props.zoom})`,
  transformOrigin: 'top left',
  flexShrink: 0,
}))
```

(or keep zoom default `1` and drop the prop later). Remove `useMmScale` from preview.

Inline component renderer inside CardPreview: same mm + CSS scale pattern as ComponentRenderer; delete `effectiveZoom`.

- [ ] **Step 3: Visual check**

CardsView preview modal and editor canvas must match proportions for the same layout.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/editor/ComponentRenderer.vue frontend/src/components/cards/CardPreview.vue frontend/src/views/CardsView.vue
git commit -m "feat(preview): align CardPreview/components on CSS mm rendering"
```

---

### Task 7: Print — card-only, scale 1, multi-card page breaks

**Files:**
- Create or modify print stylesheet (prefer scoped global): e.g. `frontend/src/styles/print-cards.css` imported from `main.js` or `CardsView.vue`
- Modify: `frontend/src/views/CardsView.vue` (print target markup + trigger)

**Interfaces:**
- Consumes: `CardPreview` at zoom 1
- Produces: Browser print shows only card zones; each card `break-inside: avoid`

- [ ] **Step 1: Add a print sheet container in CardsView** (can be visually hidden on screen)

```vue
<div class="print-sheet" aria-hidden="true">
  <div
    v-for="card in printCards"
    :key="card.id"
    class="print-card"
  >
    <CardPreview :layout="layoutFor(card)" :data="card.data || {}" :zoom="1" />
  </div>
</div>
```

Wire `printCards` to current selection or filtered list (product choice: selected cards if any, else visible list).

- [ ] **Step 2: Print CSS**

```css
@media print {
  body * { visibility: hidden; }
  .print-sheet, .print-sheet * { visibility: visible; }
  .print-sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  .print-card {
    break-inside: avoid;
    page-break-inside: avoid;
    break-after: page;
    page-break-after: always;
  }
  .print-card:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  /* Ensure no editor viewport transform leaks */
  .print-sheet .card-preview {
    transform: none !important;
  }
}
```

- [ ] **Step 3: Add a Print button** that calls `window.print()` after ensuring layouts are loaded.

- [ ] **Step 4: Manual test**

Print dialog: only cards; each card intact on its page; no toolbar/panels.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/CardsView.vue frontend/src/styles/print-cards.css frontend/src/main.js
git commit -m "feat(print): browser print card sheets with break-inside avoid"
```

---

### Task 8: Purge dead zoom-render code + docs

**Files:**
- Modify: `frontend/src/composables/useMmScale.js` (keep only if rulers still need a helper; otherwise document as screen-only)
- Modify: `specs/TSD-022-unites-mm-physiques.md` (add note: display via CSS mm + viewport transform)
- Create or update: `specs/TSD-025-css-mm-viewport-transform.md` (short TSD pointing at design doc) — optional if project wants TSD numbering; otherwise update TSD-001 / TSD-022 only
- Modify: `.cursorrules`, `CLAUDE.md` — render rule: CSS `mm`, zoom via transform only
- Modify: `specs/WORKPLAN.md` — checkboxes + session journal

**Interfaces:**
- Consumes: completed Tasks 1–7
- Produces: Clean greps + updated guidelines

- [ ] **Step 1: Grep purge**

Run:

```bash
rg -n "mmToPx\\(.*\\)|useMmScale\\(|useAtomScale|:zoom=\"store\\.zoom\"|MM_TO_PX \\* .*zoom" frontend/src
```

Fix remaining card-render offenders. Allowed leftovers:
- Ruler tick math using `CSS_PX_PER_MM * store.zoom`
- html2canvas thumbnail capture (px raster OK)

- [ ] **Step 2: Update guidelines**

In `.cursorrules` / `CLAUDE.md`, replace “mm → px via `mmToPx` × zoom” with:

- Card lengths: CSS `mm` via `mmCss()`
- Zoom/pan: viewport `translate` + `scale` only
- Pointer: `clientPointToCardMm` / `clientDeltaToCardMm`

- [ ] **Step 3: WORKPLAN session entry** (date 2026-07-18) summarizing design + plan + implementation status.

- [ ] **Step 4: Final acceptance checklist** (from design §9)

- [ ] Zoom: text does not drift vs boxes
- [ ] Properties mm values stable
- [ ] Grid/snap/guides/handles/arrows in mm world
- [ ] Drag/resize OK at multiple zooms
- [ ] Preview matches editor proportions
- [ ] Print: chrome hidden; cards unsplit
- [ ] No `mm * zoom` px card render path

- [ ] **Step 5: Commit**

```bash
git add specs .cursorrules CLAUDE.md frontend/src/composables/useMmScale.js
git commit -m "docs: align TSD/guidelines with CSS mm + viewport transform model"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| CSS mm card DOM | 2, 5, 6 |
| Viewport translate + scale | 2 |
| No zoom in atom sizing | 5, 8 |
| Grid/guides/handles in mm world | 2, 4 |
| Drag via getBoundingClientRect | 1, 3 |
| Preview same pipeline | 6 |
| Print card-only scale 1 | 7 |
| Multi-card break-inside avoid | 7 |
| No data re-migration | (none — explicit) |
| PDF lib deferred | Task 7 notes only browser print |

## Placeholder / consistency check

- Helper names stable: `mmCss`, `clientPointToCardMm`, `clientDeltaToCardMm`, `CSS_PX_PER_MM`
- `useDragAndDrop` no longer takes `mmScale`
- Atoms lose `zoom` before AtomRenderer stops providing it (Task 5 after Task 2 stops passing)

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-18-mm-css-viewport-transform.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
