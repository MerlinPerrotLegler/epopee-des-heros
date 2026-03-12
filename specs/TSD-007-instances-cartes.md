# TSD-007 — Instances de cartes & data binding

| Field       | Value                  |
|-------------|------------------------|
| Status      | Draft                  |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | TSD-001, TSD-003, TSD-006 |

---

## 1. Purpose

Un layout définit la structure visuelle d'un type de carte. Une instance de carte est ce layout rempli avec des données concrètes : le nom d'une carte spécifique, son coût, sa description, etc. L'éditeur d'instances est l'interface principale pour saisir le contenu du jeu.

---

## 2. Scope & boundaries

### In scope
- Modèle de données `card_instances` (layout_id + JSON de bindings)
- Vue liste des instances (`CardInstancesView`) filtrée par layout ou type
- Formulaire d'édition d'une instance : champs générés dynamiquement depuis les placeholders du layout
- Aperçu live de la carte rendue (canvas lecture seule)
- Création, duplication, suppression d'instances
- Import/export CSV d'un ensemble d'instances
- Nom de l'instance (identifiant humain, ex : "Épée de feu")

### Out of scope
- Validation des données contre les règles du jeu → TSD-010
- Export PDF → TSD-009
- Historique des modifications par instance

---

## 3. UX & interaction design

### Vue liste des instances
```
[ Layout : [select] ▾ ]   [ + Nouvelle carte ]   [ Import CSV ]   [ Export CSV ]

┌──────────────────────────────────┐
│ Épée de feu      equipement  ✎ ⧉ ✕ │
│ Armure forgée    equipement  ✎ ⧉ ✕ │
│ Potion de soin   bricabrac   ✎ ⧉ ✕ │
└──────────────────────────────────┘
```

### Formulaire d'édition d'une instance
```
┌─────────────────────────┬──────────────────┐
│                         │                  │
│  Nom : [Épée de feu__]  │   [Aperçu live]  │
│                         │                  │
│  — card_name ——————     │   [Canvas rendu  │
│  Texte : [Épée de feu]  │    en lecture    │
│                         │    seule]        │
│  — price ———————————    │                  │
│  Or : [ 2 ]             │                  │
│  Essence : [ 0 ]        │                  │
│                         │                  │
│  — description ————     │                  │
│  Texte : [textarea]     │                  │
│                         │                  │
└─────────────────────────┴──────────────────┘
             [ Annuler ]  [ Sauvegarder ]
```

### Data binding
Format : `{nameInLayout}.{paramName}`
Exemples : `card_name.text`, `price.resources`, `description.text`

Les champs du formulaire sont générés depuis les atomes qui ont un `nameInLayout` défini dans le layout. Les atomes sans `nameInLayout` ne sont pas bindés (décoration fixe).

### Aperçu live
- Le canvas rendu utilise les mêmes composants d'atomes que l'éditeur
- Les bindings sont substitués avant le rendu
- Pas d'interaction (lecture seule)
- Mise à jour en temps réel à chaque frappe

---

## 4. Data model

### Table `card_instances`
```sql
CREATE TABLE card_instances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id   INTEGER NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,          -- nom humain de la carte
  data        TEXT    NOT NULL DEFAULT '{}',  -- JSON plat des bindings
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_card_instances_layout ON card_instances(layout_id);
```

### Format `data` (JSON plat)
```json
{
  "card_name.text"     : "Épée de feu",
  "price.resources"    : [{ "type": "or", "qty": 2 }],
  "description.text"   : "Inflige 3 dégâts au joueur cible.",
  "card_type.type"     : "equipement",
  "illustration.media_id" : 42
}
```

### Résolution des bindings au rendu
```js
// Pour chaque atome avec nameInLayout :
function resolveParams(atom, data) {
  const resolved = { ...atom.params }
  for (const [key, val] of Object.entries(data)) {
    const [name, param] = key.split('.')
    if (name === atom.nameInLayout) resolved[param] = val
  }
  return resolved
}
```

---

## 5. API changes

### `GET /card-instances?layout_id=X`
- **Response:** `[{ id, layout_id, name, data, created_at, updated_at }]`

### `POST /card-instances`
- **Request:** `{ layout_id, name, data? }`
- **Response:** instance créée `{ id, layout_id, name, data }`

### `GET /card-instances/:id`
- **Response:** instance complète

### `PUT /card-instances/:id`
- **Request:** `{ name?, data? }`
- **Response:** instance mise à jour

### `DELETE /card-instances/:id`
- **Response:** `204 No Content`

### `GET /card-instances/export?layout_id=X` *(CSV)*
- **Response:** fichier CSV avec headers = toutes les clés de binding

### `POST /card-instances/import?layout_id=X` *(CSV)*
- **Request:** `multipart/form-data` avec `file` CSV
- **Response:** `{ created: N, updated: M, errors: [] }`

---

## 6. Implementation steps

- [ ] Table `card_instances` dans le schéma SQLite
- [ ] Routes backend CRUD `/card-instances`
- [ ] Route export CSV + import CSV
- [ ] `api.js` : fonctions client pour toutes les routes
- [ ] Store `cardInstances.js` : liste, instance courante, CRUD actions
- [ ] `CardInstancesView.vue` : liste filtrée par layout, actions CRUD
- [ ] `CardInstanceEditor.vue` : formulaire généré depuis les placeholders + aperçu
- [ ] Fonction `resolveParams` dans `utils/binding.js`
- [ ] Canvas lecture-seule : composant `PreviewCanvas.vue` (sans drag, sans sélection)
- [ ] Import/Export CSV : UI + boutons
- [ ] Tester les cas de binding complexes (price.resources = array)

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Layout modifié après création d'instances | Le formulaire se régénère depuis le nouveau layout, les clés orphelines dans `data` sont conservées mais ignorées |
| Binding manquant dans `data` | L'atome affiche sa valeur par défaut (`defaultParams`) |
| Valeur `null` dans `data` | Traité comme binding manquant → valeur par défaut |
| Import CSV avec colonnes inconnues | Colonnes ignorées, avertissement dans le rapport |
| Import CSV avec colonnes manquantes | Champs absents → valeurs par défaut des atomes |
| Duplication d'une instance | Copie avec "(copie)" dans le nom, même `data` |
| Suppression du layout parent | Instances supprimées en cascade (`ON DELETE CASCADE`) |

---

## 8. Acceptance criteria

- [ ] Création d'une instance depuis un layout existant
- [ ] Formulaire généré automatiquement depuis les placeholders du layout
- [ ] Aperçu live synchronisé avec les saisies
- [ ] Duplication et suppression d'instances
- [ ] Export CSV fonctionnel
- [ ] Import CSV : création/mise à jour en masse

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [ ] Un atome sans `nameInLayout` est-il éditable dans une instance ? (ex : texte fixe)
- [ ] Les bindings de type "image" (media_id) doivent-ils afficher un picker de médias dans le formulaire ?
- [ ] Faut-il un système de "valeur par défaut d'instance" différent du `defaultParams` de l'atome ?
- [ ] CSV ou JSON pour l'import/export ? (CSV plus accessible pour le designer)

---

## 11. Notes

- Le data binding est volontairement un JSON plat (pas d'imbrication) pour simplifier l'import/export CSV
- `utils/binding.js` existe déjà dans le scaffold, à compléter
- L'aperçu live doit être performant : éviter de re-render tout le canvas à chaque frappe (debounce 150ms)
