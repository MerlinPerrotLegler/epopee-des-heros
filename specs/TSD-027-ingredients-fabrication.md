# TSD-027 — Ingrédients de fabrication (atomes + composant)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Review                                     |
| Author      | @merlinperrot                              |
| Created     | 2026-08-21                                 |
| Last update | 2026-08-21                                 |
| Depends on  | TSD-003 (atomes), TSD-005 (composants), TSD-007 (binding), TSD-021 (picto), TSD-022 / TSD-025 (mm) |

---

## 1. Purpose

Les cartes d’équipement affichent un bloc **Ingrédients de fabrication** : un en-tête (picto + titre rouge + phrase italique) et une rangée de cases chanfreinées (illustration Pictorgame + quantité), séparées par des losanges. Le designer doit pouvoir poser ce bloc comme un composant réutilisable, hydraté par instance (`ingredient1` … `ingredient6`). Les molécules ont été retirées de l’UI : le regroupement se fait par **groupes** dans un composant.

---

## 2. Scope & boundaries

### In scope
- Atome **`cadreChanfrein`** : rectangle SVG à coins coupés à 45°
- Atome **`losange`** : diamant outlined centré
- Helpers de géométrie testables (points mm)
- Enregistrement registre / rendu / config atomes / `paramHelp`
- Binding des atomes **internes** d’un composant posé sur un layout (éditeur, aperçu instance, print)
- Masquage des cases vides + losange précédent (aperçu instance / print seulement, max 6)
- Seed idempotent du composant **Ingrédients de fabrication** (56 × 28 mm)

### Out of scope
- Réintroduire l’entité Molécule (table UI / routes)
- Composants imbriqués dans un composant
- Reflow (les cases restantes ne se recollent pas à gauche)
- Répétition dynamique N illimité
- Nouvel atome « case ingrédient » monolithique
- Modifier l’atome `cadre` (calligraphique) ou `separator` (plume)
- Picto mortier livré avec le seed (le designer choisit la `ref` Pictorgame)

---

## 3. UX & interaction design

### Primary — designer
1. Palette **Ajouter** : atomes `Cadre chanfrein` et `Losange` comme les autres.
2. Liste **Composants** : entrée **Ingrédients de fabrication** (seed au boot si absente).
3. Clic / drop sur un layout → bloc 56 × 28 mm. L’éditeur layout **affiche les 6 cases** (structure visible).
4. `nameInLayout` du composant posé : ex. `craft`. Bindings listés dans le panneau Données.
5. Édition du composant lui-même : canvas = les atomes/groupes, les 6 cases restent visibles.

### Primary — instance / print
1. Données carte : `craft.ingredientN.ref` (picto) + `craft.ingredientNq.text` (quantité).
2. Si `ref` de la case N est vide (clé absente, `""`, ou blanc) → case N masquée ; losange **avant** N masqué (`diamondN`, N ≥ 2).
3. Remplissage dans l’ordre 1 → 6 (pas de trou : ne pas renseigner 1 et 3 sans 2).
4. L’en-tête n’est jamais masqué par cette règle.

### Visual states

| Contexte | Rendu |
|----------|--------|
| Éditeur composant | 6 cases + 5 losanges + en-tête |
| Éditeur layout (composant posé) | idem, structure complète |
| Aperçu instance / print, 2 ingrédients | en-tête + case1 + losange + case2 |
| Picto `ref` inconnue | placeholder `?` existant de l’atome `picto` |
| Composant seed déjà édité par l’utilisateur | seed **ne réécrit pas** la définition |

### Croquis (mm, origine composant)

```
0                         56
┌─────────────────────────────────────────────┐
│ [picto] INGRÉDIENTS DE FABRICATION          │ 0–10
│         Cette arme peut être fabriquée…     │
│ [c1] ◆ [c2] ◆ [c3] ◆ [c4] ◆ [c5] ◆ [c6]   │ 11–27
└─────────────────────────────────────────────┘  28
```

Case (groupe) :

```
┌────────┐
│        │  picto view=icon
│  picto │
│   2    │  texte quantité, centré
└────────┘  cadreChanfrein derrière
```

---

## 4. Data model

### 4.1 — Atome `cadreChanfrein`

```js
cadreChanfrein: {
  label: 'Cadre chanfrein',
  icon: '▣',
  defaultParams: {
    strokeColor: '#1a1a1a',
    strokeWidth: 0.2,   // mm
    cornerCut: 1.2,     // mm — longueur coupée sur chaque arête
    fill: 'transparent',
    opacity: 1,
  },
  defaultSize: { width_mm: 7.2, height_mm: 16 },
}
```

Géométrie : octogone irrégulier (rectangle dont chaque coin est coupé à 45°). `cornerCut` clampé à `[0, min(w,h)/2]`. ViewBox = mm (comme `hexTile`). Inset du polygone de `strokeWidth/2` pour que le trait ne soit pas clipé.

### 4.2 — Atome `losange`

```js
losange: {
  label: 'Losange',
  icon: '◇',
  defaultParams: {
    color: '#1a1a1a',
    strokeWidth: 0.2,   // mm
    fill: 'transparent',
    opacity: 1,
  },
  defaultSize: { width_mm: 1.6, height_mm: 1.6 },
}
```

Losange = losange inscrit (sommets milieux des côtés du bbox). Même inset trait.

### 4.3 — Composant seed

- **id stable :** `cmp-ingredients-fabrication`
- **name :** `Ingrédients de fabrication`
- **width_mm / height_mm :** `56` / `28`
- **definition.layers :** groupes nommés (voir §4.4)
- Seed au boot : `INSERT` si l’id n’existe pas. **Jamais** de `UPDATE` de `definition` si la ligne existe.

### 4.4 — Groupes et `nameInLayout`

| Groupe (`name`) | Contenu | nameInLayout atomes |
|-----------------|--------|---------------------|
| `header` | picto, title, text | `headerIcon`, `title`, `subtitle` |
| `ingredient1` … `ingredient6` | cadreChanfrein, picto, text | picto = `ingredientN` ; text = `ingredientNq` ; cadre sans nameInLayout |
| `diamond2` … `diamond6` | losange | (vide, non bindable) |

Le cadre n’est pas bindable. Le picto utilise le paramètre existant `ref` (Pictorgame). Le texte de quantité utilise `text`.

Préfixe = `nameInLayout` du composant **sur le layout** (ex. `craft`) :

```
craft.title.text
craft.subtitle.text
craft.headerIcon.ref
craft.ingredient1.ref
craft.ingredient1q.text
… craft.ingredient6.ref / craft.ingredient6q.text
```

### 4.5 — Layout seed (positions mm)

Marge gauche 0,5. Rangée y = 11. Case 7,2 × 16. Losange 1,6 × 1,6, gouttière 0,3 de chaque côté. Losange centré verticalement sur la rangée (`y = 11 + (16 − 1,6) / 2 = 18,2`).

| Slot N | x case | x losange N (N≥2) |
|--------|--------|-------------------|
| 1 | 0,5 | — |
| 2 | 9,9 | 8,0 |
| 3 | 19,3 | 17,4 |
| 4 | 28,7 | 26,8 |
| 5 | 38,1 | 36,2 |
| 6 | 47,5 | 45,6 |

En-tête : picto `0,5 / 0,5` — 6×6, `view=icon` ; titre `7,5 / 0,3` — 47,5×4,5, uppercase, serif, `#7a1f1f` ; sous-titre `7,5 / 5` — 47,5×5, italique, `fontSize` 2,2 mm. Textes par défaut :

- titre : `INGRÉDIENTS DE FABRICATION`
- sous-titre : `Cette arme peut être fabriquée en utilisant au moins 2 de ces éléments.`

Dans chaque case : cadre plein ; picto `view=icon` inset ~0,6 mm, hauteur ~10 mm ; quantité bande bas ~4,5 mm, centré.

Ces mm sont des **défauts éditables** dans l’éditeur composant.

### 4.6 — Helper masquage

```js
// frontend/src/utils/ingredientSlots.js
export const INGREDIENT_SLOT_COUNT = 6

export function isBlankBindingValue(v) {
  if (v == null) return true
  const s = String(v).trim()
  return s === ''
}

/** prefix = nameInLayout du composant sur le layout, ex. "craft" */
export function isIngredientSlotEmpty(data, prefix, n) {
  const key = `${prefix}.ingredient${n}.ref`
  if (!data || typeof data !== 'object') return true
  if (!(key in data)) return true
  return isBlankBindingValue(data[key])
}

/**
 * Noms de groupes à omettre (instance / print).
 * diamondN est le losange *avant* la case N.
 */
export function hiddenIngredientGroupNames(data, prefix) {
  const hidden = new Set()
  for (let n = 1; n <= INGREDIENT_SLOT_COUNT; n++) {
    if (isIngredientSlotEmpty(data, prefix, n)) {
      hidden.add(`ingredient${n}`)
      if (n >= 2) hidden.add(`diamond${n}`)
    }
  }
  return hidden
}
```

`flattenComponentElements` gagne un argument optionnel `skipGroupNames: Set<string>` (groupes dont on n’émet pas les enfants). Pas de mutation de la définition persistée.

---

## 5. API changes

N/A — pas de nouvelle route. Seed composant via boot (`seedBuiltins` ou module voisin), table `components` existante.

Comportement seed :

- **id** `cmp-ingredients-fabrication` absent → `INSERT`
- présent → no-op

---

## 6. Implementation steps

- [ ] Helper `chamferRectPoints(w, h, cut)` + tests (clamp, cut=0 → rectangle)
- [ ] Helper `diamondPoints(w, h)` + tests
- [ ] Helper `ingredientSlots.js` + tests (vide, 2/6, trou 1+3, prefix)
- [ ] `flattenComponentElements(def, { skipGroupNames })` + tests
- [ ] `ATOM_TYPES.cadreChanfrein` / `losange` ; `AtomCadreChanfrein.vue` / `AtomLosange.vue` ; dispatcher `AtomRenderer.vue`
- [ ] `paramHelp.js` + ENUM si besoin (aucun enum nouveau)
- [ ] `ComponentRenderer` + `CardPreview` InlineComponentRenderer : `data`, `nameInLayout` (prefix), `hideEmptySlots`
- [ ] `resolveElementParams(el, data, prefix + '.' + el.nameInLayout)` pour chaque atome interne
- [ ] `EditorCanvas` : passe `previewData` + `el.nameInLayout` au renderer ; **`hideEmptySlots=false`**
- [ ] CardPreview / print : **`hideEmptySlots=true`**
- [ ] Seed JSON + insert idempotent au boot
- [ ] Vérif `extractBindingPaths` : chemins `craft.ingredient1.ref` etc. (déjà récursif sur composants)

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| `cornerCut` trop grand | Clamp à `min(w,h)/2` — pas de polygone inversé |
| `strokeWidth` 0 | Pas de trait ; fill seul si non transparent |
| `ref` manquant pour case 3, cases 1–2 et 4–6 remplies | Case 3 + `diamond3` masqués ; **trou visuel** (pas de reflow) — le designer doit remplir dans l’ordre |
| Clé `craft.ingredientN.ref` absente du JSON instance | Case N + losange N masqués (print / CardPreview) |
| Composant posé sans `nameInLayout` | Binding interne inopérant (TSD-007). En instance, prefix vide → toutes les cases masquées si `hideEmptySlots`. Le panneau Propriétés affiche déjà le champ identifiant : le designer le renseigne (ex. `craft`). |
| Seed déjà en DB, définition custom | Ne pas écraser |
| Picto `view` autre que `icon` | Autorisé (params éditables) ; le seed pose `icon` |
| Impression | Même masquage que CardPreview (`hideEmptySlots=true`) |

---

## 8. Acceptance criteria

- [ ] Les atomes `cadreChanfrein` et `losange` apparaissent dans la palette, le canvas, PropertiesPanel, Config atomes
- [ ] Longueurs en mm via `mmCss` / viewBox mm ; pas de `px` dérivés de zoom
- [ ] Composant **Ingrédients de fabrication** présent après boot (id stable) si absent
- [ ] Posé sur un layout avec `nameInLayout=craft`, les chemins `craft.ingredient1.ref` et `craft.ingredient1q.text` (×6) + en-tête sont extraits
- [ ] Aperçu instance : 2 refs remplies → 2 cases + 1 losange ; les 4 autres cases et losanges associés absents
- [ ] Éditeur composant et éditeur layout : 6 cases visibles
- [ ] Tests unitaires géométrie + masquage + flatten skip groupes : verts
- [ ] `npm test` (périmètre touché) vert

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | `ComponentRenderer` / `InlineComponentRenderer` passent `el.params` bruts — le binding interne des composants ne s’applique pas (préexistant, corrigé par ce TSD) | open | 2026-08-21 |

---

## 10. Open questions

Toutes tranchées en revue 2026-08-21 :

- Granularité : 2 atomes primitifs (pas d’atome « case » ni bloc unique)
- 6 cases max, masquage si `ref` vide, pas de reflow
- En-tête inclus dans le composant
- Molécule = groupe dans le composant (pas de restauration Molécules)
- Bindings : `ref` (picto) et `text` (quantité), pas d’alias `type` / `quantite`

---

## 11. Notes & references

- Capture de référence : en-tête parchemin + 5 cases (le 6ᵉ slot est une marge pour d’autres recettes)
- TSD-007 §3.1 : `nameInLayout` du composant + `nameInLayout` interne
- `prefixOverride` existe dans `resolveElementParams` mais n’est **jamais** passé par les renderers aujourd’hui
- Groupes : `extractBindingPaths` n’ajoute **pas** le nom de groupe au chemin — d’où `ingredient1` / `ingredient1q` distincts
- Atomes `price` / `resource` : Unicode + valeur à côté — visuel incompatible, non réutilisés ici
