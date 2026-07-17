# Unités mm physiques (TSD-022) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unifier toutes les tailles d’atomes sur le **mm physique** (retrait du système `% hauteur layout`), migrer les définitions existantes, corriger les fuites `px`, et verrouiller la convention dans les guidelines.

**Architecture:** Helper pur `migrateDefinitionSizing(def, heightMm)` + stamp `sizing: 'mm'`. Les atomes lisent `fontSize` (etc.) comme mm et passent uniquement par `useAtomScale().mmToPx`. Plus de `useLayoutRelativeFontMm` / `provide(LAYOUT_HEIGHT_MM_KEY)` pour le texte.

**Tech Stack:** Vue 3 Composition API, Pinia, ESM, tests Node (`node --test` / assert) sans framework dédié.

**Spec:** `specs/TSD-022-unites-mm-physiques.md`

## Global Constraints

- Longueurs linéaires = **mm physiques** → écran via `mmToPx` / SCALE uniquement
- Interdit : `px` CSS pour une taille visuelle ; `%` de `layout.height_mm` pour `fontSize` / paddings / bordures
- Ratios unitless OK (`lineHeight`, `opacity`, `diceScale`) ; `%` CSS OK pour `posX`/`posY` backgrounds ; `em` OK pour gaps typo relatifs au fontSize
- Pas de TypeScript ; alias `@/`
- Commit **uniquement** si l’utilisateur le demande (sinon skip les steps Commit)
- Mettre à jour `specs/WORKPLAN.md` en fin de session

---

## File map

| Path | Responsibility |
|------|----------------|
| `frontend/src/utils/migrateSizing.js` | Migration `%→mm` + stamp `sizing` |
| `frontend/src/utils/migrateSizing.test.js` | Tests Node assert |
| `frontend/src/stores/editor.js` | Appeler migration au load ; dirty si changé |
| `frontend/src/atoms/components/useLayoutRelativeFont.js` | Supprimer ou vider (plus de % runtime) |
| `frontend/src/atoms/components/AtomTitle.vue` (et Text, Pastille, Badge, Counter, CardType, Cadre, RichText) | `fontSize` = mm direct |
| `frontend/src/components/editor/EditorCanvas.vue` | Retirer `provide(LAYOUT_HEIGHT_MM_KEY)` |
| `frontend/src/components/cards/CardPreview.vue` | Idem |
| `frontend/src/atoms/components/AtomRectangle.vue` | `borderWidth` / `borderRadius` via `mmToPx` |
| `frontend/src/atoms/components/AtomImage.vue` | `borderRadius` via `mmToPx` |
| `frontend/src/atoms/components/AtomCardType.vue` | padding / radius en mm |
| `frontend/src/atoms/components/AtomCardPlaceholder.vue` | padding / radius en mm |
| `frontend/src/atoms/components/AtomPrice.vue` | gaps en mm |
| `frontend/src/atoms/components/AtomResource.vue` | gaps en mm |
| `frontend/src/atoms/index.js` | Commentaires `%` → `mm` |
| `frontend/src/atoms/paramHelp.js` | Help mm |
| `frontend/src/components/editor/PropertiesPanel.vue` | Labels / hints mm |
| `frontend/src/stores/config.js` | Label taille police (mm) |
| `.cursorrules` | Règle + checklist atome |
| `CLAUDE.md` | Convention mm explicite |
| `specs/TSD-022-unites-mm-physiques.md` | Status → Done en fin d’impl |
| `specs/WORKPLAN.md` | Journal |

---

### Task 1: Helper `migrateDefinitionSizing` + tests

**Files:**
- Create: `frontend/src/utils/migrateSizing.js`
- Create: `frontend/src/utils/migrateSizing.test.js`

**Interfaces:**
- Produces:
  - `PCT_SIZE_PARAMS = ['fontSize', 'maxFontSize']`
  - `REF_HEIGHT_MM = 88`
  - `migrateDefinitionSizing(definition, heightMm) → { definition, changed: boolean }`
  - Formule : `mm = (value / 100) * heightMm` pour params listés + `rows[].fontSize`
  - Si `definition.sizing === 'mm'` → no-op, `changed: false`
  - Sinon convertir, poser `sizing: 'mm'`, `changed: true` si une valeur a bougé **ou** si le stamp manquait

- [ ] **Step 1: Écrire les tests (fail attendu)**

```js
// frontend/src/utils/migrateSizing.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { migrateDefinitionSizing } from './migrateSizing.js'

describe('migrateDefinitionSizing', () => {
  it('no-op when sizing is mm', () => {
    const def = { sizing: 'mm', layers: [{ kind: 'element', params: { fontSize: 4.5 } }] }
    const { definition, changed } = migrateDefinitionSizing(def, 88)
    assert.equal(changed, false)
    assert.equal(definition.params?.fontSize ?? definition.layers[0].params.fontSize, 4.5)
  })

  it('converts fontSize percent to mm', () => {
    const def = {
      layers: [{ kind: 'element', params: { fontSize: 4.5, maxFontSize: 12 } }],
    }
    const { definition, changed } = migrateDefinitionSizing(def, 88)
    assert.equal(changed, true)
    assert.equal(definition.sizing, 'mm')
    assert.ok(Math.abs(definition.layers[0].params.fontSize - 3.96) < 1e-9) // 4.5% of 88
    assert.ok(Math.abs(definition.layers[0].params.maxFontSize - 10.56) < 1e-9)
  })

  it('converts rows[].fontSize and walks groups', () => {
    const def = {
      layers: [{
        kind: 'group',
        children: [{
          kind: 'element',
          params: { rows: [{ value: 'a', fontSize: 2.8 }, { value: 'b', fontSize: null }] },
        }],
      }],
    }
    const { definition, changed } = migrateDefinitionSizing(def, 100)
    assert.equal(changed, true)
    assert.equal(definition.layers[0].children[0].params.rows[0].fontSize, 2.8) // 2.8% of 100
    assert.equal(definition.layers[0].children[0].params.rows[1].fontSize, null)
  })

  it('does not convert padding or gap', () => {
    const def = { layers: [{ kind: 'element', params: { fontSize: 5, padding: 2, gap: 1 } }] }
    const { definition } = migrateDefinitionSizing(def, 100)
    assert.equal(definition.layers[0].params.padding, 2)
    assert.equal(definition.layers[0].params.gap, 1)
    assert.equal(definition.layers[0].params.fontSize, 5) // 5% of 100
  })

  it('is idempotent', () => {
    const def = { layers: [{ kind: 'element', params: { fontSize: 4.5 } }] }
    const once = migrateDefinitionSizing(def, 88)
    const twice = migrateDefinitionSizing(once.definition, 88)
    assert.equal(twice.changed, false)
    assert.equal(twice.definition.layers[0].params.fontSize, once.definition.layers[0].params.fontSize)
  })
})
```

- [ ] **Step 2: Lancer les tests — doivent FAIL**

Run: `cd frontend && node --test src/utils/migrateSizing.test.js`  
Expected: FAIL (module introuvable)

- [ ] **Step 3: Implémenter `migrateSizing.js`**

```js
// frontend/src/utils/migrateSizing.js
export const REF_HEIGHT_MM = 88
export const PCT_SIZE_PARAMS = ['fontSize', 'maxFontSize']

function pctToMm(value, heightMm) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return (n / 100) * heightMm
}

function convertParams(params, heightMm) {
  if (!params || typeof params !== 'object') return { params, changed: false }
  let changed = false
  const next = { ...params }

  for (const key of PCT_SIZE_PARAMS) {
    if (next[key] == null || next[key] === '') continue
    const converted = pctToMm(next[key], heightMm)
    if (converted !== next[key]) {
      next[key] = converted
      changed = true
    }
  }

  if (Array.isArray(next.rows)) {
    next.rows = next.rows.map((row) => {
      if (!row || row.fontSize == null || row.fontSize === '') return row
      const converted = pctToMm(row.fontSize, heightMm)
      if (converted === row.fontSize) return row
      changed = true
      return { ...row, fontSize: converted }
    })
  }

  return { params: next, changed }
}

function walkLayers(layers, heightMm) {
  let changed = false
  const out = (layers || []).map((item) => {
    if (!item) return item
    if (item.kind === 'group') {
      const childrenResult = walkLayers(item.children || [], heightMm)
      if (childrenResult.changed) changed = true
      return { ...item, children: childrenResult.layers }
    }
    const { params, changed: pChanged } = convertParams(item.params, heightMm)
    if (pChanged) changed = true
    return pChanged ? { ...item, params } : item
  })
  return { layers: out, changed }
}

/**
 * @param {object|null|undefined} definition
 * @param {number} heightMm
 * @returns {{ definition: object, changed: boolean }}
 */
export function migrateDefinitionSizing(definition, heightMm) {
  const def = definition && typeof definition === 'object'
    ? definition
    : { layers: [], dataSchema: {} }

  if (def.sizing === 'mm') {
    return { definition: def, changed: false }
  }

  const h = Number(heightMm)
  const height = Number.isFinite(h) && h > 0 ? h : REF_HEIGHT_MM
  const { layers, changed: layersChanged } = walkLayers(def.layers || [], height)

  return {
    definition: { ...def, layers, sizing: 'mm' },
    changed: true, // stamp always applied when missing
  }
}
```

Note: `changed: true` dès que le stamp manquait (même si aucune valeur numérique n’a bougé — ex. layout sans fontSize) pour forcer la persistance du stamp. Ajuste le test « converts » en conséquence ; le test no-op ne s’applique qu’avec `sizing: 'mm'`.

Si le test « converts fontSize » attend `changed: true` et le test idempotent passe — OK. Pour « does not convert padding », `fontSize` devient `5` sur height 100 → `5.0` mm (= 5% de 100).

- [ ] **Step 4: Relancer les tests — PASS**

Run: `cd frontend && node --test src/utils/migrateSizing.test.js`  
Expected: PASS

- [ ] **Step 5: Commit** (seulement si demandé)

```bash
git add frontend/src/utils/migrateSizing.js frontend/src/utils/migrateSizing.test.js
git commit -m "feat: migrate layout sizing percent to physical mm"
```

---

### Task 2: Brancher la migration dans le store éditeur

**Files:**
- Modify: `frontend/src/stores/editor.js`

**Interfaces:**
- Consumes: `migrateDefinitionSizing(def, heightMm)`
- Après `_migrateDefinition` (format calques), appeler sizing migration
- Si `changed` → `dirty.value = true` (ne pas forcer `dirty = false` juste après)

- [ ] **Step 1: Importer et wrapper**

En tête de `editor.js` :

```js
import { migrateDefinitionSizing, REF_HEIGHT_MM } from '@/utils/migrateSizing.js'
```

Remplacer l’usage direct :

```js
function _applyDefinitionMigrations(def, heightMm) {
  const structural = _migrateDefinition(def)
  const { definition, changed } = migrateDefinitionSizing(
    structural,
    heightMm ?? REF_HEIGHT_MM,
  )
  return { definition, sizingChanged: changed }
}
```

- [ ] **Step 2: `loadLayout`**

```js
async function loadLayout(id) {
  loading.value = true
  mode.value = 'layout'
  try {
    const raw = await api.getLayout(id)
    const { definition, sizingChanged } = _applyDefinitionMigrations(
      raw.definition,
      raw.height_mm,
    )
    raw.definition = definition
    layout.value = raw
    dirty.value = sizingChanged
    editVersion = 0
    history.value = []
    selectedElementId.value = null
    selectedItemId.value = layers.value[0]?.id || null
    requestFit.value = 'fit'
    await _preloadComponents()
  } finally {
    loading.value = false
  }
}
```

- [ ] **Step 3: `loadComponent`**

Après construction de `def` (branches layers / elements / empty), appliquer :

```js
const { definition, sizingChanged } = _applyDefinitionMigrations(
  def,
  comp.height_mm || REF_HEIGHT_MM,
)
def = definition
// ...
layout.value = { /* ... */, definition: def }
dirty.value = sizingChanged
```

- [ ] **Step 4: Vérifier manuellement**

1. Ouvrir un layout existant → DevTools : `store.layout.definition.sizing === 'mm'`
2. `fontSize` d’un titre ≈ ancienne_valeur × height / 100
3. Recharger → `dirty` false si autosave a persisté (ou rester dirty jusqu’au save)

- [ ] **Step 5: Commit** (si demandé)

```bash
git add frontend/src/stores/editor.js
git commit -m "feat: apply mm sizing migration on layout/component load"
```

---

### Task 3: Retirer le runtime `%` des atomes texte

**Files:**
- Modify: `AtomTitle.vue`, `AtomText.vue`, `AtomPastille.vue`, `AtomBadge.vue`, `AtomCounter.vue`, `AtomCardType.vue`, `AtomCadre.vue`, `AtomRichText.vue`
- Modify or Delete: `useLayoutRelativeFont.js`
- Modify: `EditorCanvas.vue`, `CardPreview.vue` (retirer provide)

**Interfaces:**
- `fontSize` / `maxFontSize` = mm → `mmToPx(params.fontSize)`
- Plus d’import `useLayoutRelativeFontMm`

- [ ] **Step 1: Pattern de remplacement (exemple Title)**

Avant :
```js
import { useLayoutRelativeFontMm } from './useLayoutRelativeFont.js'
const fontSizeMm = useLayoutRelativeFontMm(computed(() => props.params.fontSize || 4.5))
fontSize: `${mmToPx(fontSizeMm.value)}px`,
```

Après :
```js
fontSize: `${mmToPx(props.params.fontSize || 4.5)}px`,
```

- [ ] **Step 2: AtomText — autoSize**

Remplacer :
```js
const fontSizeMm = useLayoutRelativeFontMm(...)
const maxFontSizeMm = useLayoutRelativeFontMm(...)
```
par :
```js
const fontSizeMm = computed(() => Number(props.params.fontSize || 2.8))
const maxFontSizeMm = computed(() => Number(props.params.maxFontSize ?? 12))
```
Retirer `useLayoutScale` si plus utilisé ; si `layoutScale` servait uniquement au % → supprimer ce watch dependency.

- [ ] **Step 3: Badge**

```js
const resolvedFontSizeMm = computed(() => {
  const rowFs = matchedRow.value?.fontSize
  if (rowFs != null && rowFs !== '') return Number(rowFs)
  return Number(props.params.fontSize ?? 2.8)
})
// fontSize: `${mmToPx(resolvedFontSizeMm.value)}px`
```

- [ ] **Step 4: RichText / Cadre / Counter / Pastille / CardType**

Même pattern : plus de `useLayoutRelativeFontMm`.

- [ ] **Step 5: Nettoyer provide / helper**

Dans `EditorCanvas.vue` et `CardPreview.vue` : supprimer import + `provide(LAYOUT_HEIGHT_MM_KEY, …)`.

Supprimer le fichier `useLayoutRelativeFont.js` **si** plus aucune référence (`rg useLayoutRelativeFont`). Sinon le réduire à un re-export de `REF_HEIGHT_MM` depuis `migrateSizing.js` temporairement puis supprimer.

- [ ] **Step 6: Vérif UI**

Ouvrir éditeur : titre/texte lisibles ; changer zoom → taille visuelle change, valeur mm stable dans le panneau.

- [ ] **Step 7: Commit** (si demandé)

```bash
git add frontend/src/atoms/components frontend/src/components/editor/EditorCanvas.vue frontend/src/components/cards/CardPreview.vue
git commit -m "refactor: atom fontSize uses physical mm only"
```

---

### Task 4: Audit `px` → `mmToPx` (atomes non-texte)

**Files:**
- Modify: `AtomRectangle.vue`, `AtomImage.vue`, `AtomCardType.vue`, `AtomCardPlaceholder.vue`, `AtomPrice.vue`, `AtomResource.vue`
- Grep final : `rg 'px solid|padding:.*px|gap:.*px|borderRadius.*px' frontend/src/atoms/components`

**Interfaces:**
- Toute bordure / radius / padding / gap linéaire passe par `mmToPx`

- [ ] **Step 1: AtomRectangle**

```vue
<script setup>
import { computed } from 'vue'
import { useAtomScale } from './useAtomScale.js'
const props = defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
const { mmToPx } = useAtomScale(props)
const style = computed(() => {
  const p = props.params
  const border = p.borderWidth
    ? `${mmToPx(p.borderWidth)}px solid ${p.borderColor || '#000'}`
    : 'none'
  return {
    width: '100%',
    height: '100%',
    background: p.bgColor || '#2a3050',
    border,
    borderRadius: p.borderRadius ? `${mmToPx(p.borderRadius)}px` : '0',
    opacity: p.opacity ?? 1,
  }
})
</script>
<template>
  <div :style="style"></div>
</template>
```

- [ ] **Step 2: AtomImage — borderRadius**

```js
import { useAtomScale } from './useAtomScale.js'
const { mmToPx } = useAtomScale(props)
borderRadius: props.params.borderRadius ? `${mmToPx(props.params.borderRadius)}px` : '0',
```

- [ ] **Step 3: AtomCardType — padding / radius en mm**

Ajouter defaults implicites `paddingX: 1.5`, `paddingY: 0.5`, `borderRadius: 0.8` **ou** hardcoder via mm :
```js
borderRadius: `${mmToPx(0.8)}px`,
padding: `${mmToPx(0.5)}px ${mmToPx(1.5)}px`,
```
(Pas de nouveaux params obligatoires sauf s’ils existent déjà dans `defaultParams`.)

- [ ] **Step 4: AtomCardPlaceholder**

Remplacer `borderRadius: …px` et `padding: '0 4px'` par `mmToPx` (ex. `0` / `1` mm).

- [ ] **Step 5: AtomPrice / AtomResource**

Remplacer `gap:2px` par `gap: \`${mmToPx(0.5)}px\`` (ou `params.gap`).

- [ ] **Step 6: Grep de contrôle**

```bash
rg -n "px solid|padding:\s*'|gap:\s*'?[0-9]+px|borderRadius:.*px" frontend/src/atoms/components --glob '*.vue'
```

Expected: seules les sorties template du type `` `${mmToPx(...)}px` `` restent.

- [ ] **Step 7: Commit** (si demandé)

```bash
git add frontend/src/atoms/components
git commit -m "fix: convert atom decorative sizes from CSS px to mm"
```

---

### Task 5: Labels, defaults, guidelines

**Files:**
- Modify: `frontend/src/atoms/index.js` (commentaires `%` → `mm`)
- Modify: `frontend/src/atoms/paramHelp.js` si besoin
- Modify: `frontend/src/stores/config.js` — label `Taille police (mm)`
- Modify: `.cursorrules`
- Modify: `CLAUDE.md`
- Modify: `specs/TSD-022-unites-mm-physiques.md` Status → Done
- Modify: `specs/WORKPLAN.md`

- [ ] **Step 1: `atoms/index.js`**

Remplacer tous les commentaires `// % de la hauteur du layout` / `// % hauteur layout` par `// mm`.

- [ ] **Step 2: Config label**

```js
{ key: 'fontSize', label: 'Taille police (mm)', type: 'number', step: 0.1 },
```

- [ ] **Step 3: `.cursorrules` — section Conventions**

Ajouter après la ligne « Toutes les mesures visuelles sont en millimètres » :

```markdown
- **Tailles atomes (fontSize, padding, gap, borderWidth, thickness, borderRadius, letterSpacing, …)** : toujours en **mm physiques** de la carte. Conversion écran uniquement via `mmToPx()` / `useAtomScale`. Interdit : `px` CSS en dur pour une taille ; `%` de `layout.height_mm` pour ces params. Ratios unitless (`lineHeight`, `opacity`, `diceScale`) et `%` CSS de position (`posX`/`posY`) restent autorisés. Voir TSD-022.
```

Dans « Quand tu modifies un atome », ajouter :

```markdown
6. Toute longueur linéaire du rendu doit passer par `mmToPx` (jamais de `px` bruts). Documenter l’unité `mm` dans le commentaire `defaultParams`.
```

- [ ] **Step 4: `CLAUDE.md` — Conventions techniques**

Remplacer / compléter :

```markdown
- Mesures toujours en **mm** dans le store, les composants, et les props. Jamais de valeurs px codées en dur pour une taille visuelle (passer par `mmToPx` / SCALE).
- `fontSize`, paddings, gaps, bordures, épaisseurs : **mm physiques** (TSD-022) — pas de % hauteur layout.
```

- [ ] **Step 5: TSD-022 Status → Done** ; cocher acceptance criteria si tout est vrai

- [ ] **Step 6: WORKPLAN journal**

Ligne du jour : implémentation TSD-022 mm physiques + guidelines.

- [ ] **Step 7: Commit** (si demandé)

```bash
git add frontend/src/atoms/index.js frontend/src/stores/config.js .cursorrules CLAUDE.md specs/TSD-022-unites-mm-physiques.md specs/WORKPLAN.md
git commit -m "docs: lock physical-mm sizing convention for atoms"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Convention mm unique | 3, 4, 5 |
| Retrait % fontSize | 3 |
| Migration + stamp | 1, 2 |
| Audit px | 4 |
| Labels UI mm | 5 |
| Guidelines .cursorrules / CLAUDE | 5 |
| Idempotence migration | 1 |
| Hors scope positionnement / PDF / pictorgame | — (non traité) |

---

## Execution handoff

Plan enregistré dans `docs/superpowers/plans/2026-07-17-unites-mm-physiques.md`.

**Deux options d’exécution :**

1. **Subagent-Driven (recommandé)** — un sous-agent par tâche, review entre chaque
2. **Inline Execution** — exécution dans cette session avec checkpoints

Laquelle préfères-tu ?
