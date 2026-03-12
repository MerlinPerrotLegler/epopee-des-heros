# TSD-005 — Vues listing (layouts & composants) — grille, miniatures, filtre

| Field       | Value                  |
|-------------|------------------------|
| Status      | Done                   |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | TSD-001                |

---

## 1. Purpose

Les vues `LayoutsView` et `ComponentsView` doivent permettre de naviguer, identifier rapidement et gérer (créer, dupliquer, renommer, supprimer) les layouts et composants. Une miniature générée automatiquement à chaque sauvegarde donne un aperçu visuel sans ouvrir l'éditeur.

---

## 2. Scope & boundaries

### In scope
- Grille de tuiles (vignette + infos + actions)
- Miniature capturée via `html2canvas` à chaque sauvegarde
- Placeholder hachuré + texte pour les layouts sans miniature
- Filtre par nom (input de recherche)
- Tri par nom (↑/↓), type, date de mise à jour
- Renommage inline (double-clic sur le nom dans la tuile)
- Actions toujours visibles : ✎ renommer, ⧉ dupliquer, ✕ supprimer
- Création depuis la vue (bouton "+ Nouveau")

### Out of scope
- Miniature manuelle (bouton "Générer la miniature") — supprimé, auto uniquement
- Filtrage par autre critère que le nom (tags, auteur) — non prévu
- Vue liste (vs grille) — non prévu

---

## 3. UX & interaction design

### Tuile
```
┌────────────────────────────────┐
│  ┌──────┐  Nom du layout       │
│  │      │  Type : equipement   │
│  │ img  │  63 × 88 mm          │
│  │      │  Modifié 12/03/2026  │
│  └──────┘                      │
│                      ✎ ⧉ ✕    │
└────────────────────────────────┘
```
- Vignette à gauche (120px de large, hauteur proportionnelle aux mm)
- Infos à droite
- Icônes d'action en bas à droite, toujours visibles (pas de hover-only)
- Clic sur la tuile (hors icônes) → ouvre le layout/composant dans l'éditeur

### Placeholder miniature
```
┌──────┐
│▒▒▒▒▒▒│  ← fond hachuré gris
│▒63×88│
│▒▒hint│  ← "Ouvrir et sauvegarder pour générer"
└──────┘
```

### Renommage inline dans la tuile
1. Double-clic sur le nom → input `<input>` remplace le `<span>`
2. Enter ou blur → `PATCH /layouts/:id { name }` (ou composants)
3. Escape → annulation

### Filtre + tri
- Input de recherche : filtre en temps réel sur `name` (insensible à la casse)
- Select de tri : `name↑` / `name↓` / `type` / `updated_at↓`

---

## 4. Data model

### Nouveau champ `thumbnail`
```sql
ALTER TABLE layouts    ADD COLUMN thumbnail TEXT;  -- base64 JPEG data URL
ALTER TABLE components ADD COLUMN thumbnail TEXT;
```
Migration idempotente avec `try { … } catch {}`.

### Payload sauvegarde (layouts)
```js
// PUT /layouts/:id/definition
// Avant : body = definition directement
// Après : body = { definition, thumbnail? }
// Rétrocompatible : si pas de wrapper, body IS definition
const hasWrapper = 'definition' in req.body || 'thumbnail' in req.body
const definition = hasWrapper ? req.body.definition : req.body
const thumbnail  = hasWrapper ? (req.body.thumbnail || null) : null
```

### Capture miniature
```js
// EditorCanvas.vue
async function captureThumbnail() {
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(cardBoundaryRef.value, {
    scale: 0.5, useCORS: true, allowTaint: true,
    logging: false, backgroundColor: '#ffffff',
  })
  return canvas.toDataURL('image/jpeg', 0.65)
}
```

### Callback non-réactif
```js
// store/editor.js
let captureCallback = null   // pas un ref (évite la réactivité circulaire)
function registerCaptureCallback(fn)  { captureCallback = fn }
function unregisterCaptureCallback()  { captureCallback = null }
```

---

## 5. API changes

### `GET /layouts` / `GET /components`
- Inclut le champ `thumbnail` dans le SELECT (TEXT, peut être null)

### `PUT /layouts/:id/definition`
- Accepte `{ definition, thumbnail? }` ou `definition` seul (compat.)
- Met à jour `thumbnail` si fourni

### `PUT /components/:id`
- Accepte `thumbnail` dans le body
- SQL : `COALESCE(?, thumbnail)` pour ne pas écraser si non fourni

### `PATCH /components/:id` *(nouveau)*
- Renommage seul (`name`)
- Séparé du PUT pour ne pas envoyer toute la définition au renommage

---

## 6. Implementation steps

- [x] Migrations SQLite `thumbnail TEXT` sur les deux tables
- [x] Backend : `GET` inclut thumbnail
- [x] Backend : `PUT /layouts/:id/definition` accepte wrapper
- [x] Backend : `PUT /components/:id` accepte thumbnail
- [x] Backend : `PATCH /components/:id` pour renommage
- [x] Store : `captureCallback` pattern (register/unregister)
- [x] Store : `saveDefinition` appelle `captureCallback()` et envoie thumbnail
- [x] `EditorCanvas` : `captureThumbnail()` + register/unregister dans mounted/beforeUnmount
- [x] `LayoutsView` : refonte grille, tuile, filtre, tri, renommage inline
- [x] `ComponentsView` : idem
- [x] Placeholder hachuré avec `background: repeating-linear-gradient(…)`

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Layout jamais sauvegardé depuis l'ajout du feature | Placeholder hachuré avec indication textuelle |
| `html2canvas` échoue (erreur CORS sur une image) | `captureThumbnail` retourne `null`, sauvegarde continue sans thumbnail |
| Canvas non monté au moment de la sauvegarde | `captureCallback` est `null`, thumbnail non envoyé |
| `dirty = false` lors d'un Ctrl+S | `saveDefinition` retourne immédiatement, pas de sauvegarde inutile |
| Renommage avec nom vide | Bloqué côté UI, commit non envoyé |
| Dupliquer un layout | Copie avec "(copie)" ajouté au nom, thumbnail copié aussi |

---

## 8. Acceptance criteria

- [x] Miniature générée automatiquement à chaque sauvegarde normale
- [x] Placeholder visible pour les layouts sans miniature
- [x] Filtre par nom en temps réel
- [x] Tri par nom, type, date
- [x] Renommage inline depuis la grille
- [x] Actions dupliquer et supprimer fonctionnelles
- [x] Clic sur tuile ouvre le layout dans l'éditeur

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | Miniatures non visibles : les layouts existants n'avaient jamais eu de miniature générée | fixed — placeholder informatif + auto-génération au prochain save | 2026-03-12 |
| 2 | Bouton "📷 Miniature" ajouté par erreur (save séparé hors dirty) | fixed — revert, thumbnail uniquement sur save normal | 2026-03-12 |

---

## 10. Open questions

— (aucune)

---

## 11. Notes

- La miniature est du JPEG base64 (qualité 0.65, scale 0.5) — environ 15–40 KB par layout
- Le pattern `captureCallback` (non-réactif) est nécessaire car `EditorCanvas` est le seul à avoir accès au DOM de la carte, mais le store est l'initiateur de la sauvegarde
