# TSD-014 — Snapshots & Restauration de la base de données

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Done                         |
| Author      | @merlinperrot                |
| Created     | 2026-03-13                   |
| Last update | 2026-03-13                   |
| Depends on  | none                         |

---

## 1. Purpose

Lors de l'exploration créative (essayer une réorganisation de layouts, modifier massivement des instances, tester une nouvelle structure de données), l'utilisateur risque de perdre un état satisfaisant. Ce TSD couvre le système de points de sauvegarde nommés : l'utilisateur peut créer un snapshot de la DB entière, puis restaurer cet état à tout moment.

---

## 2. Scope & boundaries

### In scope
- Création d'un snapshot nommé de toutes les tables métier (layouts, components, media, card_instances, import_jobs…)
- Stockage dans la table `snapshots` (JSON dump complet)
- Restauration complète depuis un snapshot
- Suppression d'un snapshot
- Interface UI dans `SnapshotsView.vue`

### Out of scope
- Snapshots automatiques (aucun déclencheur automatique)
- Diff entre snapshots
- Snapshot partiel (d'un seul layout, d'un seul dossier médias)
- Snapshot des fichiers physiques (uploads/)

---

## 3. UX & interaction design

### Primary flow — création
1. L'utilisateur ouvre la vue **Snapshots** (accessible depuis la navigation).
2. Il entre un nom optionnel et clique « Créer un snapshot ».
3. L'API enregistre la DB et retourne le snapshot créé — il apparaît en tête de liste.

### Primary flow — restauration
4. Il clique « Restaurer » sur un snapshot listé.
5. Une confirmation modale s'affiche (« Toutes les données actuelles seront remplacées. »).
6. Après confirmation, l'état complet est restauré — l'application recharge la page automatiquement.

### Visual states
- **Liste vide** : message « Aucun snapshot. »
- **Snapshot en cours de création** : bouton désactivé, spinner
- **Restauration en cours** : overlay plein écran « Restauration… »

---

## 4. Data model

```sql
CREATE TABLE IF NOT EXISTS snapshots (
  id           TEXT PRIMARY KEY,
  label        TEXT,
  code_version TEXT,
  dump         TEXT NOT NULL,  -- JSON complet de toutes les tables
  created_at   TEXT DEFAULT (datetime('now'))
);
```

Tables incluses dans le dump :
`card_types`, `media_folders`, `media`, `molecules`, `components`, `layouts`, `import_jobs`, `card_instances`, `import_mappings`

---

## 5. API changes

### `GET /api/snapshots`
- **Response :** `[{ id, label, code_version, created_at }]` — sans le dump (trop lourd)

### `POST /api/snapshots`
- **Request body :** `{ "label": "Avant refonte layouts" }` (optionnel)
- **Response :** `{ id, label, code_version, created_at }`

### `POST /api/snapshots/:id/restore`
- **Response :** `{ restored: id, code_version }`
- **Error cases :** 404 si snapshot inexistant

### `DELETE /api/snapshots/:id`
- **Response :** `{ ok: true }`

---

## 6. Implementation steps

- [x] Table `snapshots` dans `schema.sql`
- [x] `createSnapshot(label, codeVersion)` dans `database.js`
- [x] `restoreSnapshot(snapshotId)` dans `database.js` (transaction atomique)
- [x] `routes/snapshots.js` : GET, POST, POST/:id/restore, DELETE
- [x] `SnapshotsView.vue` : liste, création, restauration avec confirmation

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Snapshot de DB très large (100+ layouts) | Toléré — dump JSON en mémoire SQLite |
| Restauration sur un code_version différent | Autorisée avec warning dans l'UI ("schéma potentiellement incompatible") |
| Snapshot supprimé pendant liste affichée | 404 au DELETE → retirer de la liste |

---

## 8. Acceptance criteria

- [x] Snapshot créé retourne `id`, `label`, `created_at`
- [x] Restauration recharge l'état complet de toutes les tables
- [x] Restauration est atomique (transaction SQLite)
- [x] Suppression retire le snapshot de la liste

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

- La restauration utilise une transaction SQLite : DELETE toutes les tables dans l'ordre des dépendances FK, puis INSERT depuis le dump.
- `code_version` est lu depuis `backend/package.json` au moment de la création.
- Le dump n'inclut pas les fichiers physiques dans `uploads/` — si des médias ont été supprimés du disque depuis le snapshot, les références resteront en DB mais les fichiers seront manquants.
