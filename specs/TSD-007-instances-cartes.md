# TSD-007 — Instances de cartes & data binding (Import CSV / Google Sheets)

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Draft v2                     |
| Author      | @merlinperrot                |
| Created     | 2026-03-12                   |
| Last update | 2026-03-12                   |
| Depends on  | TSD-001, TSD-003, TSD-006    |

---

## 1. Purpose

Un layout définit la structure visuelle d'un type de carte. Une **instance de carte** est ce layout rempli avec des données concrètes. Ce TSD couvre :

- Le CRUD manuel des instances
- Un **pipeline d'import CSV / Google Sheets** robuste (mapping colonnes → atoms, multi-layout, sync)
- Un système de **traçabilité** (ImportJob) permettant des syncs répétables

---

## 2. Scope & boundaries

### In scope
- Modèle de données `card_instances` (layout_id + JSON de bindings)
- Vue liste des instances filtrée par layout ou type
- Formulaire d'édition manuelle d'une instance + aperçu live
- Création, duplication, suppression d'instances
- Pipeline d'import CSV : 10 étapes (URL → parsing → mapping → création → sync)
- **Sync Google Sheets** via published CSV URL (Option A, sans OAuth)
- ImportJob : traçabilité, protection contre l'écrasement, re-sync
- Import multi-layout (colonne discriminante) ou mono-layout

### Out of scope
- Validation des données contre les règles du jeu → TSD-010
- Export PDF → TSD-009
- Google Sheets API v4 / OAuth2 (feuilles privées) — hors périmètre
- Import JSON ou autre format

---

## 3. Concepts clés

### 3.1 Binding path

Un **binding path** est une chaîne pointillée qui identifie un paramètre d'un atom dans la hiérarchie d'un layout.

Format : `nameInLayout[.nestedNameInLayout]*.paramName`

```
Exemples :
  card_name.text                   ← atom direct dans le layout, paramètre "text"
  price.or                         ← atom "price" (nameInLayout), param "or"
  stats.attack.value               ← atom "attack" dans le composant "stats"
  header.icon.mediaId              ← atom "icon" dans le composant "header"
  body.effects.effect_a.text       ← imbrication profonde
```

Règle : chaque segment correspond au `nameInLayout` de l'élément à ce niveau.
Les atoms sans `nameInLayout` sont non-bindables (décoration fixe).

### 3.2 Format data d'une instance

JSON plat : les clés sont des binding paths, les valeurs sont les données.

```json
{
  "card_name.text":       "Épée de feu",
  "stats.attack.value":   "4",
  "stats.defense.value":  "2",
  "price.or":             "3",
  "illustration.mediaId": "uuid-de-l-image",
  "description.text":     "Inflige 3 dégâts."
}
```

### 3.3 ImportJob

Un ImportJob trace un import CSV : sa source, ses mappings, ses instances créées.
Il permet de re-synchroniser les instances depuis la source originale.

### 3.4 Mode mono vs multi-layout

- **Mono** : toutes les lignes CSV → un seul layout choisi par l'utilisateur
- **Multi** : une colonne du CSV contient le nom du layout ; chaque ligne peut produire une instance dans un layout différent

---

## 4. Data model

### Table `card_instances`
```sql
CREATE TABLE IF NOT EXISTS card_instances (
  id             TEXT PRIMARY KEY,
  layout_id      TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  data           JSON NOT NULL DEFAULT '{}',
  import_job_id  TEXT REFERENCES import_jobs(id) ON DELETE SET NULL,
  sort_order     INTEGER DEFAULT 0,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);
```

Migration : `ALTER TABLE card_instances ADD COLUMN import_job_id TEXT REFERENCES import_jobs(id) ON DELETE SET NULL`

---

### Table `import_jobs`
```sql
CREATE TABLE IF NOT EXISTS import_jobs (
  id              TEXT PRIMARY KEY,
  source_url      TEXT NOT NULL,           -- URL CSV ou chemin fichier local
  mode            TEXT NOT NULL DEFAULT 'single', -- 'single' | 'multi'
  layout_id       TEXT REFERENCES layouts(id) ON DELETE SET NULL, -- mode single seulement
  layout_column   TEXT,                    -- mode multi : nom de colonne contenant le layout
  id_column       TEXT NOT NULL,           -- colonne CSV servant d'identifiant stable (ex: "id", "name")
  mappings        JSON NOT NULL DEFAULT '{}', -- { layout_id: { csv_col: binding_path } }
  created_at      TEXT DEFAULT (datetime('now')),
  last_synced_at  TEXT,
  last_sync_stats JSON                     -- { created, updated, skipped, errors }
);
```

**Structure de `mappings` :**
```json
{
  "layout-uuid-1": {
    "name":          "card_name.text",
    "attack_value":  "stats.attack.value",
    "defense_value": "stats.defense.value",
    "cost_gold":     "price.or",
    "image_id":      "illustration.mediaId"
  },
  "layout-uuid-2": {
    "name":          "card_name.text",
    "power":         "effect.value"
  }
}
```

---

### Migration `layouts.sheets_url`
```sql
ALTER TABLE layouts ADD COLUMN sheets_url TEXT;
```
Stocke l'URL Google Sheets publiée liée au layout (optionnel, pour sync rapide depuis la vue layout).

---

## 5. Algorithmes

### 5.1 Extraction des binding paths d'un layout

```js
/**
 * Extrait tous les binding paths possibles d'un layout, y compris les atoms
 * imbriqués dans des composants.
 *
 * @param {object} layoutDefinition  - definition.layers[]
 * @param {object} componentRegistry - { componentId: componentDefinition }
 * @returns {BindingPath[]}
 */
function extractBindingPaths(layoutDefinition, componentRegistry) {
  const paths = []

  function walkItems(items, prefixParts = []) {
    for (const item of items) {
      // Groups (calques) → descendre dans les enfants
      if (item.kind === 'group') {
        walkItems(item.children || [], prefixParts)
        continue
      }

      const el = item
      if (!el.nameInLayout) continue  // non-bindable

      const currentParts = [...prefixParts, el.nameInLayout]

      if (el.type === 'atom' || !el.type) {
        // Atome direct : émettre un path par paramètre
        for (const paramKey of Object.keys(el.params || {})) {
          paths.push({
            path:         [...currentParts, paramKey].join('.'),
            nameInLayout: currentParts.join('.'),
            paramName:    paramKey,
            atomType:     el.atomType,
            elementId:    el.id,
          })
        }
      } else if (el.type === 'component') {
        // Composant : descendre dans sa définition avec le préfixe courant
        const comp = componentRegistry[el.componentId]
        if (comp?.definition?.elements) {
          walkItems(comp.definition.elements, currentParts)
        }
      }
    }
  }

  // Traverser tous les calques du layout
  for (const layer of layoutDefinition.layers || []) {
    walkItems(layer.children || layer.elements || [])
  }

  return paths
}
```

**Exemple de résultat :**
```json
[
  { "path": "card_name.text",        "atomType": "title",  "paramName": "text" },
  { "path": "card_name.fontSize",    "atomType": "title",  "paramName": "fontSize" },
  { "path": "stats.attack.value",    "atomType": "counter","paramName": "value" },
  { "path": "stats.defense.value",   "atomType": "counter","paramName": "value" },
  { "path": "price.or",              "atomType": "price",  "paramName": "or" },
  { "path": "illustration.mediaId",  "atomType": "image",  "paramName": "mediaId" }
]
```

---

### 5.2 Résolution des bindings au rendu

Extension de `resolveElementParams` dans `binding.js` pour gérer les préfixes imbriqués :

```js
function resolveElementParams(element, data, prefixOverride = null) {
  if (!data) return element.params || {}

  const prefix = prefixOverride ?? element.nameInLayout
  if (!prefix) return element.params || {}

  const resolved = {}
  for (const [key, value] of Object.entries(element.params || {})) {
    const bindPath = `${prefix}.${key}`
    if (bindPath in data) {
      resolved[key] = data[bindPath]
    } else if (typeof value === 'string' && value.includes('{{')) {
      resolved[key] = resolveBinding(value, data)
    } else {
      resolved[key] = value
    }
  }
  return resolved
}

// Pour un atom imbriqué dans un composant "stats" (nameInLayout="attack") :
// prefixOverride = "stats.attack"
// resolveElementParams(attackAtom, data, "stats.attack")
// → cherche "stats.attack.value" dans data ✓
```

---

### 5.3 Auto-déduction de mappings

Quand l'utilisateur configure un mapping pour un layout, les autres layouts peuvent hériter des suggestions pour les colonnes ayant le même nom :

```js
function autoDeduceMappings(allLayoutMappings, targetLayoutPaths) {
  // allLayoutMappings = { layoutId: { csvCol: bindingPath } } déjà configurés
  // targetLayoutPaths = paths disponibles dans le layout cible

  const suggestions = {}  // { csvCol: { path, confidence: 'auto' | 'manual' } }

  // Agréger tous les mappings existants
  const colToPath = {}
  for (const mapping of Object.values(allLayoutMappings)) {
    for (const [col, path] of Object.entries(mapping)) {
      colToPath[col] = path
    }
  }

  // Pour chaque colonne déjà connue, vérifier si le path existe dans ce layout
  for (const [col, path] of Object.entries(colToPath)) {
    const pathExists = targetLayoutPaths.some(p => p.path === path)
    if (pathExists) {
      suggestions[col] = { path, confidence: 'auto' }
    }
  }

  return suggestions
}
```

---

### 5.4 Pipeline d'import complet

```
INPUT : { sourceUrl, mode, layoutId?, layoutColumn?, idColumn, mappings }

1. FETCH
   ├── GET sourceUrl (HTTP)
   ├── Si erreur réseau → abort + erreur explicite
   └── Résultat : csvText (string)

2. PARSE
   ├── parseCsvToObjects(csvText) → rows[]
   ├── Vérifier qu'il y a au moins une ligne de données
   ├── Extraire headers = Object.keys(rows[0])
   └── Vérifier que idColumn ∈ headers → sinon erreur

3. RÉSOLUTION DES LAYOUTS PAR LIGNE
   Pour chaque row :
   ├── mode 'single' → layoutId fixe
   ├── mode 'multi'  → row[layoutColumn] = layoutName
   │     → chercher layout par name (LIKE insensible à la casse)
   │     → si non trouvé → row.error = "Layout introuvable : X"
   └── Résultat : row._resolvedLayoutId

4. APPLICATION DES MAPPINGS
   Pour chaque row (sans erreur) :
   ├── mappings[row._resolvedLayoutId] = { csvCol: bindingPath }
   ├── Pour chaque csvCol → bindingPath dans le mapping :
   │     data[bindingPath] = row[csvCol]
   ├── Ignorer les colonnes sans mapping
   └── Résultat : row._data = { bindingPath: value }

5. UPSERT DES INSTANCES
   Pour chaque row (sans erreur) :
   ├── idValue = row[idColumn]
   ├── Chercher instance existante WHERE layout_id = X AND import_job_id = Y
   │     AND JSON_EXTRACT(data, '$.'+idColumn) = idValue
   │                OU name = idValue  (si idColumn = colonne de nom)
   ├── Si trouvée → UPDATE data, updated_at
   ├── Si non trouvée → INSERT (id=uuid, layout_id, name=idValue, data, import_job_id)
   └── Compter created / updated

6. MISE À JOUR DE L'ImportJob
   ├── last_synced_at = now()
   └── last_sync_stats = { created, updated, skipped, errors[] }

OUTPUT : { jobId, created, updated, skipped, errors[] }
```

---

## 6. Structures de mapping

### 6.1 ColumnMapping (par layout, stocké dans ImportJob.mappings)

```ts
type ColumnMapping = {
  [csvColumnName: string]: string  // binding path
}

// Exemple :
{
  "name":           "card_name.text",
  "attack":         "stats.attack.value",
  "defense":        "stats.defense.value",
  "gold_cost":      "price.or",
  "illustration":   "illustration.mediaId",
  "description":    "description.text",
}
```

### 6.2 MappingEntry (UI)

```ts
type MappingEntry = {
  csvColumn:  string           // header CSV
  bindingPath: string | null   // path atom sélectionné
  confidence: 'manual' | 'auto' | 'none'
  // manual = défini par l'utilisateur (bleu)
  // auto   = déduit d'un autre layout (gris)
  // none   = non mappé (ignoré à l'import)
}
```

---

## 7. UX & interaction design

### 7.1 Étapes du wizard d'import

```
┌─────────────────────────────────────────────────────────────────┐
│  IMPORT CSV / GOOGLE SHEETS            [×]                      │
│                                                                 │
│  ① Source                                                       │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ https://docs.google.com/spreadsheets/d/.../pub?...   │ [→]  │
│  └───────────────────────────────────────────────────────┘      │
│     ○ URL Google Sheets  ○ Fichier CSV local                    │
│                                                                 │
│  ② Mode                                                         │
│     ● Un seul layout   ○ Plusieurs layouts (colonne)            │
│     Layout : [Équipement ▾]                                     │
│                                                                 │
│  ③ Colonne identifiant stable                                   │
│     [ name ▾ ]  (utilisé pour retrouver les cartes lors sync)  │
│                                                                 │
│  ─────────────────────────── Aperçu CSV (3 premières lignes) ──│
│  name       │ attack │ defense │ gold_cost │ description        │
│  Épée feu   │ 4      │ 1       │ 3         │ Inflige 3...       │
│  Bouclier   │ 0      │ 5       │ 2         │ Bloque...          │
│                                                                 │
│  ④ Mapping colonnes → atoms                                     │
│                                                                 │
│  COLONNE CSV      →   CHEMIN ATOM                [auto-fill]   │
│  ──────────────────────────────────────────────                │
│  name         →   card_name.text             [manuel ●]        │
│  attack       →   stats.attack.value         [manuel ●]        │
│  defense      →   stats.defense.value        [auto   ○]        │
│  gold_cost    →   price.or                   [manuel ●]        │
│  description  →   description.text           [auto   ○]        │
│  image_url    →   ─ non mappé ─                                │
│                                                                 │
│  ⑤ Options                                                      │
│     ☑ Mettre à jour les cartes existantes (match sur identifiant)│
│     ☐ Supprimer les cartes absentes du CSV                      │
│                                                                 │
│  [Annuler]                           [Prévisualiser → Importer]│
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Rapport d'import

```
✅ Import terminé

  Créées   :  47
  Mises à jour :  12
  Ignorées :   3
  Erreurs  :   2

  Erreurs :
  ⚠ Ligne 14 : Layout "Quête spéciale" introuvable
  ⚠ Ligne 31 : Colonne "attack" absente

  [Voir les cartes importées]  [Fermer]
```

### 7.3 Badge d'avertissement sur carte importée

```
┌─────────────────────────────────────┐
│  Épée de feu                        │
│  equipement   63×88 mm              │
│                                     │
│  ⚠ Import CSV · Modifié manuellement│
│  Source: Google Sheet "Cartes v3"   │
│  [Ouvrir la source]                 │
└─────────────────────────────────────┘
```

### 7.4 Bouton Sync (vue liste des instances)

```
[ ↺ Sync import ]  →  recharge le CSV, upsert les instances liées au job
```

---

## 8. API

### CRUD instances

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/cards?layout_id=X` | Liste filtrée |
| GET  | `/cards/:id` | Instance complète |
| POST | `/cards` | Création manuelle |
| PUT  | `/cards/:id` | Mise à jour |
| DELETE | `/cards/:id` | Suppression |

### Import / Export

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/cards/export?layout_id=X` | CSV export |
| POST | `/cards/import` | Import fichier CSV (multipart) |
| POST | `/cards/import-url` | Import depuis URL (body `{ url, mode, layoutId?, layoutColumn?, idColumn, mappings }`) |

### ImportJobs

| Method | Route | Description |
|--------|-------|-------------|
| GET  | `/import-jobs` | Liste |
| GET  | `/import-jobs/:id` | Détail + stats |
| POST | `/import-jobs/:id/sync` | Re-fetch + upsert |
| DELETE | `/import-jobs/:id` | Supprime le job (pas les cartes) |

---

## 9. Implementation steps

### Backend
- [ ] Migration : `ALTER TABLE card_instances ADD COLUMN import_job_id TEXT`
- [ ] Migration : `CREATE TABLE import_jobs (...)`
- [ ] Migration : `ALTER TABLE layouts ADD COLUMN sheets_url TEXT`
- [ ] Route CRUD `/cards` (si pas déjà fait)
- [ ] Route `POST /cards/import-url` : fetch URL → parseCsv → pipeline upsert
- [ ] Route `POST /import-jobs/:id/sync` : re-fetch + upsert
- [ ] Routes CRUD `/import-jobs`

### Frontend — binding.js
- [ ] Étendre `extractBindingPaths()` pour traverser les composants imbriqués (récursif)
- [ ] Étendre `resolveElementParams()` pour accepter `prefixOverride` (atoms imbriqués)
- [ ] Robustifier `parseCsvToObjects()` : guillemets imbriqués, CRLF, virgules dans les valeurs

### Frontend — composants
- [ ] `ImportWizard.vue` : wizard 5 étapes (source → mode → idColumn → mapping → options)
- [ ] `MappingRow.vue` : ligne de mapping (autocomplete colonne + autocomplete path + badge auto/manuel)
- [ ] `ImportJobBadge.vue` : badge affiché sur les tiles des cartes importées
- [ ] `CardInstancesView.vue` : liste filtrée, bouton "Sync import", bouton "Import CSV"
- [ ] `CardInstanceEditor.vue` : formulaire + aperçu live
- [ ] `PreviewCanvas.vue` : canvas lecture seule (sans drag ni sélection)

### Frontend — store
- [ ] `cardInstances.js` : liste, CRUD, `importFromUrl()`, `syncJob()`

---

## 10. Edge cases

| Scenario | Comportement attendu |
|----------|----------------------|
| Layout modifié après import | Paths orphelins dans data conservés, ignorés au rendu |
| Binding manquant dans data | Atom affiche `defaultParams` |
| CSV avec guillemets, virgules dans les valeurs | `parseCsvToObjects` doit gérer RFC 4180 |
| Colonne idColumn absente du CSV | Erreur bloquante avant import |
| Ligne CSV sans valeur pour idColumn | Ligne skippée avec avertissement |
| Layout introuvable (mode multi) | Ligne skippée avec erreur |
| Import de 1000+ lignes | Upsert en batch (transaction SQLite) |
| Sync après suppression manuelle d'une carte | Re-créée si la ligne CSV existe toujours |
| Deux imports différents sur le même layout | Import jobs indépendants, instances taguées séparément |
| URL Google Sheets expirant | Erreur HTTP → message explicite + lien vers la source |
| Carte modifiée manuellement + sync | Avertissement dans le rapport (champs modifiés = **écrasés** par le CSV) |

---

## 11. Points d'attention techniques

### 11.1 Parsing CSV robuste (RFC 4180)
La lib `papaparse` est déjà dans les dépendances frontend. L'utiliser côté client pour le wizard. Côté backend (Node), utiliser `csv-parse` ou réimplémenter RFC 4180 minimal.

### 11.2 Identification stable des lignes
La colonne `idColumn` est le seul moyen de faire des mises à jour idempotentes lors d'une sync. Sans ID stable, chaque sync crée des doublons. L'utilisateur doit explicitement choisir cette colonne dans l'étape ①.

### 11.3 Upsert en transaction
Pour 1000+ lignes, wrapper tous les INSERT/UPDATE dans une seule transaction SQLite :
```js
const upsert = db.transaction((rows) => {
  for (const row of rows) { /* insert or update */ }
})
upsert(allRows)
```
Performance : ~10 000 upserts/s avec SQLite WAL mode.

### 11.4 Composants imbriqués : cohérence des préfixes
Lors du rendu d'un atom imbriqué dans un composant, le composant renderer doit passer le `prefixOverride` correct :
```
Layout "stats" (nameInLayout) contient un component
  → Component contient atom "attack" (nameInLayout)
  → prefixOverride = "stats.attack"
  → cherche "stats.attack.value" dans data
```
Sans ce préfixe, les bindings imbriqués ne se résolvent pas.

### 11.5 Auto-déduction vs mapping manuel
Les suggestions auto-déduites (gris) doivent être clairement distinguées visuellement et ne jamais écraser un mapping manuel (bleu) lors d'une navigation entre layouts.

### 11.6 URL Google Sheets — format attendu
L'URL publiée doit être `?output=csv` ou `?format=csv`. Si l'utilisateur colle une URL normale (`/edit`), le système doit détecter et transformer automatiquement :
```js
function normalizeGoogleSheetsUrl(url) {
  if (url.includes('docs.google.com/spreadsheets')) {
    // /edit → /pub?output=csv
    return url.replace(/\/edit.*$/, '/pub?output=csv')
              .replace(/\/pub.*$/, '/pub?output=csv')
  }
  return url
}
```

---

## 12. Acceptance criteria

- [ ] Import d'un CSV local de 50 lignes → instances créées correctement
- [ ] Sync Google Sheets → cartes mises à jour
- [ ] Mode multi-layout : lignes routées vers les bons layouts
- [ ] Mapping auto-déduit : colonnes partagées entre layouts pré-remplies
- [ ] Atoms imbriqués dans composants : bindings résolus correctement au rendu
- [ ] Sync idempotente : re-sync sans données modifiées → 0 créations, N mises à jour identiques
- [ ] Erreurs de ligne explicites dans le rapport
- [ ] Badge d'avertissement sur les cartes importées

---

## 13. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | `parseCsvToObjects` (binding.js) ne gère pas les guillemets RFC 4180 | Open | 2026-03-12 |

---

## 14. Open questions

- [ ] Faut-il un mapping configurable si les noms de colonnes du sheet diffèrent des binding paths ? → Oui, c'est l'interface de mapping de l'étape ④
- [ ] Les bindings de type "image" (mediaId) : accepter une URL externe dans le CSV et auto-uploader dans la médiathèque ? Ou seulement les IDs existants ?
- [ ] Option "supprimer les cartes absentes du CSV" : activer par défaut ? (risqué → off par défaut)
- [ ] Faut-il persister les mappings par layout indépendamment des ImportJobs (réutilisation) ?
