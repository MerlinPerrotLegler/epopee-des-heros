# TSD-029 — Administration des types de layout

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Review                       |
| Author      | @merlinperrot                |
| Created     | 2026-08-21                   |
| Last update | 2026-08-21                   |
| Depends on  | TSD-017 (card_types), TSD-005 (listing layouts) |

---

## 1. Purpose

Les layouts sont classés par un `card_type` (Équipement, Quête, …). La table et l’API d’ajout existent (TSD-017), mais **aucune UI n’appelle la création** : Config n’a pas d’onglet Types, et la modale layout ne propose que le select des types seedés. Le designer doit pouvoir ajouter un type, en renommer le libellé, et en supprimer — depuis Configuration et sans quitter la création d’un layout.

---

## 2. Scope & boundaries

### In scope
- CRUD UI des types dans **Configuration → onglet Types**
- Raccourci **+ Nouveau type…** dans la modale layout (créer / modifier) et la modale « Nouveau verso »
- `PATCH` du libellé ; `POST` avec code optionnel (slug auto) ; `DELETE` avec garde `dos`
- `GET` enrichi de `usage_count`
- Badges listing / toolbar : afficher le **libellé**, fallback sur le code si type orphelin
- Helper `slugifyTypeCode` + tests

### Out of scope
- Renommage du `code` (clé des layouts)
- Couleur / icône par type (l’atome `cardType` garde ses propres couleurs)
- Fusion / réassignation en masse des layouts orphelins
- Changement du seed historique (`cestpasjuste` reste sans underscores)

---

## 3. UX & interaction design

### Décisions (brainstorming)

| Question | Choix |
|----------|--------|
| Où ajouter | Config **et** raccourci modale layout |
| Catalogue Config | Ajout + renommage libellé + suppression |
| Saisie du code | Libellé obligatoire ; code optionnel, auto si vide |
| Pattern UI | Approche 1 — Config + création inline (pas de 2ᵉ overlay, pas de combobox libre) |

### Primary — Config

1. Ouvrir Configuration → onglet **Types**.
2. Liste : libellé (éditable), code (lecture seule, mono), `N layouts`, supprimer.
3. Ajout : champ libellé, champ code optionnel, aperçu `→ slug` si code vide, bouton Ajouter.
4. Édition libellé : Enter ou blur → `PATCH`. Escape annule.
5. Supprimer : si `usage_count > 0`, confirmation « N layouts gardent ce code ». `dos` : pas de bouton.

### Primary — modale layout / verso

1. Select Type : types existants + option **+ Nouveau type…** (`__create__`).
2. Choisir cette option déplie libellé + code optionnel + Créer (même règles que Config).
3. Succès : le nouveau type est sélectionné, le panneau se referme, la liste parent est rafraîchie.
4. Annuler le dépliage : resélectionner un type existant (le sentinel n’est jamais la valeur sauvée).

### Visual states

| État | Comportement |
|------|----------------|
| Liste vide (hors seed) | Ligne d’ajout seule |
| Slug preview | Visible seulement si code saisi vide et label non vide |
| Erreur API | Message sous le formulaire ; modale layout **reste ouverte** |
| `dos` | Ligne normale, libellé éditable, pas de ✕ |
| Type orphelin sur un layout | Badge = code brut |

### Croquis Config

```
Types
┌──────────────┬────────────┬──────────┬───┐
│ Équipement   │ equipement │ 12 layouts│ ✕│
│ Quête        │ quete      │  4 layouts│ ✕│
│ Dos de carte │ dos        │  3 layouts│  │
└──────────────┴────────────┴──────────┴───┘
[ Libellé________ ] [ code (opt.) ] → mon_type  [ Ajouter ]
```

---

## 4. Data model

Aucune nouvelle table. `card_types` inchangé :

```sql
code TEXT PRIMARY KEY,
label TEXT NOT NULL,
created_at …
```

`layouts.card_type` continue de stocker le **code**. Un `PATCH` de libellé ne touche pas les layouts. Après `DELETE`, les layouts gardent le code orphelin (pas de FK cascade).

`GET` ajoute un champ calculé `usage_count` (COUNT des layouts dont `card_type` = `code`). Pas de colonne persistée.

---

## 5. API changes

Auth : toutes les routes `/api/*` restent derrière `requireAuth` (existant).

### `GET /api/card-types`
- **Purpose :** liste pour sélecteurs et Config
- **Response :** `[{ code, label, created_at, usage_count }]` triés par `label`
- `usage_count` : entier ≥ 0

### `POST /api/card-types`
- **Purpose :** créer un type
- **Request :** `{ "label": "Faveur Royale", "code": "" }` — `code` omis ou blanc → slug du label
- **Response 201 :** `{ code, label, usage_count: 0 }`
- **400** label vide (après trim) ; slug vide après normalisation
- **409** code déjà existant — **ne plus** utiliser `INSERT OR IGNORE` (succès silencieux)

Le serveur **re-normalise** toujours le code (source de vérité). Le preview UI peut diverger : le POST gagne.

### `PATCH /api/card-types/:code`
- **Purpose :** changer le libellé uniquement
- **Request :** `{ "label": "Nouveau nom" }`
- **Response 200 :** `{ code, label, usage_count }`
- **400** label vide ; **404** code inconnu
- Le `code` dans l’URL n’est pas slugifié à nouveau (les codes seedés restent tels quels)

### `DELETE /api/card-types/:code`
- **Purpose :** retirer le type du catalogue
- **Response 200 :** `{ ok: true }`
- **404** inconnu ; **409** si `code === 'dos'` (message explicite)
- Les layouts qui référencent le code ne sont pas modifiés

### Frontend `api.js`

- `createCardType` (existant) — body `{ label, code? }`
- `updateCardType(code, { label })` → `PATCH`
- `deleteCardType(code)` → `DELETE`

---

## 6. Implementation steps

- [ ] Helper `slugifyTypeCode(str)` + tests (accents, espaces, `_` multiples, vide)
- [ ] Backend `cardTypes.js` : GET + `usage_count` ; POST slug + 409 ; PATCH ; DELETE `dos` / 404
- [ ] `api.js` : `updateCardType`, `deleteCardType`
- [ ] `CardTypesPanel.vue` + onglet Types dans `ConfigView`
- [ ] `CardTypeSelect.vue` (select + inline create) branché sur `LayoutSettingsModal` et modale verso `LayoutsView`
- [ ] Badges : libellé via map `code → label`, fallback code
- [ ] Tests route : POST auto-slug, POST code fourni, 409, PATCH, DELETE `dos` refusé

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Label `"  "` | 400, pas d’insert |
| Label `"!!!"` (slug vide) | 400 |
| Label `"Faveur Royale"`, code vide | code `faveur_royale` |
| Code saisi `"Faveur Royale"` | normalisé en `faveur_royale` avant insert |
| Doublon de slug | 409 « Ce code existe déjà » |
| `DELETE dos` | 409 ; UI sans bouton |
| `DELETE` type utilisé | OK après confirm ; layouts inchangés ; badge = code |
| `PATCH` code inconnu | 404 |
| `dos` : renommer le libellé | autorisé |
| Réseau KO à la création inline | erreur sous les champs ; type select reste sur le dépliage |
| Seed `cestpasjuste` | inchangé ; nouveaux types peuvent avoir des `_` |

### `slugifyTypeCode`

1. `String(input)` ; NFD ; retirer les marques combinantes
2. minuscules
3. tout caractère hors `[a-z0-9]` → `_`
4. compresser les `_` ; trim `_` en tête/queue
5. résultat vide → invalide

Exemples : `Faveur Royale` → `faveur_royale` ; `Épopée` → `epopee`.

---

## 8. Acceptance criteria

- [ ] Config → Types : ajouter un type (label seul) le rend disponible dans la modale layout sans recharger l’app
- [ ] Code optionnel : vide → slug ; fourni → slug puis unicité
- [ ] Libellé éditable inline (PATCH) ; le code affiché ne change pas
- [ ] Suppression d’un type utilisé : confirm + layouts orphelins + badge = code
- [ ] `dos` non supprimable (API 409 + pas de bouton)
- [ ] Modale layout / verso : **+ Nouveau type…** crée, sélectionne, referme le dépliage
- [ ] Doublon → 409, message visible, pas de 201 silencieux
- [ ] Tests `slugifyTypeCode` + cas route listés en §6 verts

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | TSD-017 : UI Config Types jamais branchée (`createCardType` mort) | fixed in TSD-029 | 2026-08-21 |

---

## 10. Open questions

*(aucune — tranchées en brainstorming)*

---

## 11. Notes & références

- Complète TSD-017 : l’UI Config y était spécifiée mais absente ; le **renommage du label** y était hors scope — il est **in scope** ici.
- Type `dos` : lié au flag `is_back` (TSD-006). Ne pas supprimer.
- Atome `cardType` : hors de ce TSD (couleurs locales).
- Design companion : `docs/superpowers/specs/2026-08-21-layout-types-admin-design.md`
