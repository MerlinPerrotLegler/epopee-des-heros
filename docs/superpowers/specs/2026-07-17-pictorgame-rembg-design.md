# Design — Suppression de fond (upload + Pictorgame)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Approved (pending user file review)        |
| Date        | 2026-07-17                                 |
| Depends on  | TSD-011 (rembg Médias), TSD-021 (Pictorgame) |

---

## 1. Goal

Permettre de supprimer le fond d’une image :

1. **À l’upload** (Médias et Pictorgame), via une case optionnelle (défaut off).
2. **Sur une tuile Pictorgame**, via un bouton ✦ qui **remplace en place** le contenu (même `id` / `picto_ref`).

Le flux ✦ existant dans l’onglet Médias (création d’un nouveau fichier `{nom}_nobg.png`) **reste inchangé**.

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Picto post-traitement | **A** — remplacer en place (même `ref`) |
| Picto lié (`source_media_id`) | Remplacer uniquement le contenu du picto ; détacher le lien ; média source intact |
| Upload | **A** — case optionnelle avant envoi |
| Portée UI | **C** — case à l’upload partout + ✦ seulement Pictorgame ; Médias garde `_nobg` |
| Approche upload | **1** — toggle à côté du bouton Upload (pas de dialogue de revue) |

---

## 3. Behavior matrix

| Surface | Trigger | Result |
|---------|---------|--------|
| Médias toolbar | Toggle « Supprimer le fond » + Upload | Si on : rembg client → upload d’**un** PNG transparent par fichier |
| Pictorgame toolbar | Même toggle + Upload picto | Idem avant `POST /api/pictos` multipart |
| Pictorgame tile | Bouton ✦ | rembg → `PUT` contenu sur le même picto |
| Médias tile | ✦ existant | Nouveau média `{base}_nobg.png` (comportement actuel) |

### Out of scope

- Édition manuelle du masque
- Traitement SVG / GIF animé
- Batch serveur / Python rembg
- Remplacer le média source d’un picto lié
- Changer le flux `_nobg` Médias

---

## 4. UX

### 4.1 — Toggle upload

- Emplacement : à côté de `⤒ Upload` (Médias) et `+ Upload picto` (Pictorgame).
- Label : « Supprimer le fond ».
- Défaut : **décoché**.
- Si coché au moment du `@change` file input :
  1. Pour chaque fichier image sélectionné, appeler `removeBg` (client).
  2. Remplacer le `File` par un `File([blob], `${base}.png`, { type: 'image/png' })`.
  3. Enchaîner l’upload existant (FormData).
- Pendant le traitement : désactiver upload / toggle ; afficher progression (réutiliser le pattern progress `@imgly` déjà dans `MediaView`).
- Erreur sur un fichier : toast d’échec ; les fichiers déjà traités / uploadés restent (pas de rollback global obligatoire en v1).

### 4.2 — ✦ Pictorgame

- Icône / title alignés sur Médias (« Supprimer le fond »).
- Visible pour les pictos image (tous les pictos catalogue sont des images).
- Pendant traitement : `processingId` + spinner / opacité sur la vignette.
- Succès : recharger le store pictos ; bust cache vignette (`/uploads/${id}?t=${Date.now()}`).

---

## 5. Architecture

```
┌─────────────────┐     ┌──────────────────────────┐
│ MediaView       │────▶│ applyRemoveBgToFiles()   │
│ PictorgamePanel │     │ (wrapper removeBg loop)  │
└────────┬────────┘     └────────────┬─────────────┘
         │                           │
         │ upload FormData           │ ✦ picto only
         ▼                           ▼
  POST /api/media/upload      PUT /api/pictos/:id/content
  POST /api/pictos            (multipart, 1 file)
```

### 5.1 — Frontend

| Piece | Role |
|-------|------|
| `utils/removeBackground.js` | Inchangé (`@imgly/background-removal`) |
| `utils/applyRemoveBgToFiles.js` *(nouveau)* | `(files, { enabled, onProgress }) → File[]` — no-op si `!enabled` |
| `MediaView.vue` | Toggle + appeler helper avant `uploadMedia` |
| `PictorgamePanel.vue` | Toggle upload + bouton ✦ + `replacePictoContent` |
| `api.js` | `replacePictoContent(id, formData)` → `PUT /pictos/:id/content` |

### 5.2 — Backend

`PUT /api/pictos/:id/content` (multer memory, 1 file) :

1. Vérifier `kind = 'picto'`.
2. `UPDATE media SET content = ?, mime_type = ?, original_name = ?, source_media_id = NULL WHERE id = ?`.
3. Conserver `id` et `filename` (URLs `/uploads/${id}` et `picto_ref` stables).
4. Répondre le picto enrichi (même shape que `GET` / `PATCH`).

Pas de migration schema.

### 5.3 — Cache navigateur

Après remplacement, les `<img src="/uploads/id">` peuvent rester en cache. Le panel pictos utilise un query `?t=` après succès ; les atomes canvas se rafraîchiront au prochain reload / re-fetch store (acceptable v1). Option ultérieure : header `Cache-Control` sur `/uploads`.

---

## 6. Error handling

| Case | Behavior |
|------|----------|
| Modèle ONNX en cours de téléchargement | Progress UI ; ne pas double-cliquer (guard `processingId`) |
| `removeBg` throw | Toast erreur ; ne pas uploader le fichier concerné |
| `PUT content` 404 | Toast ; store inchangé |
| Fichier non-image dans multi Médias | Skip rembg pour ce fichier (garder tel quel) si jamais accept élargi ; v1 `accept="image/*"` |

---

## 7. Testing (manual)

1. Médias : upload sans toggle → JPEG/PNG inchangé.
2. Médias : toggle on → fichier stocké en PNG transparent (damier) ; pas de doublon `_nobg`.
3. Pictorgame : upload avec toggle → picto créé transparent, `ref` saisi normalement.
4. Pictorgame : ✦ sur picto opaque → même `ref`, vignette transparente, médias source liés intacts.
5. Médias : ✦ tuile → toujours crée `{nom}_nobg.png` (non régression).

---

## 8. Implementation sketch (ordered)

1. Helper `applyRemoveBgToFiles` + tests unitaires légers (mock `removeBg`).
2. Toggle + wiring `MediaView.upload`.
3. Toggle + wiring upload pictos.
4. Route `PUT /api/pictos/:id/content` + `api.replacePictoContent`.
5. Bouton ✦ + progress dans `PictorgamePanel`.
6. QA manuelle §7 ; entrée `WORKPLAN.md`.
