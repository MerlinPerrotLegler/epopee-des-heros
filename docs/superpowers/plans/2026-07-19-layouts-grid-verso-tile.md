# Layouts grille + tuile Recto/Verso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remettre `/layouts` en grille de tuiles, et offrir une UX « une carte = une tuile » pour recto+verso liés, avec bascule éditeur qui sauvegarde avant de naviguer.

**Architecture:** Pas de migration DB. On conserve deux layouts (`is_back`, `back_layout_id`). La vue Layouts repasse en grille (pattern `ComponentsView`). La tuile recto gère toggle d’aperçu + ouverture de la face active. L’éditeur ajoute un toggle Recto|Verso qui `saveDefinition()` puis `router.push` vers le partenaire.

**Tech Stack:** Vue 3 Composition API, Pinia (`editor` store), Vue Router, CSS custom (variables existantes).

## Global Constraints

- Mesures en **mm** uniquement (inchangé ici).
- Ne pas fusionner recto/verso dans une seule `definition` (hors scope TSD-006).
- Versos liés restent listés dans l’onglet Verso.
- Switch face éditeur : **save obligatoire** si dirty ; échec save → pas de navigation.
- Spec : `docs/superpowers/specs/2026-07-19-layouts-grid-verso-tile-design.md`

---

## File map

| File | Role |
|------|------|
| `frontend/src/utils/layoutFaces.js` | Helpers purs : partenaire face, id à ouvrir selon toggle |
| `frontend/src/views/LayoutsView.vue` | Grille tuiles + toggle aperçu + open face active |
| `frontend/src/stores/editor.js` | `saveDefinition` retourne succès ; helper switch (optionnel) |
| `frontend/src/components/editor/EditorToolbar.vue` | UI toggle Recto\|Verso + save-then-navigate |
| `specs/WORKPLAN.md` | Journal de session |

---

### Task 1: Helpers `layoutFaces.js`

**Files:**
- Create: `frontend/src/utils/layoutFaces.js`
- Test: `frontend/src/utils/layoutFaces.test.js` (`node:test` + `node:assert/strict`, comme `imageEdgeFade.test.js`)

**Interfaces:**
- Produces:
  - `getLinkedVersoId(layout) → string|null` — `layout.back_layout_id || null` si recto
  - `findRectoForVerso(versoId, layouts) → layout|null` — premier `!is_back` avec `back_layout_id === versoId`
  - `getFacePartnerId(layout, layouts) → string|null` — verso id si recto lié ; recto id si verso lié ; sinon null
  - `resolveOpenLayoutId(rectoLayout, face) → string` — `face === 'verso' && back_layout_id ? back_layout_id : rectoLayout.id`
  - `thumbnailForFace(rectoLayout, face, layouts) → string|null` — thumbnail du layout de la face

- [ ] **Step 1: Write failing tests**

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getLinkedVersoId,
  findRectoForVerso,
  getFacePartnerId,
  resolveOpenLayoutId,
  thumbnailForFace,
} from './layoutFaces.js'

const recto = { id: 'r1', is_back: false, back_layout_id: 'v1', thumbnail: 'data:recto' }
const verso = { id: 'v1', is_back: true, back_layout_id: null, thumbnail: 'data:verso' }
const layouts = [recto, verso]

describe('layoutFaces', () => {
  it('getLinkedVersoId', () => {
    assert.equal(getLinkedVersoId(recto), 'v1')
    assert.equal(getLinkedVersoId({ id: 'r2', back_layout_id: null }), null)
  })
  it('findRectoForVerso', () => {
    assert.equal(findRectoForVerso('v1', layouts)?.id, 'r1')
    assert.equal(findRectoForVerso('missing', layouts), null)
  })
  it('getFacePartnerId', () => {
    assert.equal(getFacePartnerId(recto, layouts), 'v1')
    assert.equal(getFacePartnerId(verso, layouts), 'r1')
  })
  it('resolveOpenLayoutId', () => {
    assert.equal(resolveOpenLayoutId(recto, 'recto'), 'r1')
    assert.equal(resolveOpenLayoutId(recto, 'verso'), 'v1')
  })
  it('thumbnailForFace', () => {
    assert.equal(thumbnailForFace(recto, 'recto', layouts), 'data:recto')
    assert.equal(thumbnailForFace(recto, 'verso', layouts), 'data:verso')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd frontend && node --test src/utils/layoutFaces.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement helpers**

```js
export function getLinkedVersoId(layout) {
  if (!layout || layout.is_back) return null
  return layout.back_layout_id || null
}

export function findRectoForVerso(versoId, layouts = []) {
  if (!versoId) return null
  return layouts.find((l) => !l.is_back && l.back_layout_id === versoId) || null
}

export function getFacePartnerId(layout, layouts = []) {
  if (!layout) return null
  if (!layout.is_back) return getLinkedVersoId(layout)
  return findRectoForVerso(layout.id, layouts)?.id || null
}

export function resolveOpenLayoutId(rectoLayout, face) {
  if (face === 'verso' && rectoLayout?.back_layout_id) return rectoLayout.back_layout_id
  return rectoLayout.id
}

export function thumbnailForFace(rectoLayout, face, layouts = []) {
  if (face === 'verso' && rectoLayout?.back_layout_id) {
    const v = layouts.find((l) => l.id === rectoLayout.back_layout_id)
    return v?.thumbnail || null
  }
  return rectoLayout?.thumbnail || null
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd frontend && node --test src/utils/layoutFaces.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/layoutFaces.js frontend/src/utils/layoutFaces.test.js
git commit -m "$(cat <<'EOF'
feat: helpers layoutFaces for linked recto/verso

EOF
)"
```

---

### Task 2: `LayoutsView` — grille de tuiles

**Files:**
- Modify: `frontend/src/views/LayoutsView.vue` (template liste → grille ; CSS aligné sur `ComponentsView.vue`)

**Interfaces:**
- Consumes: aucun helper face encore (Task 3)
- Produces: UI grille fonctionnelle, comportement verso sélecteur inchangé pour l’instant

- [ ] **Step 1: Remplacer le conteneur liste par une grille**

Dans le template, remplacer :

```html
<div class="items-list" v-if="filtered.length">
  <div v-for="l in filtered" :key="l.id" class="item-row" @click="openEditor(l)">
```

par une structure tuile calquée sur `ComponentsView` :

```html
<div class="items-grid" v-if="filtered.length">
  <div
    v-for="l in filtered" :key="l.id"
    class="item-tile"
    @click="openEditor(l)"
  >
    <div class="tile-title-row" @click.stop>
      <!-- rename input / tile-name (reprendre logique actuelle row-name) -->
      <span class="tile-dims">{{ l.width_mm }} × {{ l.height_mm }} mm</span>
    </div>
    <div class="tile-body">
      <div class="tile-thumb" :style="thumbStyle(l)">
        <img v-if="l.thumbnail" :src="l.thumbnail" class="thumb-img" alt="" />
        <div v-else class="thumb-placeholder">
          <span class="ph-dims">{{ l.width_mm }}×{{ l.height_mm }}</span>
        </div>
      </div>
      <div class="tile-info">
        <div class="tile-meta">
          <span class="badge">{{ l.card_type }}</span>
          <span v-if="isHexLayout(l)" class="badge badge-hex">⬡</span>
          <span v-if="l.is_back" class="tile-verso-badge">DOS</span>
        </div>
        <!-- verso select: garder v-if="!l.is_back" comme aujourd’hui pour Task 2 -->
        <div v-if="!l.is_back" class="tile-verso" @click.stop>
          <span class="verso-label">Verso</span>
          <select
            class="verso-select"
            :value="l.back_layout_id || ''"
            @change="onVersoSelectChange(l, $event.target.value)"
          >
            <option value="">— Aucun —</option>
            <option v-for="bl in versoLayouts" :key="bl.id" :value="bl.id">{{ bl.name }}</option>
            <option value="__create__">+ Créer…</option>
          </select>
        </div>
      </div>
    </div>
    <div class="tile-actions" @click.stop>
      <!-- mêmes boutons ⚙ ✎ ⧉ ✕ -->
    </div>
  </div>
</div>
```

- [ ] **Step 2: CSS grille**

Remplacer `.items-list` / `.item-row` / `.row-*` par styles grille (copier les valeurs de `ComponentsView.vue` : `.items-grid`, `.item-tile`, `.tile-title-row`, `.tile-body`, `.tile-thumb`, `.tile-actions`, etc.).

Ajuster `thumbStyle` : `MAX` passer de `48` à `72` (tuiles plus grandes).

```js
function thumbStyle(l) {
  const MAX = 72
  const ratio = l.height_mm / l.width_mm
  return { width: `${MAX}px`, height: `${Math.round(MAX * ratio)}px` }
}
```

- [ ] **Step 3: Vérif manuelle**

Run: `npm run dev` → ouvrir `/layouts`
Expected: tuiles en grille ; create/rename/verso select/éditor toujours OK

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/LayoutsView.vue
git commit -m "$(cat <<'EOF'
fix(layouts): restore tile grid display on /layouts

EOF
)"
```

---

### Task 3: Tuile recto — toggle face + ouvrir face active

**Files:**
- Modify: `frontend/src/views/LayoutsView.vue`

**Interfaces:**
- Consumes: `resolveOpenLayoutId`, `thumbnailForFace`, `getLinkedVersoId` from `layoutFaces.js`
- Produces: `faceByLayoutId` (ref `Record<id,'recto'|'verso'>`), `openEditor` ouvre la face active

- [ ] **Step 1: State + helpers d’ouverture**

```js
import {
  getLinkedVersoId,
  resolveOpenLayoutId,
  thumbnailForFace,
} from '@/utils/layoutFaces.js'

/** @type {import('vue').Ref<Record<string, 'recto'|'verso'>>} */
const faceByLayoutId = ref({})

function getTileFace(l) {
  return faceByLayoutId.value[l.id] || 'recto'
}

function setTileFace(l, face) {
  faceByLayoutId.value = { ...faceByLayoutId.value, [l.id]: face }
}

function openEditor(l) {
  if (renamingId.value) return
  if (l.is_back) {
    router.push(`/editor/${l.id}`)
    return
  }
  const id = resolveOpenLayoutId(l, getTileFace(l))
  router.push(`/editor/${id}`)
}

function tileThumbnail(l) {
  if (l.is_back) return l.thumbnail
  return thumbnailForFace(l, getTileFace(l), layouts.value)
}
```

- [ ] **Step 2: Template — toggle si lié, sélecteur sinon**

Sur tuile recto (`!l.is_back`) :

```html
<div v-if="getLinkedVersoId(l)" class="face-toggle" @click.stop>
  <button
    type="button"
    :class="['face-toggle-btn', { active: getTileFace(l) === 'recto' }]"
    @click="setTileFace(l, 'recto')"
  >Recto</button>
  <button
    type="button"
    :class="['face-toggle-btn', { active: getTileFace(l) === 'verso' }]"
    @click="setTileFace(l, 'verso')"
  >Verso</button>
</div>

<!-- miniature : src = tileThumbnail(l) -->

<!-- sélecteur verso UNIQUEMENT si pas de lien -->
<div v-if="!getLinkedVersoId(l)" class="tile-verso" @click.stop>
  ...select inchangé...
</div>
```

CSS toggle (compact, en tête de tuile) :

```css
.face-toggle {
  display: flex; gap: 2px; width: 100%;
}
.face-toggle-btn {
  flex: 1; padding: 4px 6px; font-size: 10px; font-weight: 600;
  background: var(--bg-deep); border: 1px solid var(--border-subtle);
  border-radius: 3px; color: var(--text-muted); cursor: pointer;
}
.face-toggle-btn.active {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  background: rgba(108,122,255,0.08);
}
```

- [ ] **Step 3: Vérif manuelle**

- Recto sans verso : sélecteur présent, pas de toggle
- Lier un verso (select ou ⚙) : toggle apparaît, sélecteur disparaît de la tuile
- Toggle Verso → miniature = thumb verso ; clic tuile → `/editor/<versoId>`
- Onglet Verso : DOS toujours listés

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/LayoutsView.vue
git commit -m "$(cat <<'EOF'
feat(layouts): tile face toggle opens displayed recto/verso

EOF
)"
```

---

### Task 4: `saveDefinition` → booléen de succès

**Files:**
- Modify: `frontend/src/stores/editor.js` (`saveDefinition`)

**Interfaces:**
- Produces: `saveDefinition(): Promise<boolean>` — `true` si clean après save (ou déjà clean) ; `false` si skip/échec

- [ ] **Step 1: Adapter `saveDefinition`**

Comportement cible :

```js
async function saveDefinition() {
  if (!layout.value) return false
  if (!dirty.value) return true
  if (mode.value === 'layout' && (readOnly.value || !layoutLockHeld.value)) return false
  cancelAutoSave()
  const versionAtSave = editVersion
  saving.value = true
  try {
    const thumbnail = captureCallback ? await captureCallback() : null
    if (mode.value === 'component') {
      await api.updateComponent(/* ... inchangé ... */)
      // ... cache inchangé ...
    } else {
      await api.updateLayoutDefinition(layout.value.id, { definition: layout.value.definition, thumbnail })
    }
    if (editVersion === versionAtSave) dirty.value = false
    return !dirty.value
  } catch (e) {
    console.error('saveDefinition failed', e)
    return false
  } finally {
    saving.value = false
    if (dirty.value && autoSave.value) scheduleAutoSave()
  }
}
```

Les boutons existants `@click="store.saveDefinition()"` restent valides (ignorent le bool).

- [ ] **Step 2: Smoke — sauvegarder un layout dirty dans l’éditeur**

Expected: dirty → clean ; console sans erreur

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/editor.js
git commit -m "$(cat <<'EOF'
refactor(editor): saveDefinition returns success boolean

EOF
)"
```

---

### Task 5: Toolbar éditeur — toggle + save-then-navigate

**Files:**
- Modify: `frontend/src/components/editor/EditorToolbar.vue`

**Interfaces:**
- Consumes: `getFacePartnerId` from `layoutFaces.js` ; `store.saveDefinition()` → boolean ; `allLayouts` déjà chargé dans le toolbar
- Produces: UI toggle si partenaire ; navigation `/editor/:partnerId`

- [ ] **Step 1: Computed partenaire + face courante**

```js
import { useRouter } from 'vue-router'
import { getFacePartnerId } from '@/utils/layoutFaces.js'

const router = useRouter()

const partnerId = computed(() =>
  store.mode === 'layout' ? getFacePartnerId(store.layout, allLayouts.value) : null
)

const activeFace = computed(() => {
  if (!store.layout) return 'recto'
  return store.layout.is_back ? 'verso' : 'recto'
})

async function switchFace(target) {
  if (!partnerId.value) return
  if (target === activeFace.value) return
  const ok = await store.saveDefinition()
  if (!ok) {
    // toast minimal : window.alert acceptable en v1 si pas de toast store
    window.alert('Impossible de sauvegarder avant de changer de face (verrou ou erreur).')
    return
  }
  await router.push(`/editor/${partnerId.value}`)
}
```

- [ ] **Step 2: UI dans `toolbar-left` (après badges)**

```html
<div
  v-if="store.mode === 'layout' && partnerId"
  class="face-toggle toolbar-face-toggle"
>
  <button
    type="button"
    :class="['face-toggle-btn', { active: activeFace === 'recto' }]"
    @click="switchFace('recto')"
  >Recto</button>
  <button
    type="button"
    :class="['face-toggle-btn', { active: activeFace === 'verso' }]"
    @click="switchFace('verso')"
  >Verso</button>
</div>
```

Réutiliser les classes `.face-toggle` / `.face-toggle-btn` (dupliquer le CSS scoped dans le toolbar, largeur auto).

Sur layout verso : le bouton Recto appelle `switchFace('recto')` → partner = recto. Sur recto : Verso → partner verso.  
`switchFace` ignore si `target === activeFace` ; si on clique l’autre, on navigue vers `partnerId` (toujours l’unique partenaire).

- [ ] **Step 3: Vérif manuelle**

1. Ouvrir un recto lié, modifier un atome, cliquer **Verso** → save puis éditeur verso
2. Sans lock / readOnly dirty → alert, reste sur place
3. Layout sans verso → pas de toggle

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/editor/EditorToolbar.vue
git commit -m "$(cat <<'EOF'
feat(editor): recto/verso toggle saves then navigates to partner

EOF
)"
```

---

### Task 6: WORKPLAN + acceptance

**Files:**
- Modify: `specs/WORKPLAN.md` (journal + coche tâche si section adéquate)

- [ ] **Step 1: Checklist acceptance (manuel)**

Cocher mentalement la section 7 du design spec :

- [ ] Grille blocs
- [ ] Sélecteur sans verso / toggle avec verso
- [ ] Open = face active
- [ ] Onglet Verso liste les DOS liés
- [ ] Éditeur save puis navigate
- [ ] Rename/duplicate/delete/create OK

- [ ] **Step 2: Journal WORKPLAN**

Ajouter une ligne `2026-07-19 (N)` résumant grille + tuile verso + toggle éditeur save-then-nav.

- [ ] **Step 3: Commit**

```bash
git add specs/WORKPLAN.md
git commit -m "$(cat <<'EOF'
docs: WORKPLAN entry for layouts grid + verso tile UX

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Grille blocs | Task 2 |
| Toggle si lié / sélecteur sinon | Task 3 |
| Miniature suit face | Task 3 (`thumbnailForFace`) |
| Open = face active | Task 3 |
| Versos restent dans onglet Verso | Task 2–3 (pas de filtre) |
| Save puis navigate éditeur | Task 4–5 |
| Config ⚙ toujours pour relier | déjà `LayoutSettingsModal` — non retiré |
| Pas de migration DB | aucun task schema |

**Placeholders:** none  
**Type consistency:** `getFacePartnerId(layout, layouts)`, `saveDefinition() → Promise<boolean>`, `face` ∈ `'recto'|'verso'`
