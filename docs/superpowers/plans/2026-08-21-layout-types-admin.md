# Types de layout (admin CRUD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d’ajouter, renommer (libellé) et supprimer les types de layout (`card_types`) depuis Configuration et depuis la modale layout, sans toucher au `code` des layouts existants.

**Architecture:** Helper pur `slugifyTypeCode` / `normalizeNewType` (backend, source de vérité). Routes `card-types` étendues (GET `usage_count`, POST slug+409, PATCH label, DELETE avec garde `dos`). UI : onglet Config + composant `CardTypeSelect` (création inline). Badges = libellé, fallback code.

**Tech Stack:** Vue 3 `<script setup>`, Express ESM, better-sqlite3 / MySQL via `getDb()`, `node:test` + `node:assert/strict`.

## Global Constraints

- Spec canonique : `specs/TSD-029-types-de-layout.md`
- Table `card_types` inchangée (pas de migration de colonnes)
- Le `code` ne se renomme jamais ; `layouts.card_type` stocke le code
- `dos` : DELETE → 409 ; pas de bouton supprimer en UI ; libellé PATCH OK
- POST : plus d’`INSERT OR IGNORE` ; doublon → 409 `Ce code existe déjà`
- Serveur re-normalise toujours le code ; le preview UI n’est pas la source de vérité
- Seed historique (`cestpasjuste`, etc.) : ne pas réécrire
- Couleur / icône par type : hors scope
- Mesures mm : N/A (pas de rendu carte)
- Tests : `node --test` (glob `package.json` → `backend/**/*.test.js` et `frontend/src/utils/**/*.test.js`)
- Commits : uniquement si l’utilisateur le demande explicitement ; les steps « Commit » ci-dessous sont optionnels et à sauter sinon

---

## File map

| File | Role |
|------|------|
| `backend/utils/typeCode.js` | `slugifyTypeCode`, `normalizeNewType`, `assertCanDeleteType`, `PROTECTED_TYPE_CODE` |
| `backend/utils/typeCode.test.js` | Tests helper |
| `backend/routes/cardTypes.js` | GET/POST/PATCH/DELETE |
| `frontend/src/utils/typeCode.js` | Re-export slug + `typeLabel` + `CREATE_TYPE_SENTINEL` |
| `frontend/src/utils/typeCode.test.js` | Tests `typeLabel` + slug (via re-export) |
| `frontend/src/utils/api.js` | `updateCardType`, `deleteCardType` ; POST inchangé |
| `frontend/src/components/config/CardTypesPanel.vue` | CRUD Config |
| `frontend/src/views/ConfigView.vue` | Onglet Types |
| `frontend/src/components/layouts/CardTypeSelect.vue` | Select + création inline |
| `frontend/src/components/layouts/LayoutSettingsModal.vue` | Remplacer le `<select>` Type |
| `frontend/src/views/LayoutsView.vue` | Select verso + badges + merge types |
| `frontend/src/components/editor/EditorToolbar.vue` | Badge libellé + merge types |
| `specs/TSD-029-types-de-layout.md` | Status → Done quand les critères sont verts |
| `specs/WORKPLAN.md` | Cocher TSD-029 + journal |

---

### Task 1: Helper `typeCode` (slug + normalize + garde dos)

**Files:**
- Create: `backend/utils/typeCode.js`
- Test: `backend/utils/typeCode.test.js`

**Interfaces:**
- Produces:
  - `PROTECTED_TYPE_CODE` = `'dos'`
  - `slugifyTypeCode(input: unknown) → string`
  - `normalizeNewType({ label, code }?: object) → { ok: true, label: string, code: string } | { ok: false, status: 400, error: string }`
  - `assertCanDeleteType(code: string) → { ok: true } | { ok: false, status: 409, error: string }`

- [ ] **Step 1: Write the failing test**

Create `backend/utils/typeCode.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PROTECTED_TYPE_CODE,
  slugifyTypeCode,
  normalizeNewType,
  assertCanDeleteType,
} from './typeCode.js'

describe('slugifyTypeCode', () => {
  it('lowercases, strips accents, and turns non-alnum into underscores', () => {
    assert.equal(slugifyTypeCode('Faveur Royale'), 'faveur_royale')
    assert.equal(slugifyTypeCode('Épopée'), 'epopee')
  })

  it('collapses and trims underscores', () => {
    assert.equal(slugifyTypeCode('  Foo---Bar  '), 'foo_bar')
    assert.equal(slugifyTypeCode('_x_'), 'x')
  })

  it('returns empty string when nothing remains', () => {
    assert.equal(slugifyTypeCode('!!!'), '')
    assert.equal(slugifyTypeCode(''), '')
    assert.equal(slugifyTypeCode(null), '')
  })
})

describe('normalizeNewType', () => {
  it('requires a trimmed label', () => {
    assert.deepEqual(normalizeNewType({ label: '  ' }), {
      ok: false,
      status: 400,
      error: 'Le libellé est requis',
    })
  })

  it('slugs from label when code is empty', () => {
    assert.deepEqual(normalizeNewType({ label: 'Faveur Royale', code: '' }), {
      ok: true,
      label: 'Faveur Royale',
      code: 'faveur_royale',
    })
  })

  it('slugs a provided code', () => {
    assert.deepEqual(normalizeNewType({ label: 'Monstres', code: 'Faveur Royale' }), {
      ok: true,
      label: 'Monstres',
      code: 'faveur_royale',
    })
  })

  it('rejects a code that slugs to empty', () => {
    assert.deepEqual(normalizeNewType({ label: 'X', code: '!!!' }), {
      ok: false,
      status: 400,
      error: 'Code invalide',
    })
  })
})

describe('assertCanDeleteType', () => {
  it('blocks dos', () => {
    assert.equal(PROTECTED_TYPE_CODE, 'dos')
    assert.deepEqual(assertCanDeleteType('dos'), {
      ok: false,
      status: 409,
      error: 'Le type dos ne peut pas être supprimé',
    })
  })

  it('allows other codes', () => {
    assert.deepEqual(assertCanDeleteType('quete'), { ok: true })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test backend/utils/typeCode.test.js`

Expected: FAIL (MODULE_NOT_FOUND `./typeCode.js`)

- [ ] **Step 3: Write minimal implementation**

Create `backend/utils/typeCode.js`:

```js
export const PROTECTED_TYPE_CODE = 'dos'

export function slugifyTypeCode(input) {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function normalizeNewType({ label, code } = {}) {
  const trimmedLabel = String(label ?? '').trim()
  if (!trimmedLabel) {
    return { ok: false, status: 400, error: 'Le libellé est requis' }
  }
  const rawCode = String(code ?? '').trim()
  const slug = slugifyTypeCode(rawCode || trimmedLabel)
  if (!slug) {
    return { ok: false, status: 400, error: 'Code invalide' }
  }
  return { ok: true, label: trimmedLabel, code: slug }
}

export function assertCanDeleteType(code) {
  if (code === PROTECTED_TYPE_CODE) {
    return { ok: false, status: 409, error: 'Le type dos ne peut pas être supprimé' }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `node --test backend/utils/typeCode.test.js`

Expected: PASS (all tests)

- [ ] **Step 5: Commit (si demandé)**

```bash
git add backend/utils/typeCode.js backend/utils/typeCode.test.js
git commit -m "$(cat <<'EOF'
feat: helper slugify/normalize des types de layout

EOF
)"
```

---

### Task 2: Routes `card-types` (GET usage, POST 409, PATCH, DELETE dos)

**Files:**
- Modify: `backend/routes/cardTypes.js` (replace entire file)

**Interfaces:**
- Consumes: `normalizeNewType`, `assertCanDeleteType` from `backend/utils/typeCode.js`
- Produces HTTP:
  - `GET /` → `[{ code, label, created_at, usage_count }]`
  - `POST /` body `{ label, code? }` → 201 `{ code, label, usage_count }`
  - `PATCH /:code` body `{ label }` → 200 row
  - `DELETE /:code` → `{ ok: true }` ; 409 si `dos` ; 404 si inconnu

- [ ] **Step 1: Write the failing test**

There is no HTTP harness. Add route-level tests that import the **same error strings** by exercising helpers already covered, then add `backend/routes/cardTypes.test.js` that documents the SQL + unique-error mapping via a tiny exported helper. Put this in `backend/utils/typeCode.js` (same module — avoid a second file):

Add to `backend/utils/typeCode.test.js`:

```js
import { isUniqueConstraintError } from './typeCode.js'

describe('isUniqueConstraintError', () => {
  it('detects sqlite and mysql duplicates', () => {
    assert.equal(isUniqueConstraintError({ code: 'SQLITE_CONSTRAINT_UNIQUE' }), true)
    assert.equal(isUniqueConstraintError({ message: 'Duplicate entry' }), true)
    assert.equal(isUniqueConstraintError({ message: 'UNIQUE constraint failed' }), true)
    assert.equal(isUniqueConstraintError({ message: 'other' }), false)
  })
})
```

This will FAIL until `isUniqueConstraintError` is exported.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test backend/utils/typeCode.test.js`

Expected: FAIL (`isUniqueConstraintError` is not a function / not exported)

- [ ] **Step 3: Implement helper + rewrite the route**

Append to `backend/utils/typeCode.js`:

```js
export function isUniqueConstraintError(err) {
  const msg = String(err?.message || '')
  return err?.code === 'SQLITE_CONSTRAINT'
    || err?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || msg.includes('UNIQUE constraint failed')
    || msg.includes('Duplicate entry')
}
```

Replace `backend/routes/cardTypes.js` with:

```js
import { Router } from 'express'
import { getDb } from '../db/database.js'
import {
  assertCanDeleteType,
  isUniqueConstraintError,
  normalizeNewType,
} from '../utils/typeCode.js'

const router = Router()

const TYPE_LIST_SQL = `
  SELECT t.code, t.label, t.created_at,
    (SELECT COUNT(*) FROM layouts l WHERE l.card_type = t.code) AS usage_count
  FROM card_types t
  ORDER BY t.label
`

function withUsage(row) {
  if (!row) return null
  return { ...row, usage_count: Number(row.usage_count) || 0 }
}

async function getTypeRow(db, code) {
  const row = await db.prepare(`
    SELECT t.code, t.label, t.created_at,
      (SELECT COUNT(*) FROM layouts l WHERE l.card_type = t.code) AS usage_count
    FROM card_types t
    WHERE t.code = ?
  `).get(code)
  return withUsage(row)
}

router.get('/', async (_req, res) => {
  const db = getDb()
  const rows = await db.prepare(TYPE_LIST_SQL).all()
  res.json(rows.map(withUsage))
})

router.post('/', async (req, res) => {
  const parsed = normalizeNewType(req.body || {})
  if (!parsed.ok) return res.status(parsed.status).json({ error: parsed.error })
  const db = getDb()
  try {
    await db.prepare('INSERT INTO card_types (code, label) VALUES (?, ?)').run(parsed.code, parsed.label)
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: 'Ce code existe déjà' })
    }
    throw err
  }
  res.status(201).json(await getTypeRow(db, parsed.code))
})

router.patch('/:code', async (req, res) => {
  const db = getDb()
  const existing = await db.prepare('SELECT code FROM card_types WHERE code = ?').get(req.params.code)
  if (!existing) return res.status(404).json({ error: 'Type introuvable' })
  const label = String(req.body?.label ?? '').trim()
  if (!label) return res.status(400).json({ error: 'Le libellé est requis' })
  await db.prepare('UPDATE card_types SET label = ? WHERE code = ?').run(label, req.params.code)
  res.json(await getTypeRow(db, req.params.code))
})

router.delete('/:code', async (req, res) => {
  const guard = assertCanDeleteType(req.params.code)
  if (!guard.ok) return res.status(guard.status).json({ error: guard.error })
  const db = getDb()
  const existing = await db.prepare('SELECT code FROM card_types WHERE code = ?').get(req.params.code)
  if (!existing) return res.status(404).json({ error: 'Type introuvable' })
  await db.prepare('DELETE FROM card_types WHERE code = ?').run(req.params.code)
  res.json({ ok: true })
})

export default router
```

Do **not** keep `insertOrIgnoreInto`. Do **not** slugify `:code` on PATCH/DELETE (seed codes stay as stored).

- [ ] **Step 4: Run tests and make sure they pass**

Run: `node --test backend/utils/typeCode.test.js`

Expected: PASS

Smoke (optional, server must be running + session) : `GET /api/card-types` includes `usage_count`.

- [ ] **Step 5: Commit (si demandé)**

```bash
git add backend/utils/typeCode.js backend/utils/typeCode.test.js backend/routes/cardTypes.js
git commit -m "$(cat <<'EOF'
feat: CRUD API types de layout (PATCH, slug, garde dos)

EOF
)"
```

---

### Task 3: Client API + helper frontend `typeLabel`

**Files:**
- Create: `frontend/src/utils/typeCode.js`
- Test: `frontend/src/utils/typeCode.test.js`
- Modify: `frontend/src/utils/api.js` (bloc `// Card Types` vers L238–240)

**Interfaces:**
- Consumes: `slugifyTypeCode` from `backend/utils/typeCode.js` (re-export, fichier sans deps Node)
- Produces:
  - `CREATE_TYPE_SENTINEL` = `'__create__'`
  - `typeLabel(code, types) → string` — `types.find(t => t.code === code)?.label || code || ''`
  - `api.updateCardType(code, { label })`
  - `api.deleteCardType(code)`
  - `api.createCardType({ label, code? })` already exists

- [ ] **Step 1: Write the failing test**

Create `frontend/src/utils/typeCode.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CREATE_TYPE_SENTINEL, slugifyTypeCode, typeLabel } from './typeCode.js'

describe('CREATE_TYPE_SENTINEL', () => {
  it('is __create__', () => {
    assert.equal(CREATE_TYPE_SENTINEL, '__create__')
  })
})

describe('slugifyTypeCode (re-export)', () => {
  it('matches backend rules', () => {
    assert.equal(slugifyTypeCode('Faveur Royale'), 'faveur_royale')
  })
})

describe('typeLabel', () => {
  const types = [{ code: 'quete', label: 'Quête' }]

  it('returns the label when known', () => {
    assert.equal(typeLabel('quete', types), 'Quête')
  })

  it('falls back to the raw code when orphaned', () => {
    assert.equal(typeLabel('ghost', types), 'ghost')
  })

  it('falls back to empty string for missing code', () => {
    assert.equal(typeLabel(null, types), '')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test frontend/src/utils/typeCode.test.js`

Expected: FAIL (MODULE_NOT_FOUND)

- [ ] **Step 3: Write implementation**

Create `frontend/src/utils/typeCode.js`:

```js
export { slugifyTypeCode, PROTECTED_TYPE_CODE } from '../../../backend/utils/typeCode.js'

export const CREATE_TYPE_SENTINEL = '__create__'

export function typeLabel(code, types = []) {
  if (code == null || code === '') return ''
  const found = types.find((t) => t.code === code)
  return found?.label || String(code)
}
```

In `frontend/src/utils/api.js`, replace the Card Types block with:

```js
  // Card Types
  getCardTypes: () => request('/card-types'),
  createCardType: (data) => request('/card-types', { method: 'POST', body: data }),
  updateCardType: (code, data) => request(`/card-types/${encodeURIComponent(code)}`, { method: 'PATCH', body: data }),
  deleteCardType: (code) => request(`/card-types/${encodeURIComponent(code)}`, { method: 'DELETE' }),
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `node --test frontend/src/utils/typeCode.test.js backend/utils/typeCode.test.js`

Expected: PASS

- [ ] **Step 5: Commit (si demandé)**

```bash
git add frontend/src/utils/typeCode.js frontend/src/utils/typeCode.test.js frontend/src/utils/api.js
git commit -m "$(cat <<'EOF'
feat: client API et typeLabel pour les types de layout

EOF
)"
```

---

### Task 4: Onglet Config « Types »

**Files:**
- Create: `frontend/src/components/config/CardTypesPanel.vue`
- Modify: `frontend/src/views/ConfigView.vue`

**Interfaces:**
- Consumes: `api.getCardTypes/createCardType/updateCardType/deleteCardType`, `slugifyTypeCode`, `PROTECTED_TYPE_CODE`
- Produces: UI Config list + add + inline label + delete with confirm if `usage_count > 0`

No Vue test runner in the repo. Verification = helper tests still pass + checklist manuelle en fin de tâche.

- [ ] **Step 1: Create `CardTypesPanel.vue`**

```vue
<template>
  <div class="ctp">
    <p class="ctp-desc">Types associés aux layouts. Le code est la clé (non renommable). Le libellé s’affiche dans les sélecteurs.</p>

    <div class="ctp-table" v-if="types.length">
      <div class="ctp-head">
        <span>Libellé</span>
        <span>Code</span>
        <span>Layouts</span>
        <span></span>
      </div>
      <div v-for="t in types" :key="t.code" class="ctp-row">
        <input
          class="ctp-label"
          :value="drafts[t.code] ?? t.label"
          @focus="drafts[t.code] = t.label"
          @input="drafts[t.code] = $event.target.value"
          @keydown.enter.prevent="saveLabel(t)"
          @keydown.escape.prevent="drafts[t.code] = t.label"
          @blur="saveLabel(t)"
        />
        <code class="ctp-code">{{ t.code }}</code>
        <span class="ctp-count">{{ t.usage_count }}</span>
        <button
          v-if="t.code !== protectedCode"
          type="button"
          class="ctp-del"
          title="Supprimer"
          @click="removeType(t)"
        >✕</button>
        <span v-else class="ctp-del-placeholder"></span>
      </div>
    </div>
    <p v-else class="ctp-empty">Aucun type.</p>

    <div class="ctp-add">
      <input v-model="newLabel" class="ctp-input" placeholder="Libellé" @keydown.enter="addType" />
      <input v-model="newCode" class="ctp-input ctp-input-code" placeholder="code (optionnel)" @keydown.enter="addType" />
      <span v-if="slugPreview" class="ctp-slug">→ {{ slugPreview }}</span>
      <button type="button" class="btn-primary btn-sm" :disabled="!newLabel.trim() || adding" @click="addType">
        {{ adding ? '…' : 'Ajouter' }}
      </button>
    </div>
    <p v-if="error" class="ctp-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/utils/api.js'
import { PROTECTED_TYPE_CODE, slugifyTypeCode } from '@/utils/typeCode.js'

const protectedCode = PROTECTED_TYPE_CODE
const types = ref([])
const drafts = reactive({})
const newLabel = ref('')
const newCode = ref('')
const adding = ref(false)
const error = ref('')

const slugPreview = computed(() => {
  if (newCode.value.trim()) return ''
  const slug = slugifyTypeCode(newLabel.value)
  return slug || ''
})

async function load() {
  types.value = await api.getCardTypes()
}

onMounted(() => {
  load().catch((e) => { error.value = e.message })
})

async function addType() {
  const label = newLabel.value.trim()
  if (!label) return
  error.value = ''
  adding.value = true
  try {
    const created = await api.createCardType({
      label,
      code: newCode.value.trim() || undefined,
    })
    types.value = [...types.value, created].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    newLabel.value = ''
    newCode.value = ''
  } catch (e) {
    error.value = e.message
  } finally {
    adding.value = false
  }
}

async function saveLabel(t) {
  const next = String(drafts[t.code] ?? t.label).trim()
  if (!next || next === t.label) {
    drafts[t.code] = t.label
    return
  }
  error.value = ''
  try {
    const updated = await api.updateCardType(t.code, { label: next })
    const idx = types.value.findIndex((x) => x.code === t.code)
    if (idx !== -1) types.value[idx] = updated
    drafts[t.code] = updated.label
  } catch (e) {
    error.value = e.message
    drafts[t.code] = t.label
  }
}

async function removeType(t) {
  const n = Number(t.usage_count) || 0
  if (n > 0) {
    const ok = window.confirm(`${n} layout(s) gardent ce code. Continuer ?`)
    if (!ok) return
  }
  error.value = ''
  try {
    await api.deleteCardType(t.code)
    types.value = types.value.filter((x) => x.code !== t.code)
    delete drafts[t.code]
  } catch (e) {
    error.value = e.message
  }
}
</script>

<style scoped>
.ctp { font-size: 12px; display: flex; flex-direction: column; gap: 12px; }
.ctp-desc { margin: 0; font-size: 11px; color: var(--text-muted); }
.ctp-table { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; }
.ctp-head, .ctp-row {
  display: grid;
  grid-template-columns: minmax(120px, 1.4fr) minmax(100px, 1fr) 72px 32px;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
}
.ctp-head { background: var(--bg-tertiary); font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.ctp-row + .ctp-row { border-top: 1px solid var(--border-subtle); }
.ctp-label {
  width: 100%; padding: 4px 6px; font-size: 12px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary);
}
.ctp-code { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
.ctp-count { font-size: 11px; color: var(--text-muted); text-align: right; }
.ctp-del {
  background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px;
}
.ctp-del:hover { color: #ef4444; }
.ctp-add { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ctp-input {
  padding: 4px 8px; font-size: 12px; min-width: 140px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary);
}
.ctp-input-code { font-family: var(--font-mono); min-width: 120px; }
.ctp-slug { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.ctp-error { margin: 0; color: #ef4444; font-size: 12px; }
.ctp-empty { margin: 0; color: var(--text-muted); }
</style>
```

- [ ] **Step 2: Wire the Config tab**

In `frontend/src/views/ConfigView.vue`:

1. Import:

```js
import CardTypesPanel from '@/components/config/CardTypesPanel.vue'
```

2. Add tab after `ai`:

```js
const tabs = [
  { id: 'design', label: 'Tokens design' },
  { id: 'fonts',  label: 'Polices' },
  { id: 'ai',     label: 'IA Provider' },
  { id: 'types',  label: 'Types' },
]
```

3. Add pane after the IA block:

```html
    <div v-if="activeTab === 'types'" class="config-body">
      <p class="config-desc">Catalogue des types de layout (code interne + libellé affiché).</p>
      <CardTypesPanel />
    </div>
```

- [ ] **Step 3: Manual check**

Open `/config` → Types. Existing seed types listed with usage. Add a type with label only → appears. Rename label → code unchanged. Try delete `dos` → no button.

- [ ] **Step 4: Run unit tests**

Run: `node --test backend/utils/typeCode.test.js frontend/src/utils/typeCode.test.js`

Expected: PASS

- [ ] **Step 5: Commit (si demandé)**

```bash
git add frontend/src/components/config/CardTypesPanel.vue frontend/src/views/ConfigView.vue
git commit -m "$(cat <<'EOF'
feat: onglet Config pour gérer les types de layout

EOF
)"
```

---

### Task 5: `CardTypeSelect` + modales layout / verso

**Files:**
- Create: `frontend/src/components/layouts/CardTypeSelect.vue`
- Modify: `frontend/src/components/layouts/LayoutSettingsModal.vue` (bloc Type L6–10)
- Modify: `frontend/src/views/LayoutsView.vue` (select verso L140–145 + handlers)
- Modify: `frontend/src/components/editor/EditorToolbar.vue` (`@types-changed` on modal)

**Interfaces:**
- Consumes: `CREATE_TYPE_SENTINEL`, `slugifyTypeCode`, `api.createCardType`
- Produces:
  - Props: `modelValue: string`, `types: Array<{code,label}>`
  - Emits: `update:modelValue`, `created` (row API)
  - Never emits `__create__` as `modelValue`

- [ ] **Step 1: Create `CardTypeSelect.vue`**

```vue
<template>
  <div class="cts">
    <select :value="selectValue" @change="onSelectChange">
      <option v-for="t in types" :key="t.code" :value="t.code">{{ t.label }}</option>
      <option :value="sentinel">+ Nouveau type…</option>
    </select>
    <div v-if="creating" class="cts-create">
      <input v-model="newLabel" class="cts-input" placeholder="Libellé" autofocus @keydown.enter.prevent="create" />
      <input v-model="newCode" class="cts-input cts-code" placeholder="code (optionnel)" @keydown.enter.prevent="create" />
      <span v-if="slugPreview" class="cts-slug">→ {{ slugPreview }}</span>
      <button type="button" class="btn-primary btn-sm" :disabled="!newLabel.trim() || creatingBusy" @click="create">
        {{ creatingBusy ? '…' : 'Créer' }}
      </button>
    </div>
    <p v-if="error" class="cts-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '@/utils/api.js'
import { CREATE_TYPE_SENTINEL, slugifyTypeCode } from '@/utils/typeCode.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  types: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'created'])

const sentinel = CREATE_TYPE_SENTINEL
const creating = ref(false)
const creatingBusy = ref(false)
const newLabel = ref('')
const newCode = ref('')
const error = ref('')

const selectValue = computed(() => (creating.value ? sentinel : props.modelValue))
const slugPreview = computed(() => {
  if (newCode.value.trim()) return ''
  return slugifyTypeCode(newLabel.value) || ''
})

watch(() => props.modelValue, () => {
  creating.value = false
  error.value = ''
})

function onSelectChange(e) {
  const v = e.target.value
  if (v === sentinel) {
    creating.value = true
    newLabel.value = ''
    newCode.value = ''
    error.value = ''
    return
  }
  creating.value = false
  error.value = ''
  emit('update:modelValue', v)
}

async function create() {
  const label = newLabel.value.trim()
  if (!label) return
  error.value = ''
  creatingBusy.value = true
  try {
    const created = await api.createCardType({
      label,
      code: newCode.value.trim() || undefined,
    })
    creating.value = false
    emit('created', created)
    emit('update:modelValue', created.code)
  } catch (e) {
    error.value = e.message
  } finally {
    creatingBusy.value = false
  }
}
</script>

<style scoped>
.cts { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.cts select { width: 100%; }
.cts-create { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.cts-input {
  padding: 4px 6px; font-size: 12px; min-width: 120px;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary);
}
.cts-code { font-family: var(--font-mono); }
.cts-slug { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }
.cts-error { margin: 0; font-size: 12px; color: #ef4444; }
</style>
```

- [ ] **Step 2: Use it in `LayoutSettingsModal.vue`**

Replace the Type field-row inner `<select>` with:

```html
      <div class="field-row">
        <label>Type</label>
        <CardTypeSelect
          v-model="form.card_type"
          :types="cardTypes"
          @created="onTypeCreated"
        />
      </div>
```

Script: import `CardTypeSelect`. Add:

```js
const emit = defineEmits(['close', 'saved', 'types-changed'])

function onTypeCreated(created) {
  emit('types-changed', created)
}
```

(`defineEmits` currently is `['close', 'saved']` — extend it.)

Do not save if `form.card_type === CREATE_TYPE_SENTINEL` (should be impossible if CardTypeSelect never emits it). Extra guard in `save()`:

```js
  if (!form.value.name || form.value.card_type === CREATE_TYPE_SENTINEL) return
```

Import `CREATE_TYPE_SENTINEL` from `@/utils/typeCode.js`.

- [ ] **Step 3: Merge helper in parents**

Add `frontend` function in both `LayoutsView.vue` and `EditorToolbar.vue` (duplicate 6 lines — do not invent a store):

```js
function mergeCardType(created) {
  if (!created?.code) return
  if (cardTypes.value.some((t) => t.code === created.code)) return
  cardTypes.value = [...cardTypes.value, created].sort((a, b) =>
    a.label.localeCompare(b.label, 'fr'),
  )
}
```

On both `LayoutSettingsModal` instances in `LayoutsView.vue`:

```html
      @types-changed="mergeCardType"
```

On the modal in `EditorToolbar.vue`: same `@types-changed="mergeCardType"`.

- [ ] **Step 4: Verso modal in `LayoutsView.vue`**

Replace the Type `<select>` (L140–145) with:

```html
        <div class="field-row">
          <label>Type</label>
          <CardTypeSelect
            v-model="versoForm.card_type"
            :types="cardTypes"
            @created="mergeCardType"
          />
        </div>
```

Import `CardTypeSelect` in the script.

- [ ] **Step 5: Run tests**

Run: `node --test backend/utils/typeCode.test.js frontend/src/utils/typeCode.test.js`

Expected: PASS

Manual: Layouts → + Nouveau → Type → + Nouveau type… → Créer → le type est sélectionné, la modale ne se ferme pas. Créer le layout. Badge = libellé (après Task 6). Duplicate 409 shows under the inline fields.

- [ ] **Step 6: Commit (si demandé)**

```bash
git add frontend/src/components/layouts/CardTypeSelect.vue frontend/src/components/layouts/LayoutSettingsModal.vue frontend/src/views/LayoutsView.vue frontend/src/components/editor/EditorToolbar.vue
git commit -m "$(cat <<'EOF'
feat: création inline de type de layout dans les modales

EOF
)"
```

---

### Task 6: Badges = libellé (fallback code)

**Files:**
- Modify: `frontend/src/views/LayoutsView.vue` (badge L82, search/sort L232–244)
- Modify: `frontend/src/components/editor/EditorToolbar.vue` (badge L23)

**Interfaces:**
- Consumes: `typeLabel(code, types)` from `frontend/src/utils/typeCode.js`

- [ ] **Step 1: LayoutsView badge + search/sort**

Import `typeLabel` from `@/utils/typeCode.js`.

Replace badge:

```html
              <span class="badge">{{ typeLabel(l.card_type, cardTypes) }}</span>
```

In `filtered` computed, search also on label:

```js
    list = list.filter((l) => {
      const q = search.value.toLowerCase()
      const label = typeLabel(l.card_type, cardTypes.value).toLowerCase()
      return l.name.toLowerCase().includes(q)
        || l.card_type.toLowerCase().includes(q)
        || label.includes(q)
    })
```

Sort by type using labels:

```js
    if (sortKey.value === 'type') {
      return typeLabel(a.card_type, cardTypes.value).localeCompare(typeLabel(b.card_type, cardTypes.value), 'fr')
        || a.name.localeCompare(b.name)
    }
```

- [ ] **Step 2: EditorToolbar badge**

Import `typeLabel`. Replace:

```html
      <span class="badge" v-else-if="store.layout?.card_type">{{ typeLabel(store.layout.card_type, cardTypes) }}</span>
```

Orphan (type deleted): `typeLabel` returns the raw code — that is the spec.

- [ ] **Step 3: Run tests**

Run: `node --test frontend/src/utils/typeCode.test.js`

Expected: PASS (`typeLabel` orphan case already covered)

- [ ] **Step 4: Commit (si demandé)**

```bash
git add frontend/src/views/LayoutsView.vue frontend/src/components/editor/EditorToolbar.vue
git commit -m "$(cat <<'EOF'
feat: badges layout affichent le libellé du type

EOF
)"
```

---

### Task 7: Spec + WORKPLAN

**Files:**
- Modify: `specs/TSD-029-types-de-layout.md` (Status → Done ; cocher §6 et §8 si vrai)
- Modify: `specs/WORKPLAN.md` (cocher TSD-029, journal, prochaines actions)

**Interfaces:** none

- [ ] **Step 1: Tick TSD-029** only after Tasks 1–6 are done and `npm test` still green for the new files.

Set header `Status` to `Done`, `Last update` to the day of implementation.

Check every box in §6 and §8 that is actually true. Leave unchecked any criterion not verified.

- [ ] **Step 2: WORKPLAN**

Phase 1: change TSD-029 line from `[ ]` to `[x]`.

Section e: remove TSD-029 from the top of next actions.

Section f: add a journal row with the date and a one-line summary.

- [ ] **Step 3: Full unit test glob for new files**

Run: `node --test backend/utils/typeCode.test.js frontend/src/utils/typeCode.test.js`

Expected: PASS

Then: `npm test` (whole suite). Expected: existing tests still PASS. If an unrelated failure appears, do not “fix” it unless caused by this change.

- [ ] **Step 4: Commit (si demandé)**

```bash
git add specs/TSD-029-types-de-layout.md specs/WORKPLAN.md
git commit -m "$(cat <<'EOF'
docs: clôturer TSD-029 types de layout

EOF
)"
```

---

## Spec coverage (self-review)

| TSD-029 requirement | Task |
|---------------------|------|
| `slugifyTypeCode` + tests | 1 |
| GET `usage_count` | 2 |
| POST slug, 400, 409 (no INSERT OR IGNORE) | 1+2 |
| PATCH label | 2 |
| DELETE `dos` 409, else OK, 404 unknown | 1+2 |
| `api.updateCardType` / `deleteCardType` | 3 |
| Config tab Types | 4 |
| Inline create in layout + verso modals | 5 |
| Badges = label, orphan = code | 3+6 |
| Confirm delete if usage_count > 0 | 4 |
| Seed codes not rewritten | 2 (no slug on PATCH URL) |
| Out of scope: couleur, rename code, fusion | not implemented |

## Placeholder scan

No TBD / “handle errors later” / “similar to Task N” left. Error strings are copied verbatim between tests and implementation: `Le libellé est requis`, `Code invalide`, `Ce code existe déjà`, `Le type dos ne peut pas être supprimé`, `Type introuvable`.
