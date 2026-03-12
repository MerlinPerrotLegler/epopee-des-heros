# TSD-008 — Molécules (groupes d'atomes réutilisables)

| Field       | Value                  |
|-------------|------------------------|
| Status      | Draft                  |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | TSD-001, TSD-002, TSD-003 |

---

## 1. Purpose

Une molécule est un assemblage nommé et réutilisable d'atomes avec une structure fixe. Exemple : "Bloc compétence" = un titre + une description + une pastille de coût. Placer une molécule dans un layout pose tous ses atomes en une fois, avec des positions relatives entre eux. Modifier la molécule en met à jour toutes les occurrences dans tous les layouts.

---

## 2. Scope & boundaries

### In scope
- Définition d'une molécule (liste d'atomes avec positions relatives en mm)
- Bibliothèque de molécules (vue dédiée ou panneau)
- Placement d'une molécule dans un layout (expand → atomes indépendants) **ou** lien live
- Édition d'une molécule (modifie toutes ses occurrences liées)
- Duplication, renommage, suppression d'une molécule

### Out of scope
- Molécules imbriquées (molécule dans molécule) — non prévu dans la v1
- Override de paramètres par occurrence (chaque occurrence est identique) — possible en v2
- Partage de molécules entre projets

---

## 3. UX & interaction design

### Deux modes de placement

**Mode "expand"** (décomposer)
- La molécule est placée puis décomposée en atomes indépendants
- Plus de lien avec la molécule source
- Modifications futures de la molécule = sans effet sur ce layout
- Comportement par défaut (plus simple)

**Mode "lié"** (live)
- L'occurrence reste liée à la molécule
- Apparaît comme un bloc unique dans le panneau calques
- Modifier la molécule met à jour toutes les occurrences
- Utile pour des éléments répétés (en-tête, bas de carte)

### Primary flow — placer une molécule
1. Dans le panneau gauche, onglet "Molécules"
2. L'utilisateur clique sur une molécule de la bibliothèque
3. Un modal propose : "Décomposer en atomes" ou "Lien live"
4. Placée au centre du canvas (position relative au centre de la molécule)
5. Sélection du premier atome (mode expand) ou du bloc entier (mode lié)

### Primary flow — créer une molécule
1. Sélectionner plusieurs atomes sur le canvas (Shift+clic ou rectangle de sélection)
2. Clic droit → "Créer une molécule"
3. Nom de la molécule → valider
4. La molécule est créée et apparaît dans la bibliothèque
5. Les atomes sélectionnés restent en place (non liés automatiquement)

### Édition d'une molécule
1. Dans la bibliothèque, clic "✎" → ouvre la molécule dans un canvas d'édition dédié
2. Modifications sauvegardées → propagées à toutes les occurrences liées

---

## 4. Data model

### Table `molecules`
```sql
CREATE TABLE molecules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  definition TEXT    NOT NULL DEFAULT '{}',  -- JSON : { atoms: [...] }
  thumbnail  TEXT,                           -- base64 JPEG
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Structure `definition`
```json
{
  "width_mm"  : 50,
  "height_mm" : 20,
  "atoms" : [
    {
      "id"       : "local-uuid",
      "atomType" : "title",
      "x"        : 0,      "y"      : 0,
      "width"    : 50,     "height" : 6,
      "params"   : { "text": "Titre", "fontSize": 4 }
    },
    {
      "id"       : "local-uuid-2",
      "atomType" : "text",
      "x"        : 0,      "y"      : 7,
      "width"    : 50,     "height" : 12,
      "params"   : { "text": "Description…", "fontSize": 2.5 }
    }
  ]
}
```

### Référence dans un layout (mode lié)
```json
{
  "id"         : "uuid",
  "kind"       : "element",
  "type"       : "molecule",
  "moleculeId" : 3,
  "x"          : 10, "y": 15,
  "locked"     : false, "visible": true, "opacity": 1.0
}
```

---

## 5. API changes

### `GET /molecules`
- **Response:** `[{ id, name, thumbnail, created_at, updated_at }]`

### `POST /molecules`
- **Request:** `{ name, definition }`
- **Response:** molécule créée

### `GET /molecules/:id`
- **Response:** molécule complète avec `definition`

### `PUT /molecules/:id`
- **Request:** `{ name?, definition?, thumbnail? }`
- **Response:** molécule mise à jour

### `DELETE /molecules/:id`
- **Response:** `204 No Content`
- **Note:** les occurrences liées dans les layouts doivent être converties en atomes standalone ou supprimées

---

## 6. Implementation steps

- [ ] Table `molecules` dans le schéma SQLite
- [ ] Routes CRUD `/molecules`
- [ ] `api.js` : fonctions client
- [ ] `MoleculesView.vue` : bibliothèque avec miniatures
- [ ] Placement depuis le panneau : modal expand / lié
- [ ] Mode expand : `expandMolecule(mol, x, y)` → pousse N atomes dans layers
- [ ] Mode lié : élément `type: 'molecule'` dans layers, rendu via `AtomMolecule.vue`
- [ ] `AtomMolecule.vue` : charge la définition de la molécule et rend ses atomes
- [ ] Sélection multi-atomes sur le canvas
- [ ] "Créer une molécule" depuis la sélection (clic droit)
- [ ] Canvas d'édition de molécule (réutiliser `EditorCanvas` avec dimensions de la molécule)
- [ ] Propagation des modifications sur les occurrences liées

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Molécule supprimée avec occurrences liées | Les occurrences liées affichent un placeholder "Molécule introuvable" |
| Modification d'une molécule utilisée dans 20 layouts | Propagation asynchrone (lazy : au prochain chargement du layout) |
| Molécule avec atomes en dehors de ses dimensions | Atomes clippés à l'affichage (ou débordement visible, à décider) |
| Position relative négative dans la molécule | Autorisé (les atomes peuvent déborder du bounding box de la molécule) |

---

## 8. Acceptance criteria

- [ ] Création d'une molécule depuis la sélection d'atomes
- [ ] Placement en mode "expand" (décomposition)
- [ ] Placement en mode "lié"
- [ ] Édition d'une molécule dans un canvas dédié
- [ ] Mise à jour des occurrences liées après édition
- [ ] Bibliothèque avec miniatures

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [ ] Le mode "lié" est-il nécessaire en v1 ou peut-on commencer par "expand" uniquement ?
- [ ] Comment gérer le resize d'une occurrence liée (redimensionner la molécule ou bloquer) ?
- [ ] Peut-on créer une molécule à partir d'un composant existant ?

---

## 11. Notes

- Les molécules sont proches des composants mais en plus léger : pas de placeholders distincts, pas de données bindées par occurrence
- La distinction molécule / composant : molécule = structure fixe, composant = structure avec zones de binding
