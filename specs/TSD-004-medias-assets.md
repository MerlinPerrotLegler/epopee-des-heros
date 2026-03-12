# TSD-004 — Médias & assets (images, fonts)

| Field       | Value                  |
|-------------|------------------------|
| Status      | Review (partiel)       |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | none                   |

---

## 1. Purpose

Le designer a besoin d'importer des images (illustrations de cartes, icônes) et des polices personnalisées pour les utiliser dans les layouts. La vue Médias centralise tous ces assets, permet de les nommer, prévisualiser et supprimer.

---

## 2. Scope & boundaries

### In scope
- Upload d'images (PNG, JPG, SVG, WebP)
- Upload de polices (TTF, OTF, WOFF, WOFF2)
- Liste des médias avec vignette / aperçu
- Renommage inline (double-clic sur le nom)
- Suppression avec confirmation
- Prévisualisation d'une font avant utilisation
- Détection des doublons (même contenu)

### Out of scope
- Édition d'image (recadrage, retouche) — dans `AtomImage` (TSD-003)
- Hébergement externe / CDN — tout est stocké localement dans SQLite (BLOB) ou sur le disque
- Versioning des médias

---

## 3. UX & interaction design

### Vue liste
```
[ Upload image ]  [ Upload font ]

┌──────────┐  ┌──────────┐  ┌──────────┐
│  [img]   │  │  [img]   │  │  Aa      │
│          │  │          │  │ (font)   │
│ nom.png  │  │ carte.svg│  │ custom.ttf│
└──────────┘  └──────────┘  └──────────┘
```

### Renommage inline
1. Double-clic sur le nom → input en remplacement du span
2. Enter ou blur → commit via `PATCH /api/media/:id { original_name }`
3. Escape → annulation, nom original restauré

### Suppression
1. Clic sur `✕` sur la vignette → modale de confirmation "Supprimer ce média ? Il sera retiré de tous les layouts l'utilisant."
2. Confirmer → `DELETE /api/media/:id`
3. Les layouts qui référencent ce média affichent un placeholder cassé (comportement toléré)

### Prévisualisation font
- Un panneau latéral affiche "AaBbCc 123" rendu avec la police sélectionnée
- Champ de test éditable

---

## 4. Data model

```sql
CREATE TABLE media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT    NOT NULL,
  mime_type     TEXT    NOT NULL,
  data          BLOB    NOT NULL,   -- contenu binaire du fichier
  size_bytes    INTEGER NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. API changes

### `POST /api/media` (upload)
- **Auth:** required
- **Request:** `multipart/form-data` avec champ `file`
- **Response:** `{ id, original_name, mime_type, size_bytes, created_at }`
- **Error:** 400 si type MIME non autorisé, 413 si trop lourd

### `GET /api/media`
- **Response:** `[{ id, original_name, mime_type, size_bytes, created_at }]` (sans le BLOB)

### `GET /api/media/:id`
- **Response:** fichier brut avec `Content-Type` correct (pour affichage dans `<img>` ou `<style>`)

### `PATCH /api/media/:id`
- **Auth:** required
- **Request:** `{ original_name: "nouveau nom" }`
- **Response:** `{ id, original_name }`
- **Error:** 404 si inexistant

### `DELETE /api/media/:id` *(à implémenter)*
- **Auth:** required
- **Response:** `204 No Content`
- **Error:** 404 si inexistant

---

## 6. Implementation steps

- [x] Table `media` dans le schéma SQLite
- [x] `POST /api/media` : upload multipart, stockage BLOB
- [x] `GET /api/media` : liste sans BLOB
- [x] `GET /api/media/:id` : serve le fichier
- [x] `PATCH /api/media/:id` : renommage
- [x] `MediaView.vue` : liste, vignettes, upload
- [x] Renommage inline (double-clic, Enter/Escape)
- [ ] `DELETE /api/media/:id` : backend + confirmation UI
- [ ] Détection doublons (hash MD5/SHA du BLOB côté backend)
- [ ] Prévisualisation font (injection dynamique `@font-face` + panneau test)

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Upload fichier > 10 MB | Rejeté avec message "Fichier trop volumineux" |
| Type MIME non autorisé | Rejeté avec message "Format non supporté" |
| Nom vide au renommage | Commit bloqué, message inline "Le nom ne peut pas être vide" |
| Suppression d'un média utilisé dans un layout | Supprimé quand même, le layout affiche un placeholder cassé |
| Double upload du même fichier | Avertissement "Ce fichier existe déjà sous le nom X" (à implémenter) |
| Font avec caractères spéciaux dans le nom | Nom nettoyé (slugified) avant stockage en `original_name` |

---

## 8. Acceptance criteria

- [x] Upload image et font fonctionnels
- [x] Renommage inline avec Enter/Escape
- [ ] Suppression avec modale de confirmation
- [ ] Prévisualisation font
- [ ] Détection doublons

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [ ] Taille maximale d'upload : 10 MB ? 25 MB ? (images haute résolution pour impression)
- [ ] Les fonts sont-elles intégrées dans le PDF export ? (impacte le format de stockage)
- [ ] Faut-il un système de dossiers/tags pour organiser les médias ?

---

## 11. Notes

- Les médias sont stockés en BLOB dans SQLite (pas sur le disque) pour simplifier le déploiement
- Les polices sont injectées dynamiquement avec `@font-face` au chargement de la vue
- `PATCH /api/media/:id` existait déjà avant l'implémentation du renommage inline
