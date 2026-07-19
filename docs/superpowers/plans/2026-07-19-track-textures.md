# Track Textures + TrakPath Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Track borders/pen strokes, add a Chemin/Track texture catalogue with meta + cell assignment (Vider/Propager/Mélanger), variable footprint layout, and a new `trakPath` atom.

**Architecture:** Track textures are media with `kind='track'` and JSON `track_meta` (logical dense `id`, type, alignment, voisins, margins ratios, label). Pure layout/matching helpers drive cell footprints and Mélanger. Atoms render textures instead of borders; PropertiesPanel + médiathèque own the UX. `trakPath` chains directional segments with canvas `+` affordances.

**Tech Stack:** Vue 3 Composition API, Pinia, Express ESM, better-sqlite3, `node --test` + `node:assert/strict`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-19-track-textures-design.md`
- Atoms in scope: `trak`, `trakCorner`, `cardTrack`, `trakPath` — **not** Plan (spec 2)
- `cellSize` is a **ratio** of the atom dimension along the track — not mm
- `margins` are **ratios relative to cell base size** — not mm
- Texture logical `id` = smallest free non-negative integer among existing track medias
- `textureSource`: `'user'` | `'system'` | null — system shown ~0.35 opacity in editor only
- No border / pen params or rendering on scoped atoms
- Card measures remain mm in store; zoom via viewport transform only
- Update `specs/WORKPLAN.md` journal at end of session

---

## File map

| File | Role |
|------|------|
| `backend/db/schema.sql` | Folders seed, `track_meta`, `track_types`, `track_tags`, `media_track_tags` |
| `backend/db/database.js` | Idempotent migrations + snapshot table list |
| `backend/routes/trackTypes.js` | CRUD types |
| `backend/routes/trackTags.js` | CRUD tags |
| `backend/routes/trackTextures.js` | Catalogue GET + PATCH meta + next-id helper |
| `backend/routes/media.js` | On upload to `chemin-track` → `kind='track'` + default meta |
| `backend/server.js` | Register routes |
| `frontend/src/utils/api.js` | Client methods |
| `frontend/src/utils/trackFootprint.js` | Base size + margins → footprint mm |
| `frontend/src/utils/trackFootprint.test.js` | Tests |
| `frontend/src/utils/trackMatch.js` | Compatibility + Mélanger + coin inference |
| `frontend/src/utils/trackMatch.test.js` | Tests |
| `frontend/src/utils/trakPathLayout.js` | Segments → cell list + bbox |
| `frontend/src/utils/trakPathLayout.test.js` | Tests |
| `frontend/src/utils/cardTrackLayout.js` | Consume variable footprints when overrides present |
| `frontend/src/atoms/index.js` | Params cleanup + `trakPath` + `cellSize` ratio |
| `frontend/src/atoms/paramHelp.js` | Help strings |
| `frontend/src/atoms/components/AtomTrak.vue` | Texture render, no borders |
| `frontend/src/atoms/components/AtomTrakCorner.vue` | Idem |
| `frontend/src/atoms/components/AtomCardTrack.vue` | Idem |
| `frontend/src/atoms/components/AtomTrakPath.vue` | New atom |
| `frontend/src/components/editor/AtomRenderer.vue` | Register `trakPath` |
| `frontend/src/components/editor/PropertiesPanel.vue` | Texture actions + cell UI + hide removed params |
| `frontend/src/components/editor/EditorCanvas.vue` | Hit-test path; `+` segment affordances |
| `frontend/src/components/media/*` | Track meta editor when folder/kind track |
| `specs/WORKPLAN.md` | Session journal |

---

### Task 1: Schema + migrations (folders, track_meta, types, tags)

**Files:**
- Modify: `backend/db/schema.sql`
- Modify: `backend/db/database.js`

**Interfaces:**
- Consumes: existing `media`, `media_folders` patterns
- Produces:
  - Folders: `chemin` (parent `root`), `chemin-track` (parent `chemin`)
  - Column `media.track_meta` TEXT NULL (JSON)
  - Tables `track_types`, `track_tags`, `media_track_tags`
  - Seed types: `droit`, `coin`, `impasse`

- [ ] **Step 1: Extend schema.sql**

Add after `media_folders` seed:

```sql
INSERT OR IGNORE INTO media_folders (id, name, parent_id) VALUES
  ('chemin', 'Chemin', 'root'),
  ('chemin-track', 'Track', 'chemin');
```

Add column to `media` create (and document for migrations):

```sql
-- in CREATE TABLE media (new installs):
track_meta TEXT,  -- JSON: { id, label, type, alignment, voisins, margins }
```

Add tables:

```sql
CREATE TABLE IF NOT EXISTS track_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#888888',
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO track_types (id, name, color) VALUES
  ('tt-droit', 'droit', '#6c7aff'),
  ('tt-coin', 'coin', '#c9a227'),
  ('tt-impasse', 'impasse', '#888888');

CREATE TABLE IF NOT EXISTS track_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#888888',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_track_tags (
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES track_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);
```

- [ ] **Step 2: Idempotent migrations in database.js**

Mirror picto pattern with `tryAlter`:

```js
await tryAlter(`ALTER TABLE media ADD COLUMN track_meta TEXT`)
await tryAlter(`CREATE TABLE IF NOT EXISTS track_types (...)`)
// … tags, junction, folder inserts, type seeds
```

Add `track_types`, `track_tags`, `media_track_tags` to `createSnapshot` / restore table lists.

- [ ] **Step 3: Commit**

```bash
git add backend/db/schema.sql backend/db/database.js
git commit -m "feat(db): track texture folders, meta, types and tags"
```

---

### Task 2: Backend API — types, tags, catalogue, upload kind

**Files:**
- Create: `backend/routes/trackTypes.js`
- Create: `backend/routes/trackTags.js`
- Create: `backend/routes/trackTextures.js`
- Modify: `backend/routes/media.js`
- Modify: `backend/services/mediaStorage.js` (include `track_meta` in list columns if needed)
- Modify: `backend/server.js`
- Modify: `frontend/src/utils/api.js`

**Interfaces:**
- Consumes: Task 1 schema
- Produces:
  - `GET/POST/PATCH/DELETE /api/track-types`
  - `GET/POST/PATCH/DELETE /api/track-tags`
  - `GET /api/track-textures?type=&tag=` → medias `kind='track'` + parsed `track_meta` + tags
  - `PATCH /api/track-textures/:mediaId` body `{ track_meta, tagIds? }` — if `track_meta.id` omitted on create path, assign smallest free id
  - `allocateTrackId(db): Promise<number>`
  - Upload to folder `chemin-track` sets `kind='track'` and default `track_meta`

- [ ] **Step 1: Implement allocateTrackId + trackTextures router**

```js
// backend/routes/trackTextures.js
export async function allocateTrackId(db) {
  const rows = await db.prepare(
    `SELECT track_meta FROM media WHERE kind = 'track' AND track_meta IS NOT NULL`
  ).all()
  const used = new Set()
  for (const r of rows) {
    try {
      const m = typeof r.track_meta === 'string' ? JSON.parse(r.track_meta) : r.track_meta
      if (m && Number.isInteger(m.id) && m.id >= 0) used.add(m.id)
    } catch { /* skip */ }
  }
  let id = 0
  while (used.has(id)) id++
  return id
}

function defaultTrackMeta(id) {
  return {
    id,
    label: null,
    type: 'droit',
    alignment: 'both',
    voisins: [],
    margins: { left: 0, right: 0, top: 0, bottom: 0 },
  }
}
```

Wire GET list (join tags), PATCH merge meta + replace tag links (copy picto pattern from `pictos.js` / `pictoTags.js`).

- [ ] **Step 2: CRUD trackTypes / trackTags**

Copy structure from `backend/routes/pictoTags.js` with table renames.

- [ ] **Step 3: media upload hook**

When `folder_id === 'chemin-track'`:

```js
kind = 'track'
const id = await allocateTrackId(db)
track_meta = JSON.stringify(defaultTrackMeta(id))
```

Ensure INSERT includes `track_meta`.

- [ ] **Step 4: Register routes + api.js**

```js
// server.js
app.use('/api/track-types', trackTypesRouter)
app.use('/api/track-tags', trackTagsRouter)
app.use('/api/track-textures', trackTexturesRouter)
```

```js
// api.js
getTrackTypes: () => req('GET', '/track-types'),
createTrackType: (body) => req('POST', '/track-types', body),
// … tags + getTrackTextures, patchTrackTexture
```

- [ ] **Step 5: Manual smoke**

Restart backend, `curl -s localhost:<port>/api/track-types` → 3 seeded types.  
`curl -s localhost:<port>/api/media/folders` includes `chemin` / `chemin-track`.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/trackTypes.js backend/routes/trackTags.js backend/routes/trackTextures.js backend/routes/media.js backend/services/mediaStorage.js backend/server.js frontend/src/utils/api.js
git commit -m "feat(api): track texture catalogue, types and tags"
```

---

### Task 3: Pure helpers — footprint + matching (TDD)

**Files:**
- Create: `frontend/src/utils/trackFootprint.js`
- Create: `frontend/src/utils/trackFootprint.test.js`
- Create: `frontend/src/utils/trackMatch.js`
- Create: `frontend/src/utils/trackMatch.test.js`

**Interfaces:**
- Consumes: none
- Produces:
  - `baseCellSizeMm({ cellSize, axisLengthMm }): number` — `Math.max(0, cellSize) * axisLengthMm` with `cellSize` clamped to `(0,1]` if desired
  - `cellFootprintMm(baseW, baseH, margins): { w, h, insetLeft, insetRight, insetTop, insetBottom }` where each inset = `base * marginSide`, `w = baseW + insetLeft + insetRight` (negative margin shrinks)
  - `isTextureCompatible(texture, { requiredType, requiredAlignment, neighborTextureIds }): boolean`
  - `pickCoin(requiredOrientation, textureType): 0|90|180|270` — maps upload convention to case orientation
  - `shuffleTrackTextures({ cells, textures, existingOverrides }): overrides` — preserves `textureSource==='user'`; fills others with `system` or leaves empty

- [ ] **Step 1: Write footprint tests**

```js
// frontend/src/utils/trackFootprint.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { baseCellSizeMm, cellFootprintMm } from './trackFootprint.js'

describe('baseCellSizeMm', () => {
  it('multiplies ratio by axis length', () => {
    assert.equal(baseCellSizeMm({ cellSize: 0.1, axisLengthMm: 50 }), 5)
  })
})

describe('cellFootprintMm', () => {
  it('expands with positive margins and shrinks with negative', () => {
    const a = cellFootprintMm(10, 10, { left: 0.1, right: 0.1, top: 0, bottom: 0 })
    assert.equal(a.w, 12)
    assert.equal(a.h, 10)
    const b = cellFootprintMm(10, 10, { left: -0.1, right: 0, top: 0, bottom: 0 })
    assert.equal(b.w, 9)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd frontend && node --test src/utils/trackFootprint.test.js
```

Expected: FAIL module not found / export missing

- [ ] **Step 3: Implement trackFootprint.js**

```js
export function baseCellSizeMm({ cellSize, axisLengthMm }) {
  const r = Number(cellSize)
  const axis = Number(axisLengthMm)
  if (!(axis > 0) || !(r > 0)) return 0
  return r * axis
}

export function cellFootprintMm(baseW, baseH, margins = {}) {
  const m = {
    left: Number(margins.left) || 0,
    right: Number(margins.right) || 0,
    top: Number(margins.top) || 0,
    bottom: Number(margins.bottom) || 0,
  }
  const insetLeft = baseW * m.left
  const insetRight = baseW * m.right
  const insetTop = baseH * m.top
  const insetBottom = baseH * m.bottom
  return {
    w: baseW + insetLeft + insetRight,
    h: baseH + insetTop + insetBottom,
    insetLeft, insetRight, insetTop, insetBottom,
  }
}
```

- [ ] **Step 4: Run footprint tests — PASS**

- [ ] **Step 5: Write match tests**

```js
// frontend/src/utils/trackMatch.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isTextureCompatible, shuffleTrackTextures } from './trackMatch.js'

const t0 = { id: 0, type: 'droit', alignment: 'horizontal', voisins: [1] }
const t1 = { id: 1, type: 'droit', alignment: 'horizontal', voisins: [0] }
const t2 = { id: 2, type: 'coin', alignment: 'both', voisins: [] }

describe('isTextureCompatible', () => {
  it('requires type and alignment', () => {
    assert.equal(isTextureCompatible(t0, { requiredType: 'droit', requiredAlignment: 'horizontal', neighborTextureIds: [] }), true)
    assert.equal(isTextureCompatible(t0, { requiredType: 'coin', requiredAlignment: 'horizontal', neighborTextureIds: [] }), false)
    assert.equal(isTextureCompatible(t2, { requiredType: 'coin', requiredAlignment: 'vertical', neighborTextureIds: [] }), true)
  })
  it('enforces voisins when neighbors present', () => {
    assert.equal(isTextureCompatible(t0, { requiredType: 'droit', requiredAlignment: 'horizontal', neighborTextureIds: [1] }), true)
    assert.equal(isTextureCompatible(t0, { requiredType: 'droit', requiredAlignment: 'horizontal', neighborTextureIds: [9] }), false)
  })
})

describe('shuffleTrackTextures', () => {
  it('keeps user overrides and fills others as system', () => {
    const cells = [
      { idx: 0, requiredType: 'droit', requiredAlignment: 'horizontal', neighborIdxs: [1] },
      { idx: 1, requiredType: 'droit', requiredAlignment: 'horizontal', neighborIdxs: [0] },
    ]
    const existing = { 0: { textureId: 0, coin: 0, textureSource: 'user' } }
    const out = shuffleTrackTextures({ cells, textures: [t0, t1], existingOverrides: existing })
    assert.equal(out[0].textureSource, 'user')
    assert.equal(out[0].textureId, 0)
    assert.ok(!out[1] || out[1].textureSource === 'system' || out[1].textureId == null)
  })
})
```

- [ ] **Step 6: Implement trackMatch.js to pass tests**

Rules:
- `alignment === 'both'` matches any required alignment
- If `neighborTextureIds.length === 0`, skip voisins check
- Else every neighbor id must be listed in `texture.voisins` **or** empty `voisins` means “any” — **spec:** voisins lists allowed adjacent texture ids; empty array = no restriction
- `shuffleTrackTextures`: clone user entries; for other cells pick first compatible (deterministic order by texture.id); set `coin` via `pickCoin`

- [ ] **Step 7: Run match tests — PASS**

```bash
cd frontend && node --test src/utils/trackFootprint.test.js src/utils/trackMatch.test.js
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/trackFootprint.js frontend/src/utils/trackFootprint.test.js frontend/src/utils/trackMatch.js frontend/src/utils/trackMatch.test.js
git commit -m "feat(track): footprint and shuffle matching helpers"
```

---

### Task 4: Atom registry — strip borders/pen, cellSize ratio, cellOverride shape

**Files:**
- Modify: `frontend/src/atoms/index.js`
- Modify: `frontend/src/atoms/paramHelp.js`

**Interfaces:**
- Consumes: Task 3 concepts
- Produces: updated `defaultParams` for `trak`, `trakCorner`, `cardTrack`; stub `trakPath` entry (render in Task 6)

- [ ] **Step 1: Update trak / trakCorner / cardTrack defaults**

Remove: `borderColor`, `borderWidth`, `borderTop/Right/Bottom/Left`, `penStyle`, `penSeed*`, `penPoolSize`, `penColor`, `penWidth`.

Replace `cellSize_mm` with `cellSize: 0.1` on `trak`.

Document `cellOverrides` as `{ textureId, coin, textureSource }`.

Add `trakPath`:

```js
trakPath: {
  label: 'Trak Path',
  icon: '⤷',
  defaultParams: {
    cellSize: 0.1,
    n_start: 0,
    segments: [{ direction: 'right', count: 5 }],
    bgColor: null,
    textColor: null,
    fontSize: 2.5,
    fontFamily: null,
    cellOverrides: {},
  },
  defaultSize: { width_mm: 55, height_mm: 25 },
},
```

- [ ] **Step 2: Update paramHelp.js** — remove pen/border helps for tracks; add `cellSize`, `segments`, texture fields.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/atoms/index.js frontend/src/atoms/paramHelp.js
git commit -m "refactor(atoms): track params without borders; add trakPath stub"
```

---

### Task 5: Render textures on trak / trakCorner / cardTrack

**Files:**
- Modify: `frontend/src/atoms/components/AtomTrak.vue`
- Modify: `frontend/src/atoms/components/AtomTrakCorner.vue`
- Modify: `frontend/src/atoms/components/AtomCardTrack.vue`
- Modify: `frontend/src/utils/cardTrackLayout.js` (sequential footprints)
- Create: `frontend/src/composables/useTrackTextures.js`

**Interfaces:**
- Consumes: `trackFootprint`, catalogue map `logicalId → { mediaId, margins, … }`
- Produces: SVG/image cells without strokes; editor opacity for `system`

- [ ] **Step 1: Layout placement without overlap**

For `AtomTrak`: compute `base = baseCellSizeMm(...)` (square base); for each cell index, resolve margins from assigned texture (or zeros); place at running offset along axis using `cellFootprintMm(...).w` or `.h`.

For CardTrack: adapt `buildCardTrackCells` to accept optional per-index footprint sizes; keep numbering/corners logic; positions accumulate along each edge.

- [ ] **Step 2: Draw texture**

Use `<image>` href `/uploads/<mediaUuid>` (or existing upload URL pattern), size = footprint, `transform` rotate by `coin` around center. Number text above. If `textureSource==='system'` and not print mode, `opacity="0.35"`.

Remove all pen/border drawing code paths.

- [ ] **Step 3: Wire catalogue lookup**

Composable `useTrackTextures()` loads `api.getTrackTextures()` once and exposes `byLogicalId`.

- [ ] **Step 4: Manual visual check** in editor — track without borders; assign override manually in JSON if UI not ready yet.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/atoms/components/AtomTrak.vue frontend/src/atoms/components/AtomTrakCorner.vue frontend/src/atoms/components/AtomCardTrack.vue frontend/src/utils/cardTrackLayout.js frontend/src/composables/useTrackTextures.js
git commit -m "feat(track): render textures and variable footprints"
```

---

### Task 6: `trakPath` layout helper + AtomTrakPath + canvas `+`

**Files:**
- Create: `frontend/src/utils/trakPathLayout.js`
- Create: `frontend/src/utils/trakPathLayout.test.js`
- Create: `frontend/src/atoms/components/AtomTrakPath.vue`
- Modify: `frontend/src/components/editor/AtomRenderer.vue`
- Modify: `frontend/src/components/editor/EditorCanvas.vue`
- Modify: `frontend/src/stores/editor.js` (optional: `appendTrakPathSegment(elId, direction)`)

**Interfaces:**
- Consumes: `trackFootprint`, Task 5 render patterns
- Produces:
  - `buildTrakPathCells({ segments, cellSize, n_start, cellOverrides, texturesById, width_mm, height_mm }): { cells, contentW, contentH }`
  - Each cell: `{ idx, n, x, y, w, h, direction, role: 'droit'|'coin'|'impasse', requiredAlignment }`
  - Orthogonal directions helper: `orthogonalDirections(lastDirection): ('up'|'down'|'left'|'right')[]`

- [ ] **Step 1: Write layout tests**

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildTrakPathCells, orthogonalDirections } from './trakPathLayout.js'

describe('orthogonalDirections', () => {
  it('returns perpendiculars', () => {
    assert.deepEqual(orthogonalDirections('right').sort(), ['down', 'up'].sort())
  })
})

describe('buildTrakPathCells', () => {
  it('chains right then down with continuous numbering', () => {
    const { cells } = buildTrakPathCells({
      segments: [
        { direction: 'right', count: 3 },
        { direction: 'down', count: 2 },
      ],
      cellSize: 0.2,
      n_start: 0,
      cellOverrides: {},
      texturesById: {},
      width_mm: 50,
      height_mm: 50,
    })
    assert.equal(cells.length, 5)
    assert.equal(cells[0].n, 0)
    assert.equal(cells[4].n, 4)
  })
})
```

Role rule: **impasse** = first and last cell of the whole path; **coin** = first cell of every segment after the first; else **droit**.

- [ ] **Step 2: Implement trakPathLayout.js until tests pass**

Placement: start at (0,0); for each cell advance by footprint along current direction; update bbox.

- [ ] **Step 3: AtomTrakPath.vue** — render like AtomTrak using `buildTrakPathCells`; show selection highlight on `activeCellIdx`.

- [ ] **Step 4: Register in AtomRenderer**

```js
trakPath: AtomTrakPath,
```

- [ ] **Step 5: EditorCanvas `+` affordances**

When selected element is `trakPath`, compute last cell center in card mm; render two `+` buttons in orthogonal directions (HTML overlay or SVG); click →

```js
const segs = [...el.params.segments]
segs.push({ direction, count: 3 })
store.updateElementParam(el.id, 'segments', segs)
```

Hit-test: reuse cell list for `activeCellIdx` like CardTrack.

- [ ] **Step 6: Manual check** — create TrakPath, click `+`, see new segment.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/utils/trakPathLayout.js frontend/src/utils/trakPathLayout.test.js frontend/src/atoms/components/AtomTrakPath.vue frontend/src/components/editor/AtomRenderer.vue frontend/src/components/editor/EditorCanvas.vue frontend/src/stores/editor.js
git commit -m "feat(atoms): TrakPath segments with orthogonal add controls"
```

---

### Task 7: PropertiesPanel — Vider / Propager / Mélanger + per-cell picker

**Files:**
- Modify: `frontend/src/components/editor/PropertiesPanel.vue`
- Create: `frontend/src/components/editor/TrackTexturePicker.vue`

**Interfaces:**
- Consumes: `useTrackTextures`, `shuffleTrackTextures`, `isTextureCompatible`
- Produces: UI actions writing `cellOverrides`

- [ ] **Step 1: Global buttons** for atom types in `TRACK_ATOMS = ['trak','trakCorner','cardTrack','trakPath']`

```js
function clearAllTextures() {
  updateParam('cellOverrides', {})
}

function propagateTexture(textureId, coin = 0) {
  const cells = /* enumerate idxs from layout helper for current atom */
  const overrides = {}
  for (const idx of cells) {
    overrides[idx] = { textureId, coin, textureSource: 'user' }
  }
  updateParam('cellOverrides', overrides)
}

function shuffleAll() {
  const cells = /* with roles + neighborIdxs */
  const next = shuffleTrackTextures({
    cells,
    textures: trackTextures.value,
    existingOverrides: el.value.params.cellOverrides || {},
  })
  updateParam('cellOverrides', next)
}
```

Propager: modal listing textures (thumb + id + label); on confirm call `propagateTexture`.

- [ ] **Step 2: Per-cell section**

Replace/extend svgMediaId UI with:
- textureId number / picker
- coin select 0/90/180/270
- button Mélanger (single cell)
- picker list: compatible, separator, rest; selecting sets `textureSource: 'user'`

- [ ] **Step 3: Hide obsolete params** — filter legacy border/pen keys in `isParamHidden` if present on old layouts.

- [ ] **Step 4: Segments editor for trakPath** — list direction/count; delete last segment button.

- [ ] **Step 5: Manual QA checklist** from spec §11 items 3–4, 6–7.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/editor/PropertiesPanel.vue frontend/src/components/editor/TrackTexturePicker.vue
git commit -m "feat(editor): track texture clear, propagate, shuffle UI"
```

---

### Task 8: Médiathèque — edit track_meta + tags/types

**Files:**
- Modify: media library components under `frontend/src/components/media/` (or views that edit media detail)
- Create: `frontend/src/components/media/TrackMetaForm.vue` if cleaner as extract

**Interfaces:**
- Consumes: Task 2 API
- Produces: form fields id (readonly), label, type select, alignment, voisins multi, margins 4 numbers, tags multi; save via PATCH

- [ ] **Step 1: Locate media detail / upload UI** and add TrackMetaForm when `kind==='track'` or folder `chemin-track`.

- [ ] **Step 2: On upload into chemin-track**, after upload refresh show meta form (id already allocated server-side).

- [ ] **Step 3: Minimal CRUD** for track types/tags (inline create like Pictorgame tags).

- [ ] **Step 4: Filter** catalogue by type/tag in picker + library.

- [ ] **Step 5: Show upload orientation hints** in the form (droit L→R, coin haut→gauche, impasse haut).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/media/
git commit -m "feat(media): Track texture metadata editor in library"
```

---

### Task 9: WORKPLAN + acceptance sweep

**Files:**
- Modify: `specs/WORKPLAN.md`

- [x] **Step 1: Run all new unit tests**

```bash
cd frontend && node --test src/utils/trackFootprint.test.js src/utils/trackMatch.test.js src/utils/trakPathLayout.test.js
```

Expected: all PASS

- [x] **Step 2: Manual acceptance** against spec §11 (1–7)

- [x] **Step 3: Update WORKPLAN.md** — checkboxes, %, next actions, session journal line for 2026-07-19 Track textures / TrakPath

- [x] **Step 4: Commit**

```bash
git add specs/WORKPLAN.md
git commit -m "docs: WORKPLAN entry for track textures and TrakPath"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Remove borders/pen | 4, 5 |
| Chemin/Track folders + meta + dense id | 1, 2 |
| Types addable + optional tags | 1, 2, 8 |
| cellOverrides textureId/coin/source | 4, 5, 7 |
| Vider / Propager / Mélanger + per-cell | 3, 7 |
| cellSize ratio + margins ratio footprints | 3, 5 |
| Upload orientation convention (docs/UI hint) | 8 (help text); no file mutation |
| trakPath + orthogonal `+` | 6, 7 |
| Plan atom | Out of scope ✓ |

No TBD placeholders left in tasks. Interface names consistent: `allocateTrackId`, `cellFootprintMm`, `shuffleTrackTextures`, `buildTrakPathCells`.
