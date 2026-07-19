# Design — Textures Track + TrakPath (spec 1)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Approved (pending user file review)        |
| Date        | 2026-07-19                                 |
| Scope       | `trak`, `trakCorner`, `cardTrack`, `trakPath` + catalogue médias Track |
| Follow-up   | Spec 2 — atome `Plan` (hors scope ici)     |

---

## 1. Goal

1. Supprimer bordures et traits de plume sur les atomes Track (`trak`, `trakCorner`, `cardTrack`).
2. Introduire un catalogue de **textures Track** dans la médiathèque (`Chemin/Track`) avec métadonnées (id logique, type, alignement, voisins, margins ratio, tags).
3. Permettre d’assigner par case un `textureId` + `coin` (rotation), avec actions **Vider** / **Propager** / **Mélanger** (global et par case), en distinguant assignations utilisateur vs système.
4. Adapter le layout pour des empreintes variables (margins) sans chevauchement.
5. Ajouter l’atome **`trakPath`** : enchaînement de segments Track avec UX `+` orthogonaux.

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Découpage | **B** — Spec 1 textures+bordures (+ TrakPath) ; Spec 2 Plan ensuite |
| `coin` | Rotation 0 / 90 / 180 / 270° |
| Bordures | Tout supprimer (rect + plume + configs associées) |
| Margins / taille | Empreinte = base ± margins ; négatif réduit ; voisins décalés |
| ID texture | Logique stable sur le média ; plus petit numéro libre à l’ajout |
| `voisins` | Contrainte Mélanger + filtrage « compatible » |
| Matching type | Auto (droit/coin/impasse + H/V) + forçage manuel + Mélanger case |
| `trakCorner` | Inclus |
| UI catalogue | Médiathèque dossier système + édition métas au clic |
| Approche data | Étendre médias (`kind='track'`) comme les pictos |
| `cellSize` | Ratio de la dimension le long de la piste (éditable vue) |
| Margins unit | Ratios relatifs à `cellSize` (pas mm) |
| Tags | Optionnels, filtre UI uniquement (pas de contrainte matching) |

---

## 3. Data model

### 3.1 Folders & media

Seed dossiers système :

- `chemin` — parent `root`, nom `Chemin`
- `chemin-track` — parent `chemin`, nom `Track`

Upload dans `chemin-track` → `kind = 'track'`.

Colonne / champ JSON `track_meta` sur le média :

| Champ | Type | Notes |
|-------|------|--------|
| `id` | number ≥ 0 | ID logique ; allocation = plus petit entier libre parmi les tracks existants |
| `label` | string \| null | Optionnel |
| `type` | string | Ref `track_types.name` (ou id) — seed : `droit`, `coin`, `impasse` |
| `alignment` | `'horizontal' \| 'vertical' \| 'both'` | |
| `voisins` | number[] | IDs textures autorisées en adjacent |
| `margins` | `{ left, right, top, bottom }` | Ratios relatifs à la taille de base de case ; défaut `0` |

### 3.2 Types & tags

- `track_types` — comme `picto_tags` (id, name, color) ; types addables ; seed des 3 de base.
- `track_tags` + `media_track_tags` — tags **optionnels** pour filtres médiathèque / sélecteur ; n’influencent pas Mélanger.

### 3.3 Upload orientation convention (auteur)

| Type | Orientation attendue du fichier |
|------|----------------------------------|
| `droit` | Axe gauche → droite |
| `coin` | Haut → gauche |
| `impasse` | Haut |

Pas de rotation destructive du fichier à l’upload ; la rotation runtime est `coin` sur la case.

### 3.4 Cell overrides

Étend `cellOverrides[idx]` :

```js
{
  textureId: number | null,
  coin: 0 | 90 | 180 | 270,
  textureSource: 'user' | 'system' | null  // null = pas de texture
  // bgColor / svgMediaId hérités peuvent rester pour compat, ou être dépréciés si inutiles
}
```

- Choix manuel / Propager → `textureSource: 'user'`
- Mélanger → uniquement cases non-`user` → `textureSource: 'system'`
- Affichage éditeur : `system` à opacité réduite (~0.35) ; aperçu print / export DOM → opacité pleine
- Relancer Mélanger : conserve seulement `user`, retire et retombe le reste

### 3.5 Atom params cleanup

Sur `trak`, `trakCorner`, `cardTrack` : retirer `border*`, `penStyle`, `penSeed*`, `penPoolSize`, `penColor`, `penWidth` (et UI associée).

Remplacer `cellSize_mm` par `cellSize` (ratio) sur `trak` / `trakPath` (et équivalent si applicable).

---

## 4. Layout & rendering

### 4.1 cellSize (ratio)

- `cellSize` ∈ (0, 1], éditable depuis PropertiesPanel (et contrôles vue si utiles).
- Horizontal : taille base case (mm) = `cellSize × width_mm` de l’atome (ou longueur du segment).
- Vertical : `cellSize × height_mm`.
- CardTrack : taille base dérivée du layout existant (épaisseur / longueur de côté) ; margins en ratio de cette base.

### 4.2 Margins → footprint

Pour une case avec texture :

- `baseW`, `baseH` = taille de base
- Empreinte :
  - `w = baseW × (1 + margins.left + margins.right)`
  - `h = baseH × (1 + margins.top + margins.bottom)`
  - (ou application par côté en offset de placement ; négatif réduit)
- Sans texture → empreinte = base
- Placement séquentiel le long de la piste : chaque case démarre après l’empreinte de la précédente (pas de grille fixe égale) → **aucun chevauchement**
- Texture dessinée dans l’empreinte ; `coin` = rotation autour du centre
- Numéro de case par-dessus ; **aucun** stroke / plume

### 4.3 Cell role inference (matching)

| Rôle case | Type texture attendu | Alignement |
|-----------|----------------------|------------|
| Droite (milieu segment) | `droit` | H ou V selon direction |
| Coin (changement de direction / coin CardTrack) | `coin` | selon géométrie |
| Extrémité (début/fin path, ou impasse) | `impasse` | selon direction |

---

## 5. Atome `trakPath`

### 5.1 Params

```js
{
  cellSize: 0.1,           // ratio
  n_start: 0,
  segments: [
    { direction: 'right', count: 5 },  // right|left|up|down
    // …
  ],
  cellOverrides: {},
  // apparence texte / bg comme trak, sans bordures
}
```

À la création : un segment initial déjà présent (ex. `{ direction: 'right', count: N }`).

### 5.2 UX segments

- Depuis la **dernière case**, afficher des contrôles `+` dans chaque sens **orthogonal** au segment courant.
- Clic `+` → append un nouveau segment dans cette direction (count éditable ensuite).
- Numérotation continue sur tout le path.
- PropertiesPanel : liste des segments (direction, count, supprimer le dernier).
- Textures / Vider / Propager / Mélanger : sur **toutes** les cases du path (`cellOverrides` index global).

### 5.3 Bounding box

Le SVG / boîte de l’atome englobe l’union des empreintes de tous les segments (width_mm / height_mm mis à jour ou calculés au rendu).

---

## 6. UI — actions textures

### 6.1 Global (atome sélectionné)

| Action | Comportement |
|--------|----------------|
| **Vider les textures** | Efface `textureId`, `coin`, `textureSource` sur toutes les cases |
| **Propager** | Popup : choisir une texture (+ coin optionnel) → applique à toutes (`user`) |
| **Mélanger** | Remplit cases non-`user` avec candidats compatibles (`system`) ; 2ᵉ passage conserve `user` seulement |

### 6.2 Par case (activeCellIdx)

- Champs `textureId`, `coin`
- Menu :
  1. **Mélanger** (cette case)
  2. Textures **compatibles** (type + alignment + voisins vs adjacentes texturées)
  3. Séparateur
  4. Autres textures (forçage)
- Filtre tags optionnel dans le sélecteur
- Toute sélection manuelle → `user`

### 6.3 Médiathèque

- Formulaire métas Track au clic / upload dans `Chemin/Track`
- CRUD types + tags
- Filtres type / tags

---

## 7. Matching algorithm (Mélanger)

Pour chaque case cible (non-`user`) :

1. Inférer rôle (type + alignment requis).
2. Filtrer catalogue : type match, alignment (`both` ou requis), contrainte `voisins` avec voisins déjà assignés (user ou system déjà posés dans le même passage selon ordre de parcours).
3. Tirer un candidat ; fixer `coin` pour aligner la convention upload avec l’orientation de la case.
4. Si aucun candidat → laisser vide (pas d’erreur bloquante).

Parcours déterministe (ordre des index) ; seed optionnel plus tard (hors V1 si non demandé).

---

## 8. API

- Seed folders `chemin` / `chemin-track`
- CRUD `track_types`, `track_tags` (+ jonction)
- PATCH média track : `track_meta` ; calcul `id` = plus petit libre
- GET catalogue textures track (`?type=&tag=`)
- Upload existant : si `folder_id === chemin-track` → `kind='track'` + meta initiale

Migrations idempotentes (`ALTER` / `CREATE IF NOT EXISTS`).

---

## 9. Files to touch (indicative)

| Area | Files |
|------|--------|
| Schema / seed | `backend/db/schema.sql`, `database.js` snapshot |
| API | `backend/routes/media.js`, nouvelles routes types/tags track |
| Atoms | `frontend/src/atoms/index.js`, `paramHelp.js`, `AtomTrak.vue`, `AtomTrakCorner.vue`, `AtomCardTrack.vue`, **nouveau** `AtomTrakPath.vue` |
| Layout utils | `cardTrackLayout.js`, nouveau helper footprints / path segments |
| UI | `PropertiesPanel.vue`, médiathèque (édition meta track), `EditorCanvas.vue` (`+` path) |
| Store | `editor.js` si besoin actions path / cell |
| Workplan | `specs/WORKPLAN.md` |

---

## 10. Out of scope

- Atome **Plan** (spec 2)
- Rotation / crop destructif du fichier à l’upload
- Export PDF hors-DOM
- Contraintes tags dans Mélanger

---

## 11. Acceptance

1. Aucune bordure / plume configurable ni rendue sur `trak`, `trakCorner`, `cardTrack`, `trakPath`.
2. Upload dans `Chemin/Track` crée une texture avec `id` dense ; types addables ; tags filtrables.
3. Par case : `textureId` + `coin` éditables ; manuel = `user` (opaque) ; système = transparent en éditeur.
4. **Vider** / **Propager** / **Mélanger** (global + case) respectent la sémantique user/system.
5. Margins ratio modifient l’empreinte ; cases adjacentes ne se chevauchent pas.
6. `cellSize` ratio éditable ; plus de `cellSize_mm`.
7. `trakPath` : segment initial ; `+` orthogonaux depuis la dernière case ; numérotation continue ; textures sur le path entier.
