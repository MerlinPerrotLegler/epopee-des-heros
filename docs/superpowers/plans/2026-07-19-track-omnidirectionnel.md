# Track type `omnidirectionnel` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Track texture type `omnidirectionnel` that matches droit/coin/impasse roles with auto-rotation always 0°, while still respecting `alignment` and allowing manual `coin` overrides.

**Architecture:** Seed a fourth row in `track_types`. Extend `isTextureCompatible` / `pickCoin` in `trackMatch.js`. Update orientation hints in Track media UI. No schema table changes beyond INSERT seed; no multi-type field.

**Tech Stack:** Vue 3, Express + SQLite/MySQL (`INSERT OR IGNORE` / `INSERT IGNORE`), `node:test`.

## Global Constraints

- Type name exactly: `omnidirectionnel` (id seed: `tt-omnidirectionnel`, color `#4ade80`)
- Compatible with any `requiredType` in `{droit, coin, impasse}`
- Still enforce `alignment` and `voisins`
- `pickCoin(*, 'omnidirectionnel')` always returns `0`
- Manual cell `coin` override unchanged
- Spec: `docs/superpowers/specs/2026-07-19-track-omnidirectionnel-design.md`
- Update `specs/WORKPLAN.md` journal at end

---

## File map

| File | Role |
|------|------|
| `frontend/src/utils/trackMatch.js` | Compatibility + pickCoin |
| `frontend/src/utils/trackMatch.test.js` | TDD coverage |
| `backend/db/schema.sql` | SQLite seed INSERT |
| `backend/db/database.js` | MySQL + SQLite runtime seed INSERT |
| `frontend/src/components/media/TrackMetaForm.vue` | Orientation hint |
| `frontend/src/components/editor/PlanTilesPanel.vue` | Orientation hint |
| `frontend/src/components/media/CheminPanel.vue` | Legend text if hardcoded 3 types |
| `specs/WORKPLAN.md` | Session journal |

---

### Task 1: Matching + `pickCoin` (TDD)

**Files:**
- Modify: `frontend/src/utils/trackMatch.js`
- Modify: `frontend/src/utils/trackMatch.test.js`

**Interfaces:**
- Consumes: existing `isTextureCompatible`, `pickCoin`
- Produces: same exports; omnidirectionnel semantics per spec §4

- [ ] **Step 1: Add failing tests**

Append to `trackMatch.test.js` (also import `pickCoin`):

```js
import {
  clearAllTextureOverrides,
  isTextureCompatible,
  pickCoin,
  propagateTextureOverrides,
  shuffleTrackTextures,
} from './trackMatch.js'

const omniH = { id: 10, type: 'omnidirectionnel', alignment: 'horizontal', voisins: [] }
const omniBoth = { id: 11, type: 'omnidirectionnel', alignment: 'both', voisins: [] }

describe('omnidirectionnel', () => {
  it('matches any required role when alignment OK', () => {
    for (const requiredType of ['droit', 'coin', 'impasse']) {
      assert.equal(
        isTextureCompatible(omniBoth, { requiredType, requiredAlignment: 'horizontal', neighborTextureIds: [] }),
        true,
      )
    }
  })
  it('still enforces alignment', () => {
    assert.equal(
      isTextureCompatible(omniH, { requiredType: 'droit', requiredAlignment: 'vertical', neighborTextureIds: [] }),
      false,
    )
    assert.equal(
      isTextureCompatible(omniH, { requiredType: 'coin', requiredAlignment: 'horizontal', neighborTextureIds: [] }),
      true,
    )
  })
  it('pickCoin always returns 0', () => {
    for (const dir of ['horizontal', 'vertical', 'up', 'down', 'left', 'right']) {
      assert.equal(pickCoin(dir, 'omnidirectionnel'), 0)
    }
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd frontend && node --test src/utils/trackMatch.test.js`
Expected: FAIL on omnidirectionnel compatibility / missing pickCoin import behavior

- [ ] **Step 3: Implement**

In `trackMatch.js` `pickCoin`, add near the top (after reading `dir`):

```js
if (textureType === 'omnidirectionnel') return 0
```

In `isTextureCompatible`:

```js
export function isTextureCompatible(texture, { requiredType, requiredAlignment, neighborTextureIds }) {
  if (!texture) return false
  const typeOk =
    texture.type === requiredType ||
    texture.type === 'omnidirectionnel'
  if (!typeOk) return false
  if (!alignmentMatches(texture.alignment, requiredAlignment)) return false
  return voisinsMatch(texture, neighborTextureIds)
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd frontend && node --test src/utils/trackMatch.test.js`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/trackMatch.js frontend/src/utils/trackMatch.test.js
git commit -m "$(cat <<'EOF'
feat(track): omnidirectionnel matches any role at coin 0

EOF
)"
```

---

### Task 2: Seed `track_types`

**Files:**
- Modify: `backend/db/schema.sql` (INSERT track_types)
- Modify: `backend/db/database.js` (MySQL `INSERT IGNORE` + SQLite `INSERT OR IGNORE` blocks)

**Interfaces:**
- Produces: row `('tt-omnidirectionnel', 'omnidirectionnel', '#4ade80')` on fresh and existing DBs

- [ ] **Step 1: Update `schema.sql`**

Extend the INSERT:

```sql
INSERT OR IGNORE INTO track_types (id, name, color) VALUES
  ('tt-droit', 'droit', '#6c7aff'),
  ('tt-coin', 'coin', '#c9a227'),
  ('tt-impasse', 'impasse', '#888888'),
  ('tt-omnidirectionnel', 'omnidirectionnel', '#4ade80');
```

- [ ] **Step 2: Update MySQL migration seed in `database.js`**

Find the `INSERT IGNORE INTO track_types ...` line (~151) and add the fourth tuple (same id/name/color). Keep idempotent.

- [ ] **Step 3: Update SQLite runtime seed in `database.js`**

Find the `INSERT OR IGNORE INTO track_types` block (~323–326) and add the same fourth row.

- [ ] **Step 4: Smoke**

If backend can restart locally: after boot, `GET /api/track-types` (or equivalent) should list `omnidirectionnel`.  
If no server: verify SQL strings contain the new id via grep.

- [ ] **Step 5: Commit**

```bash
git add backend/db/schema.sql backend/db/database.js
git commit -m "$(cat <<'EOF'
feat(db): seed track type omnidirectionnel

EOF
)"
```

---

### Task 3: UI hints + WORKPLAN

**Files:**
- Modify: `frontend/src/components/media/TrackMetaForm.vue` (`orientationHint`)
- Modify: `frontend/src/components/editor/PlanTilesPanel.vue` (orientation hint computed)
- Modify: `frontend/src/components/media/CheminPanel.vue` (legend line ~57 if it lists only 3 types)
- Modify: `specs/WORKPLAN.md`

**Interfaces:**
- Types list should already come from API in forms that load `track-types` — do not hardcode a closed list of 3 if one exists; if select is API-driven, only hints need updates.

- [ ] **Step 1: TrackMetaForm hint**

```js
const orientationHint = computed(() => {
  if (form.type === 'omnidirectionnel') {
    return 'Aucune orientation imposée — rotation auto = 0° (modifiable à la main).'
  }
  if (form.type === 'coin') return 'Orientation attendue : du haut vers la gauche.'
  if (form.type === 'impasse') return 'Orientation attendue : ouverture vers le haut.'
  return 'Orientation attendue : de gauche vers la droite.'
})
```

- [ ] **Step 2: PlanTilesPanel hint**

Mirror the same branch for `typeFilter === 'omnidirectionnel'` (and keep generic fallback mentioning omnidirectionnel if useful).

- [ ] **Step 3: CheminPanel legend**

Update the static orientation string to include omnidirectionnel (auto 0°).

- [ ] **Step 4: WORKPLAN journal**

Add line `2026-07-19 (N)` summarizing type omnidirectionnel (seed + matching + hints).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/media/TrackMetaForm.vue \
  frontend/src/components/editor/PlanTilesPanel.vue \
  frontend/src/components/media/CheminPanel.vue \
  specs/WORKPLAN.md \
  docs/superpowers/specs/2026-07-19-track-omnidirectionnel-design.md
git commit -m "$(cat <<'EOF'
docs+ui: omnidirectionnel hints and WORKPLAN entry

EOF
)"
```

(Include the design spec file in this commit if still untracked.)

---

## Spec coverage (self-review)

| Spec § | Task |
|--------|------|
| Seed `tt-omnidirectionnel` | Task 2 |
| `isTextureCompatible` typeOk | Task 1 |
| Alignment still enforced | Task 1 |
| `pickCoin` → 0 | Task 1 |
| Upload / filter hints | Task 3 |
| Manual coin UI | unchanged (no task) |
| WORKPLAN | Task 3 |
| Tests | Task 1 |

**Placeholders:** none  
**Name consistency:** `omnidirectionnel` / `tt-omnidirectionnel` / `#4ade80` everywhere
