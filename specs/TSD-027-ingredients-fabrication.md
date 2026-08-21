# TSD-027 — Ingrédients de fabrication (atomes + molécule)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Done                                       |
| Author      | @merlinperrot                              |
| Created     | 2026-08-21                                 |
| Last update | 2026-08-21                                 |
| Depends on  | TSD-003 (atomes), TSD-005 (composants), TSD-007 (binding), TSD-021 (picto), TSD-022 / TSD-025 (mm) |

---

## 1. Purpose

Les cartes d’équipement affichent un bloc **Ingrédients de fabrication** : un en-tête (picto + titre rouge + phrase italique) et une rangée de cases chanfreinées (illustration Pictorgame + quantité), séparées par des losanges. Le designer pose ce bloc comme une **molécule** réutilisable (`mol-ingredients-fabrication`), hydratée par instance (`ingredient1` … `ingredient6`). La molécule porte la logique de rendu : max 6 cases, masquage des slots vides, répartitionition **space-evenly** (mm) des cases visibles.

---

## 2. Scope & boundaries

### In scope
- Atome **`cadreChanfrein`** : rectangle SVG à coins coupés à 45°
- Atome **`losange`** : diamant outlined centré
- Helpers de géométrie testables (points mm)
- Enregistrement registre / rendu / config atomes / `paramHelp`
- Binding des atomes **internes** d’une molécule (ou composant) posée sur un layout
- Masquage des cases vides + losanges entre cases **visibles** (aperçu instance / print, max 6)
- Reflow **space-evenly** (mm) des cases visibles — helper `layoutIngredientElements`
- Seed idempotent de la molécule **Ingrédients de fabrication** (56 × 28 mm)

### Out of scope
- Moteur de layout générique pour toutes les molécules
- Composants imbriqués dans un composant
- Seed du composant `cmp-ingredients-fabrication` au boot (legacy : peut rester en DB déjà peuplée, rendu statique sans reflow)
- Répétition dynamique N illimité
- Nouvel atome « case ingrédient » monolithique
- Modifier l’atome `cadre` (calligraphique) ou `separator` (plume)
- Picto mortier livré avec le seed (le designer choisit la `ref` Pictorgame)
- CSS `justify-content` / `px` sur le DOM carte

---

## 3. UX & interaction design

### Primary — designer
1. Palette **Ajouter** : atomes `Cadre chanfrein` et `Losange` comme les autres.
2. Liste **Molécules** : entrée **Ingrédients de fabrication** (seed au boot si absente).
3. Clic / drop sur un layout → bloc 56 × 28 mm. L’éditeur layout **affiche les 6 cases** (structure visible, déjà space-evenly).
4. `nameInLayout` de la molécule posée : ex. `craft`. Bindings listés dans le panneau Données.
5. Édition de la molécule elle-même : canvas = les atomes/groupes (positions stockées) ; le reflow runtime s’applique au rendu layout / instance / print.

### Primary — instance / print
1. Données carte : `craft.ingredientN.ref` (picto) + `craft.ingredientNq.text` (quantité).
2. Si `ref` de la case N est vide (clé absente, `""`, ou blanc) → case N masquée.
3. Les cases restantes sont **réparties space-evenly** sur la largeur de la molécule ; un losange n’apparaît qu’**entre** deux cases visibles consécutives (centré dans la gouttière).
4. Remplissage recommandé dans l’ordre 1 → 6 (les trous sont refermés par le reflow).
5. L’en-tête n’est jamais masqué ni déplacé par cette règle.

### Visual states

| Contexte | Rendu |
|----------|--------|
| Éditeur molécule | 6 cases + 5 losanges + en-tête (définition stockée) |
| Éditeur layout (molécule posée) | 6 cases space-evenly (hideEmptySlots=false) |
| Aperçu instance / print, 2 ingrédients | en-tête + 2 cases space-evenly + 1 losange |
| Picto `ref` inconnue | placeholder `?` existant de l’atome `picto` |
| Molécule seed déjà éditée par l’utilisateur | seed **ne réécrit pas** la définition |

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

### 4.3 — Molécule seed (canonique)

- **id stable :** `mol-ingredients-fabrication`
- **name :** `Ingrédients de fabrication`
- **width_mm / height_mm :** `56` / `28` (dans `definition`)
- **definition.layers :** groupes nommés (voir §4.4)
- Seed au boot : `INSERT` si l’id n’existe pas. **Jamais** de `UPDATE` de `definition` si la ligne existe.

Legacy : `cmp-ingredients-fabrication` peut exister dans d’anciennes DB ; il n’est plus seedé au boot et garde un rendu statique (sans reflow).

### 4.4 — Groupes et `nameInLayout`

| Groupe (`name`) | Contenu | nameInLayout atomes |
|-----------------|--------|---------------------|
| `header` | picto, title, text | `headerIcon`, `title`, `subtitle` |
| `ingredient1` … `ingredient6` | cadreChanfrein, picto, text | picto = `ingredientN` ; text = `ingredientNq` ; cadre sans nameInLayout |
| `diamond2` … `diamond6` | losange | (vide, non bindable) |

Le cadre n’est pas bindable. Le picto utilise le paramètre existant `ref` (Pictorgame). Le texte de quantité utilise `text`.

Préfixe = `nameInLayout` de la molécule **sur le layout** (ex. `craft`) :

```
craft.title.text
craft.subtitle.text
craft.headerIcon.ref
craft.ingredient1.ref
craft.ingredient1q.text
… craft.ingredient6.ref / craft.ingredient6q.text
```

### 4.5 — Layout seed (positions mm)

Largeur bloc 56 mm. Rangée y = 11. Case 7,2 × 16. Losange 1,6 × 1,6.
Les 6 cases sont placées en **space-evenly** :

```
space = (56 − 6 × 7,2) / 7
x[i]  = space + i × (7,2 + space)
```

Losange entre case i et i+1 : centré dans la gouttière (`mid − 0,8`).
Losange centré verticalement sur la rangée (`y = 11 + (16 − 1,6) / 2 = 18,2`).

En-tête : picto `0,5 / 0,5` — 6×6, `view=icon` ; titre `7,5 / 0,3` — 47,5×4,5, uppercase, serif, `#7a1f1f` ; sous-titre `7,5 / 5` — 47,5×5, italique, `fontSize` 2,2 mm. Textes par défaut :

- titre : `INGRÉDIENTS DE FABRICATION`
- sous-titre : `Cette arme peut être fabriquée en utilisant au moins 2 de ces éléments.`

Dans chaque case : cadre plein ; picto `view=icon` inset ~0,6 mm, hauteur ~10 mm ; quantité bande bas ~4,5 mm, centré.

Ces mm sont des **défauts éditables** dans l’éditeur molécule ; le runtime reclacule space-evenly à l’affichage.

### 4.6 — Helpers masquage + reflow

```js
// frontend/src/utils/ingredientSlots.js
export const INGREDIENT_SLOT_COUNT = 6
export const INGREDIENTS_FABRICATION_MOLECULE_ID = 'mol-ingredients-fabrication'

export function spaceEvenlyXs(widths, containerW) { /* … */ }

/** Flatten + translate x_mm ; diamants entre cases visibles seulement. */
export function layoutIngredientElements(definition, {
  data, prefix, hideEmptySlots, containerWidthMm,
}) { /* … */ }
```

`ComponentRenderer` / `CardPreview` : si `moleculeId === mol-ingredients-fabrication`, utiliser `layoutIngredientElements`. Sinon (composant legacy), `hiddenIngredientGroupNames` + flatten sans reflow.

Pas de mutation de la définition persistée.

---

## 5. API changes

N/A — pas de nouvelle route. Seed molécule via boot, table `molecules` existante.

Comportement seed :

- **id** `mol-ingredients-fabrication` absent → `INSERT`
- présent → no-op
- composant `cmp-ingredients-fabrication` : **plus seedé** au boot

---

## 6. Implementation steps

- [x] Helper `chamferRectPoints(w, h, cut)` + tests (clamp, cut=0 → rectangle)
- [x] Helper `diamondPoints(w, h)` + tests
- [x] Helper `ingredientSlots.js` (masquage + `spaceEvenlyXs` + `layoutIngredientElements`) + tests
- [x] `flattenComponentElements(def, { skipGroupNames })` + tests
- [x] `ATOM_TYPES.cadreChanfrein` / `losange` ; `AtomCadreChanfrein.vue` / `AtomLosange.vue` ; dispatcher `AtomRenderer.vue`
- [x] `paramHelp.js` + ENUM si besoin (aucun enum nouveau)
- [x] `ComponentRenderer` + `CardPreview` : reflow molécule ; legacy composant masquage seul
- [x] `resolveElementParams(el, data, prefix + '.' + el.nameInLayout)` pour chaque atome interne
- [x] `EditorCanvas` : passe `previewData` + `el.nameInLayout` au renderer ; **`hideEmptySlots=false`**
- [x] CardPreview / print : **`hideEmptySlots=true`**
- [x] Seed molécule JSON + insert idempotent au boot (composant non seedé)
- [x] Vérif `extractBindingPaths` : chemins `craft.ingredient1.ref` etc.

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| `cornerCut` trop grand | Clamp à `min(w,h)/2` — pas de polygone inversé |
| `strokeWidth` 0 | Pas de trait ; fill seul si non transparent |
| `ref` manquant pour case 3, cases 1–2 et 4–6 remplies | Case 3 masquée ; cases restantes **space-evenly** ; losanges entre cases visibles uniquement |
| Clé `craft.ingredientN.ref` absente du JSON instance | Case N masquée (print / CardPreview) |
| Molécule posée sans `nameInLayout` | Binding interne inopérant (TSD-007). En instance, prefix vide → toutes les cases masquées si `hideEmptySlots`. |
| Seed déjà en DB, définition custom | Ne pas écraser |
| Picto `view` autre que `icon` | Autorisé (params éditables) ; le seed pose `icon` |
| Impression | Même masquage + reflow que CardPreview (`hideEmptySlots=true`) |
| `space` négatif (cases trop larges) | Clamp space à 0 (pack à gauche) |
| Composant legacy `cmp-ingredients-fabrication` | Rendu sans reflow (masquage seul) |

---

## 8. Acceptance criteria

- [x] Les atomes `cadreChanfrein` et `losange` apparaissent dans la palette, le canvas, PropertiesPanel, Config atomes
- [x] Longueurs en mm via `mmCss` / viewBox mm ; pas de `px` dérivés de zoom
- [x] Molécule **Ingrédients de fabrication** présente après boot (id stable) si absente
- [x] Posée sur un layout avec `nameInLayout=craft`, les chemins `craft.ingredient1.ref` et `craft.ingredient1q.text` (×6) + en-tête sont extraits
- [x] Aperçu instance : 2 refs remplies → 2 cases space-evenly + 1 losange ; pas de trou à gauche
- [x] Éditeur layout : 6 cases visibles space-evenly
- [x] Tests unitaires géométrie + masquage + space-evenly + layout : verts
- [x] `npm test` (périmètre touché) vert

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | `ComponentRenderer` / `InlineComponentRenderer` passent `el.params` bruts — le binding interne des composants ne s’applique pas (préexistant, corrigé par ce TSD) | fixed | 2026-08-21 |

---

## 10. Open questions

Toutes tranchées :

- Granularité : 2 atomes primitifs (pas d’atome « case » ni bloc unique)
- 6 cases max, masquage si `ref` vide, **reflow space-evenly** (molécule)
- En-tête inclus dans la molécule
- Entité canonique = **molécule** `mol-ingredients-fabrication`
- Bindings : `ref` (picto) et `text` (quantité), pas d’alias `type` / `quantite`

---

## 11. Notes & references

- Capture de référence : en-tête parchemin + cases d’ingrédients
- TSD-007 §3.1 : `nameInLayout` du bloc + `nameInLayout` interne
- `prefixOverride` existe dans `resolveElementParams` mais n’est **jamais** passé par les renderers aujourd’hui
- Groupes : `extractBindingPaths` n’ajoute **pas** le nom de groupe au chemin — d’où `ingredient1` / `ingredient1q` distincts
- Atomes `price` / `resource` : Unicode + valeur à côté — visuel incompatible, non réutilisés ici
- Reflow calculé en mm (pas de flex CSS) pour respecter TSD-022 / TSD-025
