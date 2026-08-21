# TSD-030 — Rotation des éléments (poignée canvas)

| Field       | Value                         |
|-------------|-------------------------------|
| Status      | Done                          |
| Author      | @merlinperrot                 |
| Created     | 2026-08-21                    |
| Last update | 2026-08-21                    |
| Depends on  | TSD-001, TSD-025, TSD-028     |

---

## 1. Purpose

Le designer doit pouvoir **tourner un élément de layout** (atome ou composant) comme dans Figma / Illustrator : geste sur le canvas, pas seulement un nombre dans le panneau. Le champ `rotation` et le rendu CSS `rotate()` existent déjà ; il manque l’interaction (poignée, snap Shift, multi-sélection autour d’un pivot).

---

## 2. Scope & boundaries

### In scope
- Poignée de rotation sur l’élément **primaire** (`selectedElementId`), au-dessus du milieu du bord haut
- Glisser pour tourner autour du **centre** de l’élément (1 élément) ou du **centre de la sélection** (≥ 2 racines)
- **Shift** pendant le geste : snap par pas de **15°**
- Libellé d’angle près du curseur pendant le geste
- Double-clic sur la poignée : ramener le primaire à `0°` (le set suit le même Δ)
- Champ **Rotation** existant dans le panneau Propriétés (saisie précise) ; normalisation `(-180, 180]`
- Helper pur testable (`elementRotation.js`) + wiring `useDragAndDrop` / store / `EditorCanvas`
- Éditeur layout **et** composant (même canvas)

### Out of scope
- Boîte englobante visible de la sélection / poignées communes (reste TSD-028)
- Resize dans les axes locaux de l’élément tourné (le resize actuel, axes carte, est inchangé)
- Raccourcis `[` `]` / boutons 90° / slider / cadran dans le panneau
- Origin de rotation déplaçable
- Rotation des atomes de fond (`BACKGROUND_ATOM_TYPES`)
- Nouveau champ persistant : `rotation` existe déjà sur les éléments

---

## 3. UX & interaction design

### Apparition de la poignée

Visible si **toutes** les conditions sont vraies :
- un `selectedElementId` (élément primaire) existe
- l’élément n’est pas locké (ni via `_layerLocked`)
- pas un atome de fond (`BACKGROUND_ATOM_TYPES`)
- pas en mode dessin

**Composants** : poignée **oui** (pas de poignées de resize, mais on peut tourner la boîte).

**Groupe seul sélectionné** (`selectedElementId === null`) : pas de poignée. L’utilisateur clique un enfant, ou le groupe + un élément, pour tourner. (Les descendants d’un groupe **inclus dans le set via TSD-028** — ex. drag du groupe — sont déjà des cibles de `getDragStartPositions` ; si le primaire est un enfant, la poignée est sur cet enfant.)

```
        ○  ← poignée (disque ~1.6 mm, accent)
        |
   ┌────┬────┐
   │         │  élément primaire (déjà rotate CSS)
   │         │
   └─────────┘
```

La poignée est **enfant DOM** de la boîte de l’élément : elle tourne avec lui (espace local, comme Figma). Trait vertical ~3 mm au-dessus du bord haut, disque au bout. Curseur `grab` / `grabbing`. z-index au-dessus des poignées de resize (102).

### Primary flow — un élément
1. Sélectionner un élément déverrouillé
2. Attraper la poignée et glisser autour du centre de la boîte
3. L’angle suit le vecteur **centre → pointeur** (mm carte via `clientPointToCardMm`)
4. Relâcher → `rotation` persistée dans la définition, `dirty = true`
5. Undo (Ctrl+Z) : un seul snapshot, pris au `mousedown` (comme un drag)

Formule du geste (corps rigide) :
- Au mousedown : `startPointerAngle`, `startRotation` du primaire, positions/rotations de départ du set
- En move : `rawDelta = currentPointerAngle - startPointerAngle`
- `targetPrimary = startRotation + rawDelta` (puis snap Shift, puis `normalizeDeg`)
- `appliedDelta = targetPrimary - startRotation`
- Appliquer `appliedDelta` à tout le set (voir §4)

### Primary flow — multi-sélection
1. Sélectionner plusieurs calques (TSD-028)
2. La poignée reste sur l’**élément primaire**
3. Glisser fait tourner **tout le set déverrouillé** autour du **pivot de sélection** : centre de l’AABB des **centres** des éléments du set (mêmes ids que `getDragStartPositions` : racines, descendants de groupes, skip lockés)
4. Chaque élément : `rotation += appliedDelta` (normalisé) **et** son centre orbite autour du pivot → `x_mm` / `y_mm` recalculés (`x = cx' - w/2`, `y = cy' - h/2`)
5. Un seul élément dans le set (ou pivot = son propre centre) : `x_mm` / `y_mm` inchangés

### Secondary
- **Shift** maintenu : `targetPrimary` accroché à la grille 15° la plus proche (pas un offset figé à l’instant du Shift). Relâcher Shift → angle libre à nouveau.
- **Double-clic** poignée : `appliedDelta = normalizeDeg(0 - startRotation)` du primaire, même transforme que le geste (set orbite). Un élément → simplement `rotation = 0`.
- Panneau : champ numérique existant, step 1°. Valeur affichée / stockée **normalisée** `(-180, 180]`. Pas de slider ni boutons 90°.
- Libellé pendant le geste : pastille près du **curseur écran** (pas dans la boîte tournée, donc toujours droite) : `37°`. Disparaît au mouseup.
- Hover poignée : curseur `grab` ; tooltip optionnel « Rotation (Shift : 15°) ».

### Visual states

| État | Description |
|------|-------------|
| Rien de sélectionné / locké / fond / dessin | Pas de poignée |
| Primaire éligible | Poignée + trait au-dessus du bord haut |
| Geste en cours | Curseur `grabbing`, libellé d’angle, éléments suivent en live (`noHistory`) |
| Shift | Même geste, angle primaire multiple de 15° |
| Lecture seule (verrou layout) | Pas de geste (comme drag) |

---

## 4. Data model

Aucun nouveau champ. Chaque **élément** (pas les groupes) a déjà :

```js
{
  id: "uuid",
  x_mm: 12,
  y_mm: 8,
  width_mm: 30,
  height_mm: 10,
  rotation: 0,   // degrés, défaut 0
  // …
}
```

- **Unité** : degrés, sens CSS (horaire positif).
- **Pivot visuel** : `transform-origin` CSS par défaut (`50% 50%`) — inchangé. Le centre logique est `(x_mm + width_mm/2, y_mm + height_mm/2)`.
- **Plage stockée** : `normalizeDeg` → `(-180, 180]`  
  `190 → -170`, `-190 → 170`, `180` reste `180`, `-180` → `180`.
- **Rendu existant** : `transform: rotate(${rotation}deg)` dans `EditorCanvas`, `CardPreview`, `ComponentRenderer`. Pas de changement de formule.
- **Groupes** : pas de `rotation` propre. Tourner un groupe = tourner ses descendants éléments autour du pivot du set.

Helper `frontend/src/utils/elementRotation.js` (pur) :

| Fonction | Rôle |
|----------|------|
| `normalizeDeg(deg)` | `(-180, 180]` |
| `snapDeg(deg, step = 15)` | plus proche multiple |
| `elementCenter(el)` | `{ x, y }` mm |
| `selectionPivot(els)` | centre de l’AABB des centres |
| `pointerAngleDeg(px, py, cx, cy)` | `atan2(py - cy, px - cx)` en degrés |
| `rotatePoint(x, y, cx, cy, deltaDeg)` | orbit |
| `applyRotationDelta(els, deltaDeg, pivot)` | `[{ id, x_mm, y_mm, rotation }]` |

`getDragStartPositions` devra aussi renvoyer `rotation`, `width_mm`, `height_mm` (aujourd’hui seulement `x`, `y`) **ou** le store lira les éléments au snapshot du geste.

---

## 5. API changes

N/A — `rotation` est déjà dans `definition` JSON (`PUT /layouts/:id/definition` / composants). Pas de migration DB.

---

## 6. Implementation steps

- [x] Step 1 — `elementRotation.js` + tests (`elementRotation.test.js`) : normalize, snap, angles, un élément (xy inchangés), deux éléments (orbit + Δ rotation)
- [x] Step 2 — store : étendre le snapshot de drag (rotation + taille) ; action d’application du Δ (`updateElement` × n, `noHistory` pendant le geste)
- [x] Step 3 — `useDragAndDrop.js` : `startRotate` / `onRotateMove` / `onRotateEnd` (snapshot mousedown, Shift, `clientPointToCardMm`)
- [x] Step 4 — `EditorCanvas.vue` : poignée + trait, libellé d’angle écran, double-clic → Δ vers 0°
- [x] Step 5 — `PropertiesPanel` : normaliser `rotation` à la saisie (même helper)
- [x] Step 6 — vérifier preview / print (déjà `rotate` CSS) ; pas de régression resize

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Élément locké / calque locké / fond / mode dessin | Pas de poignée, pas de mutation |
| `width_mm` / `height_mm` ≤ 0 | Pas de poignée |
| Shift pendant le geste | `targetPrimary` sauté sur la grille 15° ; relâcher Shift = libre |
| Saisie panneau `190` / `-190` | Stocké `-170` / `170` |
| Un élément, geste quelconque | Seul `rotation` change ; `x_mm`/`y_mm` identiques |
| Deux+ éléments | Centres orbitent autour du pivot ; même `appliedDelta` sur chaque `rotation` |
| Item locké dans le set | Ignoré (les autres tournent) |
| Groupe + enfant tous deux sélectionnés | Racines TSD-028 : l’enfant n’est pas une racine ; on tourne les descendants du groupe une fois |
| Composant | La boîte du composant tourne ; les atomes internes n’ont pas de `rotation` individuelle |
| Resize après rotation | **Inchangé** (axes carte). Limite connue : les poignées sont visuellement tournées (DOM enfant) mais le calcul resize reste aligné carte |
| Éditeur en lecture seule | Geste no-op (`assertEditable`) |
| Double-clic poignée, déjà 0° | No-op (Δ = 0) |

---

## 8. Acceptance criteria

The feature is done when ALL of these are true:

- [x] Un élément sélectionné affiche une poignée au-dessus du bord haut ; la glisser change `rotation` en live et à la sauvegarde
- [x] Shift accroche l’angle du primaire par pas de 15°
- [x] Le champ panneau et le canvas affichent la même valeur normalisée `(-180, 180]`
- [x] Multi-sélection : tout le set déverrouillé tourne autour du centre de la sélection ; positions et rotations à jour
- [x] Double-clic poignée ramène le primaire à 0° (set suit)
- [x] Undo d’un geste de rotation = une étape
- [x] Pas de poignée sur fond, locké, mode dessin
- [x] Tests du helper verts ; preview/print toujours `rotate()` CSS
- [x] Resize non régressé (comportement axes-carte actuel conservé)

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | Resize d’un élément déjà tourné : poignées visuelles dans l’espace local, delta souris en axes carte → « glissement ». **Wont fix dans ce TSD** (hors scope, axes locaux = itération future). | wont fix — hors scope TSD-030 | 2026-08-21 |

---

## 10. Open questions

Toutes tranchées en design (2026-08-21) :

- Interaction = poignée canvas Figma + champ panneau existant, Shift 15° — pas de slider / boutons 90°.
- Pas de boîte englobante visible ; poignée sur le primaire ; le set tourne autour du centre de sélection.
- Resize local hors scope.
- Normalisation `(-180, 180]`.

---

## 11. Notes & references

- Rendu déjà en place : `EditorCanvas.vue` `elementStyle`, `CardPreview.vue`, `ComponentRenderer.vue` — `transform: rotate(${el.rotation}deg)`.
- Création d’éléments : `rotation: 0` dans `editor.js` (`addElement` / fond / plan).
- Poignées resize : `EditorCanvas.vue` ~1.2 mm, `--accent-primary`, z-index 101. Poignée rotate : même langue visuelle, z-index 102.
- TSD-001 (canvas), TSD-025 (pointeur mm / viewport), TSD-028 (racines de sélection, poignées sur le primaire seulement).
- Décision UX : le libellé d’angle est en coordonnées **écran** (suit le curseur) pour rester lisible quand l’élément est tourné.
