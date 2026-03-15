# TSD-017 — Gestion des types de cartes (card_types)

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Done                         |
| Author      | @merlinperrot                |
| Created     | 2026-03-13                   |
| Last update | 2026-03-13                   |
| Depends on  | TSD-001 (canvas éditeur)     |

---

## 1. Purpose

Les layouts et les instances de cartes sont associés à un `card_type` (ex : `equipement`, `quete`, `classe`…). Ces types doivent être administrables sans toucher au code. Ce TSD couvre le CRUD des types de cartes et leur utilisation dans les sélecteurs de l'éditeur.

---

## 2. Scope & boundaries

### In scope
- Table `card_types` (code + label)
- API CRUD : GET, POST, DELETE
- Types pré-remplis en DB depuis `schema.sql` (seed)
- Utilisation dans la modale de création de layout, dans CardsView (filtre), dans l'atome `cardType`

### Out of scope
- Renommage du `code` d'un type existant (trop destructif — les layouts référencent le code)
- Modification du label après création (le code est la clé, le label est cosmétique)
- Icône ou couleur associée à chaque type

---

## 3. UX & interaction design

### Primary flow
1. L'utilisateur ouvre **ConfigView → onglet Tokens** ou un onglet dédié (selon implémentation).
2. Il voit la liste des types existants avec leur code et leur label.
3. Il saisit un nouveau `code` et `label` et clique « Ajouter ».
4. Le nouveau type est disponible dans les sélecteurs de l'éditeur.
5. Pour supprimer : bouton ✕ (sans confirmation — les layouts qui référencent ce type garderont le code en string).

### Types pré-remplis (seed)
| code | label |
|------|-------|
| equipement | Équipement |
| classe | Classe |
| quete | Quête |
| bricabrac | Bric-à-brac |
| cestpasjuste | C'est pas juste ! |
| buff | Buff |
| faveur | Faveur |
| epopee | Épopée |
| enchantement | Enchantement |
| rune | Rune |
| dos | Dos |

---

## 4. Data model

```sql
CREATE TABLE IF NOT EXISTS card_types (
  code   TEXT PRIMARY KEY,
  label  TEXT NOT NULL
);
```

---

## 5. API changes

### `GET /api/card-types`
- **Response :** `[{ code, label }]` triés par label

### `POST /api/card-types`
- **Request body :** `{ "code": "monstres", "label": "Monstres" }`
- **Response :** `{ code, label }`
- **Error cases :** 400 si `code` ou `label` absent; INSERT OR IGNORE (pas de 409 explicite)

### `DELETE /api/card-types/:code`
- **Response :** `{ ok: true }`

---

## 6. Implementation steps

- [x] Table `card_types` dans `schema.sql` avec INSERT OR IGNORE des types pré-remplis
- [x] `routes/cardTypes.js` : GET, POST, DELETE
- [x] Sélecteur `card_type` dans `LayoutsView` modale (fetch de `/api/card-types`)
- [x] Sélecteur utilisé dans `CardsView` (filtre par type)

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Suppression d'un type utilisé par des layouts | Autorisée — les layouts gardent le code en string orphelin |
| Code avec espaces ou caractères spéciaux | Autorisé techniquement — à éviter par convention (snake_case) |
| INSERT OR IGNORE sur code existant | Aucune erreur, la ligne existante est conservée |

---

## 8. Acceptance criteria

- [x] Les 11 types pré-remplis sont présents après init DB
- [x] Un nouveau type est visible dans le sélecteur de création de layout immédiatement
- [x] La suppression retire le type de la liste

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

*(aucune)*

---

## 11. Notes & références

- Le type `dos` est spécial : il est associé au flag `is_back = 1` sur les layouts. Ne pas supprimer.
- L'atome `cardType` utilise le `card_type` du layout pour afficher un badge coloré selon une palette codée en dur dans `atoms/index.js`.
