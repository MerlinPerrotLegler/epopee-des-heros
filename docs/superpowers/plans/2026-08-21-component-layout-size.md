# Taille du layout d’un composant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de changer nom et taille native (`width_mm` × `height_mm`) d’un composant après création, via ⚙ dans l’éditeur et dans la liste.

**Architecture:** Helper pur `normalizeComponentMeta` (source de vérité 1–500 mm). `PATCH /api/components/:id` étendu (name + dims, pas la definition). Modal dédiée `ComponentSettingsModal` (pas `LayoutSettingsModal`). Store : `applyLayoutMeta` + `requestFit = 'fit'` après succès éditeur.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, Express ESM, `node:test` + `node:assert/strict`.

**Spec:** `specs/TSD-031-component-layout-size.md`

## Global Constraints

- Spec canonique : `specs/TSD-031-component-layout-size.md`
- Pas de migration DB (`components.width_mm` / `height_mm` existent)
- Dims : nombre fini dans **[1, 500]** mm
- Instances déjà posées sur des layouts : **ne pas** les parcourir ni les réécrire
- Molécules : hors scope (pas de ⚙ taille)
- Modal de **création** Composants : inchangée
- Description : pas dans la modal ⚙
- Miniature : pas recapturée au seul changement de taille
- Pas de TypeScript ; alias `@/`
- Commits : uniquement si l’utilisateur le demande ; skip les steps « Commit » sinon
- Mettre à jour `specs/WORKPLAN.md` et le statut TSD-031 en fin d’implémentation

---

## File map

| Path | Responsibility |
|------|----------------|
| `backend/utils/componentMeta.js` | `COMPONENT_DIM_MIN/MAX`, `normalizeComponentMeta` |
| `backend/utils/componentMeta.test.js` | Tests helper |
| `backend/routes/components.js` | PATCH name + width_mm + height_mm |
| `frontend/src/components/editor/ComponentSettingsModal.vue` | Modal nom + dims + ⇄ |
| `frontend/src/components/editor/EditorToolbar.vue` | ⚙ / nom cliquable en mode composant |
| `frontend/src/views/ComponentsView.vue` | ⚙ tuile + même modal |
| `frontend/src/stores/editor.test.js` | Test `applyLayoutMeta` |
| `specs/TSD-031-component-layout-size.md` | Status → Done |
| `specs/WORKPLAN.md` | Tâche + journal |

`api.patchComponent` existe déjà — ne pas le recréer.

---

### Task 1: Helper `normalizeComponentMeta`

**Files:**
- Create: `backend/utils/componentMeta.js`
- Test: `backend/utils/componentMeta.test.js`

**Interfaces:**
- Produces:
  - `COMPONENT_DIM_MIN` = `1`
  - `COMPONENT_DIM_MAX` = `500`
  - `normalizeComponentMeta(body?: object) → { ok: true, patch: { name?: string, width_mm?: number, height_mm?: number } } | { ok: false, status: 400, error: string }`

- [ ] **Step 1: Write the failing test**

Create `backend/utils/componentMeta.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COMPONENT_DIM_MIN,
  COMPONENT_DIM_MAX,
  normalizeComponentMeta,
} from './componentMeta.js'

describe('normalizeComponentMeta', () => {
  it('trims name and keeps only provided fields', () => {
    assert.deepEqual(
      normalizeComponentMeta({ name: '  Foo  ' }),
      { ok: true, patch: { name: 'Foo' } },
    )
  })

  it('accepts valid dims', () => {
    assert.deepEqual(
      normalizeComponentMeta({ width_mm: 40, height_mm: 25 }),
      { ok: true, patch: { width_mm: 40, height_mm: 25 } },
    )
  })

  it('accepts the min and max bounds', () => {
    assert.deepEqual(
      normalizeComponentMeta({ width_mm: COMPONENT_DIM_MIN, height_mm: COMPONENT_DIM_MAX }),
      { ok: true, patch: { width_mm: 1, height_mm: 500 } },
    )
  })

  it('rejects a blank name', () => {
    assert.deepEqual(
      normalizeComponentMeta({ name: '  ' }),
      { ok: false, status: 400, error: 'Le nom est requis' },
    )
  })

  it('rejects non-finite or out-of-range width', () => {
    for (const width_mm of [0, 0.5, 501, NaN, 'abc']) {
      const r = normalizeComponentMeta({ width_mm })
      assert.equal(r.ok, false)
      assert.equal(r.status, 400)
    }
  })

  it('skips missing and null fields (name-only PATCH stays valid)', () => {
    assert.deepEqual(normalizeComponentMeta({ name: 'A' }), { ok: true, patch: { name: 'A' } })
    assert.deepEqual(normalizeComponentMeta({}), { ok: true, patch: {} })
    assert.deepEqual(
      normalizeComponentMeta({ name: null, width_mm: null, height_mm: undefined }),
      { ok: true, patch: {} },
    )
  })

  it('coerces numeric strings', () => {
    assert.deepEqual(
      normalizeComponentMeta({ width_mm: '12.5', height_mm: '20' }),
      { ok: true, patch: { width_mm: 12.5, height_mm: 20 } },
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test backend/utils/componentMeta.test.js`

Expected: FAIL — `Cannot find module './componentMeta.js'`

- [ ] **Step 3: Write minimal implementation**

Create `backend/utils/componentMeta.js`:

```js
export const COMPONENT_DIM_MIN = 1
export const COMPONENT_DIM_MAX = 500

function parseDim(value, label) {
  if (value === undefined || value === null || value === '') {
    return { skip: true }
  }
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < COMPONENT_DIM_MIN || n > COMPONENT_DIM_MAX) {
    return {
      ok: false,
      status: 400,
      error: `${label} doit être un nombre entre ${COMPONENT_DIM_MIN} et ${COMPONENT_DIM_MAX} mm`,
    }
  }
  return { skip: false, value: n }
}

export function normalizeComponentMeta(body = {}) {
  const patch = {}

  if (body.name !== undefined && body.name !== null) {
    const name = String(body.name).trim()
    if (!name) {
      return { ok: false, status: 400, error: 'Le nom est requis' }
    }
    patch.name = name
  }

  const w = parseDim(body.width_mm, 'La largeur')
  if (w.ok === false) return w
  if (!w.skip) patch.width_mm = w.value

  const h = parseDim(body.height_mm, 'La hauteur')
  if (h.ok === false) return h
  if (!h.skip) patch.height_mm = h.value

  return { ok: true, patch }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test backend/utils/componentMeta.test.js`

Expected: PASS (all tests)

- [ ] **Step 5: Commit** (only if the user asked)

```bash
git add backend/utils/componentMeta.js backend/utils/componentMeta.test.js
git commit -m "$(cat <<'EOF'
Add component meta validation for name and native size.

EOF
)"
```

---

### Task 2: `PATCH /api/components/:id` accepte les dims

**Files:**
- Modify: `backend/routes/components.js` (handler `router.patch('/:id')`)

**Interfaces:**
- Consumes: `normalizeComponentMeta` from `../utils/componentMeta.js`
- Produces: PATCH 200 with `{ name?, width_mm?, height_mm? }` applied via COALESCE; 400 from helper; 404 if missing

- [ ] **Step 1: Replace the PATCH handler**

In `backend/routes/components.js`, add the import at the top (after existing imports):

```js
import { normalizeComponentMeta } from '../utils/componentMeta.js';
```

Replace the PATCH handler (currently name-only) with:

```js
// Metadata only (no definition)
router.patch('/:id', async (req, res) => {
  const parsed = normalizeComponentMeta(req.body);
  if (!parsed.ok) return res.status(parsed.status).json({ error: parsed.error });

  const db = getDb();
  const { name, width_mm, height_mm } = parsed.patch;
  await db.prepare(
    `UPDATE components SET
      name = COALESCE(?, name),
      width_mm = COALESCE(?, width_mm),
      height_mm = COALESCE(?, height_mm),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
  ).run(name ?? null, width_mm ?? null, height_mm ?? null, req.params.id);

  const row = await db.prepare('SELECT * FROM components WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  row.definition = parseJsonColumn(row.definition);
  res.json(row);
});
```

Do **not** change PUT / POST / duplicate.

- [ ] **Step 2: Sanity-check the helper still passes**

Run: `node --test backend/utils/componentMeta.test.js`

Expected: PASS

- [ ] **Step 3: Commit** (only if the user asked)

```bash
git add backend/routes/components.js
git commit -m "$(cat <<'EOF'
Allow PATCH /components/:id to update width_mm and height_mm.

EOF
)"
```

---

### Task 3: Test store `applyLayoutMeta`

**Files:**
- Modify: `frontend/src/stores/editor.test.js` (append a describe)

**Interfaces:**
- Consumes: `store.applyLayoutMeta(meta)` (déjà exporté ; clés `name`, `width_mm`, `height_mm`)
- Produces: characterization test — `definition` inchangée

`applyLayoutMeta` existe déjà dans `frontend/src/stores/editor.js`. Ce test **peut déjà passer** sans modifier le store : c’est le contrat TSD-031. Ne pas réécrire `applyLayoutMeta`.

- [ ] **Step 1: Append the test**

At the end of `frontend/src/stores/editor.test.js`:

```js
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
    assert.equal(store.layout.definition, definition)
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
```

- [ ] **Step 2: Run the store tests**

Run: `node --test frontend/src/stores/editor.test.js`

Expected: PASS (including the new describe). If FAIL, fix `applyLayoutMeta` only if a listed key is not copied — current keys already include `name`, `width_mm`, `height_mm`.

- [ ] **Step 3: Commit** (only if the user asked)

```bash
git add frontend/src/stores/editor.test.js
git commit -m "$(cat <<'EOF'
Cover applyLayoutMeta for component name and native size.

EOF
)"
```

---

### Task 4: `ComponentSettingsModal`

**Files:**
- Create: `frontend/src/components/editor/ComponentSettingsModal.vue`

**Interfaces:**
- Consumes: props `{ open, component, saveFn }` — `saveFn(payload) => Promise`
- Produces: payload `{ name: string, width_mm: number, height_mm: number }` ; events `close`, `saved`

Miroir allégé de `frontend/src/components/layouts/LayoutSettingsModal.vue` (pas de type / hex / verso). Styles dims copiés (`.dims-row`, `.dim-input`, `.btn-swap`). Classes globales : `.modal-overlay`, `.modal`, `.field-row`, `.modal-actions`.

- [ ] **Step 1: Create the modal**

Create `frontend/src/components/editor/ComponentSettingsModal.vue`:

```vue
<template>
  <div class="modal-overlay" v-if="open" @click.self="emit('close')">
    <div class="modal">
      <h3>Modifier le composant</h3>
      <div class="field-row">
        <label>Nom</label>
        <input v-model="form.name" placeholder="Nom du composant" autofocus />
      </div>
      <div class="field-row">
        <label>Dimensions</label>
        <div class="dims-row">
          <input
            type="number"
            v-model.number="form.width_mm"
            min="1"
            max="500"
            step="0.1"
            class="dim-input"
            placeholder="Larg."
          />
          <span class="dim-sep">×</span>
          <input
            type="number"
            v-model.number="form.height_mm"
            min="1"
            max="500"
            step="0.1"
            class="dim-input"
            placeholder="Haut."
          />
          <span class="dim-unit">mm</span>
          <button type="button" class="btn-swap" title="Échanger largeur / hauteur" @click="swapDims">⇄</button>
        </div>
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="modal-actions">
        <button class="btn-ghost" type="button" @click="emit('close')">Annuler</button>
        <button class="btn-primary" type="button" @click="save" :disabled="!canSave || saving">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  component: { type: Object, default: null },
  /** async (payload) => updated component */
  saveFn: { type: Function, required: true },
})

const emit = defineEmits(['close', 'saved'])

const form = ref(emptyForm())
const saving = ref(false)
const error = ref('')

const canSave = computed(() => String(form.value.name || '').trim().length > 0)

function emptyForm() {
  return { name: '', width_mm: 30, height_mm: 20 }
}

function syncFromComponent() {
  error.value = ''
  const c = props.component
  if (!c) {
    form.value = emptyForm()
    return
  }
  form.value = {
    name: c.name || '',
    width_mm: c.width_mm ?? 30,
    height_mm: c.height_mm ?? 20,
  }
}

watch(() => [props.open, props.component], ([open]) => {
  if (open) syncFromComponent()
}, { immediate: true })

function swapDims() {
  const tmp = form.value.width_mm
  form.value.width_mm = form.value.height_mm
  form.value.height_mm = tmp
}

function dimOk(n) {
  return Number.isFinite(n) && n >= 1 && n <= 500
}

async function save() {
  if (!canSave.value) return
  if (!dimOk(form.value.width_mm) || !dimOk(form.value.height_mm)) {
    error.value = 'La largeur et la hauteur doivent être entre 1 et 500 mm'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const result = await props.saveFn({
      name: String(form.value.name).trim(),
      width_mm: form.value.width_mm,
      height_mm: form.value.height_mm,
    })
    emit('saved', result)
    emit('close')
  } catch (e) {
    error.value = e?.message || 'Échec de l’enregistrement'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form-error {
  margin: 0 0 8px;
  font-size: 12px;
  color: #ef4444;
}
.dims-row { display: flex; align-items: center; gap: 5px; }
.dim-input {
  width: 58px; padding: 4px 6px; font-size: 12px; text-align: center;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); color: var(--text-primary); outline: none;
}
.dim-input:focus { border-color: var(--accent-primary); }
.dim-sep { font-size: 12px; color: var(--text-muted); }
.dim-unit { font-size: 11px; color: var(--text-muted); }
.btn-swap {
  padding: 3px 8px; font-size: 14px; line-height: 1;
  background: var(--bg-tertiary); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); cursor: pointer; color: var(--text-secondary);
}
.btn-swap:hover { color: var(--accent-primary); border-color: var(--accent-primary); }
</style>
```

- [ ] **Step 2: Commit** (only if the user asked)

```bash
git add frontend/src/components/editor/ComponentSettingsModal.vue
git commit -m "$(cat <<'EOF'
Add component settings modal for name and native size.

EOF
)"
```

---

### Task 5: Toolbar éditeur composant

**Files:**
- Modify: `frontend/src/components/editor/EditorToolbar.vue`

**Interfaces:**
- Consumes: `ComponentSettingsModal`, `api.patchComponent`, `store.applyLayoutMeta`, `store.requestFit`
- Produces: ⚙ + nom cliquable si `store.mode === 'component'`

- [ ] **Step 1: Make title + gear available in component mode**

Replace the title block so component gets the same clickable name as layout. Current:

```vue
      <button
        v-if="store.mode === 'layout' && store.layout"
        type="button"
        class="toolbar-title toolbar-title-btn"
        title="Modifier la configuration"
        :disabled="store.readOnly || !store.layoutLockHeld"
        @click="showSettings = true"
      >{{ store.layout?.name || '…' }}</button>
      <span v-else class="toolbar-title">{{ store.layout?.name || '…' }}</span>
```

Replace with:

```vue
      <button
        v-if="(store.mode === 'layout' || store.mode === 'component') && store.layout"
        type="button"
        class="toolbar-title toolbar-title-btn"
        :title="store.mode === 'component' ? 'Modifier le composant' : 'Modifier la configuration'"
        :disabled="store.mode === 'layout' && (store.readOnly || !store.layoutLockHeld)"
        @click="showSettings = true"
      >{{ store.layout?.name || '…' }}</button>
      <span v-else class="toolbar-title">{{ store.layout?.name || '…' }}</span>
```

Replace the gear button. Current:

```vue
      <button
        v-if="store.mode === 'layout' && store.layout"
        type="button"
        class="btn-icon btn-sm"
        title="Configurer le layout"
        :disabled="store.readOnly || !store.layoutLockHeld"
        @click="showSettings = true"
      >⚙</button>
```

Replace with:

```vue
      <button
        v-if="(store.mode === 'layout' || store.mode === 'component') && store.layout"
        type="button"
        class="btn-icon btn-sm"
        :title="store.mode === 'component' ? 'Configurer le composant' : 'Configurer le layout'"
        :disabled="store.mode === 'layout' && (store.readOnly || !store.layoutLockHeld)"
        @click="showSettings = true"
      >⚙</button>
```

- [ ] **Step 2: Gate the layout modal and add the component modal**

Change `LayoutSettingsModal` `:open`:

```vue
    <LayoutSettingsModal
      :open="showSettings && store.mode === 'layout'"
      :layout="store.layout"
      :card-types="cardTypes"
      :verso-layouts="versoLayouts"
      :save-fn="saveLayoutMeta"
      @close="showSettings = false"
    />
    <ComponentSettingsModal
      :open="showSettings && store.mode === 'component'"
      :component="store.layout"
      :save-fn="saveComponentMeta"
      @close="showSettings = false"
    />
```

- [ ] **Step 3: Wire import + saveComponentMeta**

Add import:

```js
import ComponentSettingsModal from '@/components/editor/ComponentSettingsModal.vue'
```

Add next to `saveLayoutMeta`:

```js
async function saveComponentMeta(payload) {
  if (!store.layout?.id) throw new Error('Composant introuvable')
  const updated = await api.patchComponent(store.layout.id, payload)
  store.applyLayoutMeta(updated)
  store.requestFit = 'fit'
  return updated
}
```

Do not mark `dirty`. Do not call `saveDefinition`. Do not touch `ComponentRenderer`.

- [ ] **Step 4: Commit** (only if the user asked)

```bash
git add frontend/src/components/editor/EditorToolbar.vue
git commit -m "$(cat <<'EOF'
Expose component size settings from the editor toolbar.

EOF
)"
```

---

### Task 6: ⚙ sur la liste Composants

**Files:**
- Modify: `frontend/src/views/ComponentsView.vue`

**Interfaces:**
- Consumes: `ComponentSettingsModal`, `api.patchComponent`
- Produces: tuile à jour (nom + `width_mm` / `height_mm`) ; create modal inchangée

- [ ] **Step 1: Add the gear on tiles**

In `.tile-actions`, put ⚙ **before** ✎ (same order as LayoutsView):

```vue
        <div class="tile-actions" @click.stop>
          <button type="button" class="act-btn" title="Configurer" @mousedown.prevent @click="openEdit(item)">⚙</button>
          <button type="button" class="act-btn" title="Renommer" @mousedown.prevent @click="startRename(item)">✎</button>
          <button type="button" class="act-btn" title="Dupliquer" @mousedown.prevent @click="duplicate(item)">⧉</button>
          <button type="button" class="act-btn act-del" title="Supprimer" @mousedown.prevent @click="remove(item)">✕</button>
        </div>
```

- [ ] **Step 2: Add the modal after the create modal** (keep the create modal as-is)

```vue
    <ComponentSettingsModal
      :open="!!editingItem"
      :component="editingItem"
      :save-fn="saveEditFromPayload"
      @close="editingItem = null"
    />
```

- [ ] **Step 3: Script — import, ref, handlers**

Add import:

```js
import ComponentSettingsModal from '@/components/editor/ComponentSettingsModal.vue'
```

After `const form = ref(...)`:

```js
const editingItem = ref(null)
```

After `openEditor`:

```js
function openEdit(item) {
  editingItem.value = item
}

async function saveEditFromPayload(payload) {
  const id = editingItem.value?.id
  if (!id) throw new Error('Composant introuvable')
  const updated = await api.patchComponent(id, payload)
  const idx = items.value.findIndex(x => x.id === id)
  if (idx !== -1) {
    items.value[idx] = { ...items.value[idx], ...updated }
  }
  return updated
}
```

Inline rename ✎ keeps `api.patchComponent(item.id, { name })` — name-only, rétrocompat Task 2.

- [ ] **Step 4: Commit** (only if the user asked)

```bash
git add frontend/src/views/ComponentsView.vue
git commit -m "$(cat <<'EOF'
Add component size settings from the components list.

EOF
)"
```

---

### Task 7: Vérifs + WORKPLAN

**Files:**
- Modify: `specs/TSD-031-component-layout-size.md` (Status → Done, cocher §6 et §8)
- Modify: `specs/WORKPLAN.md` (tâche Phase 1, journal, prochaines actions)

- [ ] **Step 1: Run automated tests**

```bash
node --test backend/utils/componentMeta.test.js frontend/src/stores/editor.test.js
```

Expected: PASS

- [ ] **Step 2: Manual check** (app `npm run dev`)

1. Liste Composants → ⚙ → changer L × H → badges tuile à jour
2. Ouvrir l’éditeur → ⚙ ou clic nom → changer dims → canvas recadré, atomes immobiles
3. Rétrécir sous un atome → l’atome dépasse, pas d’alerte
4. Rename ✎ liste → toujours OK (PATCH name-only)
5. Molécule : pas de ⚙ taille
6. Layout : ⚙ layout inchangé

- [ ] **Step 3: Update TSD-031**

Set `Status` to `Done`. Check every box in §6 and §8.

- [ ] **Step 4: Update WORKPLAN.md**

In Phase 1, add a checked item:

```
- [x] **TSD-031** Taille native composant après création (⚙ éditeur + liste, PATCH dims)
```

Journal (today’s date):

```
| 2026-08-21 | **TSD-031** Taille canvas composant éditable après création (⚙ + PATCH width_mm/height_mm). Instances posées non mises à jour. |
```

- [ ] **Step 5: Commit** (only if the user asked)

```bash
git add specs/TSD-031-component-layout-size.md specs/WORKPLAN.md
git commit -m "$(cat <<'EOF'
Mark TSD-031 done and update the workplan.

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec § | Task |
|--------|------|
| UX éditeur ⚙ + nom | Task 5 |
| Modal nom / dims / ⇄ / 1–500 | Task 4 |
| UX liste ⚙ | Task 6 |
| PATCH étendu + COALESCE + 400/404 | Tasks 1–2 |
| Persistance sans definition | Task 5 `patchComponent` / Task 2 |
| `applyLayoutMeta` + fit éditeur | Tasks 3 + 5 |
| Instances non mises à jour | aucun parcours layouts — YAGNI |
| Molécules hors scope | Task 5 `mode === 'component'` only |
| Create modal inchangée | Task 6 |
| Tests helper + applyLayoutMeta | Tasks 1 + 3 |
| Miniature / overflow | pas de code (comportement actuel) |
