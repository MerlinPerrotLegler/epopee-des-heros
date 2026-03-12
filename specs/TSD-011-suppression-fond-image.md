# TSD-011 — Suppression du fond d'une image (remove background)

| Field       | Value                  |
|-------------|------------------------|
| Status      | Draft                  |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | TSD-004                |

---

## 1. Purpose

Après l'upload d'une illustration (personnage, objet), le designer veut supprimer le fond pour obtenir une image PNG transparente, utilisable directement dans un layout sans masquage manuel. Cette opération doit être accessible en un clic depuis la bibliothèque média.

---

## 2. Scope & boundaries

### In scope
- Bouton "Supprimer le fond" sur chaque image dans la MediaView
- Traitement de l'image (fond → transparence) en local via une librairie JS ou via un service API
- Résultat sauvegardé comme nouveau média dans la bibliothèque (l'original est conservé)
- Nommage automatique du résultat : `{original_name}_nobg.png`
- Indicateur de progression pendant le traitement
- Fond affiché avec le damier Photoshop pour confirmer la transparence

### Out of scope
- Édition manuelle du masque généré — non prévu en v1
- Support des GIFs animés — non prévu
- Traitement batch (plusieurs images à la fois) — non prévu en v1

---

## 3. Bibliothèques candidates

### Option A — `@imgly/background-removal` ⭐ Recommandé
- **NPM :** `@imgly/background-removal`
- **Fonctionnement :** modèle ONNX (REMBG) exécuté dans le navigateur via WebAssembly
- **Avantages :** 100% local, gratuit, pas d'API key, qualité élevée (comparable à remove.bg)
- **Inconvénients :** ~40 MB de modèle téléchargé au premier usage (mis en cache par le browser)
- **Usage :**
  ```js
  import { removeBackground } from '@imgly/background-removal'
  const blob = await removeBackground(imageUrl)
  // blob = PNG avec transparence
  ```

### Option B — `remove.bg` API (service externe)
- **NPM :** aucun — appel REST direct
- **Avantages :** aucun téléchargement de modèle, qualité premium
- **Inconvénients :** API key requise, 50 crédits/mois gratuits, données envoyées à un tiers, latence réseau
- **URL :** `https://api.remove.bg/v1.0/removebg`

### Option C — `rembg` (Python, côté serveur)
- **NPM :** aucun — service Python séparé
- **Avantages :** qualité très élevée, pas de dépendance frontend
- **Inconvénients :** ajoute une dépendance Python au déploiement, complexité ops
- **Usage :** `rembg i input.jpg output.png`

### Recommandation
**Option A** (`@imgly/background-removal`) : traitement entièrement local, pas de coût, pas de compte tiers, qualité suffisante pour l'usage carte. Le modèle est mis en cache après le premier téléchargement.

---

## 4. UX & interaction design

### Bouton dans la MediaView
```
┌──────────────────────────┐
│  [damier] [image]        │
│                          │
│  nom-image.png           │
│              ✎ ⧉ ⬜ ✕   │  ← ⬜ = bouton "remove bg"
└──────────────────────────┘
```
Le bouton `⬜` (ou icône "étoile magique" ✦) n'apparaît que pour les images (pas les fonts, SVGs).

### Primary flow
1. L'utilisateur clique `⬜` sur une image
2. Un spinner apparaît sur la vignette avec le texte "Traitement…"
3. La librairie charge le modèle ONNX (première fois : téléchargement ~40 MB avec une progress bar)
4. Le traitement s'effectue (2–10 secondes selon la taille)
5. Le PNG résultant est uploadé automatiquement comme nouveau média
6. La grille se met à jour avec le nouvel item `nom-image_nobg.png`
7. Un toast confirme : "Fond supprimé → nom-image_nobg.png"

### États visuels
| État | Description |
|------|-------------|
| Idle | Bouton `⬜` visible au hover de la carte |
| Chargement modèle | Progress bar globale "Chargement du modèle (première fois)…" |
| Traitement | Spinner sur la vignette, bouton désactivé |
| Succès | Toast, nouvelle image ajoutée en haut de la grille |
| Erreur | Toast rouge "Échec du traitement" |

---

## 5. Data model

Aucun nouveau champ. Le résultat est un nouveau `media` créé via `POST /api/media/upload`. L'original n'est pas modifié.

Optionnel : ajouter un champ `source_media_id` sur le média résultant pour tracer l'origine :
```sql
ALTER TABLE media ADD COLUMN source_media_id TEXT REFERENCES media(id);
```

---

## 6. API changes

### Backend : `POST /api/media/remove-bg` *(optionnel si traitement côté client)*

Si l'Option A (traitement navigateur) est retenue : **aucun nouvel endpoint**. Le résultat est uploadé via `POST /api/media/upload` existant.

Si Option B ou C est retenue :
- **Request :** `{ media_id: "abc.jpg" }`
- **Response :** `{ id, filename, original_name, mime_type }` (nouveau média)

---

## 7. Implementation steps

- [ ] Installer `@imgly/background-removal` : `npm install @imgly/background-removal`
- [ ] Créer `utils/removeBackground.js` : wrapper autour de la librairie avec gestion du chargement progressif du modèle
- [ ] `MediaView.vue` : ajouter le bouton `⬜` dans `.media-actions` (visible pour `isImage(m) && !isSvg(m)`)
- [ ] `MediaView.vue` : état local `processingId` pour afficher le spinner sur la vignette
- [ ] `MediaView.vue` : appeler `removeBackground(url)` → obtenir un Blob PNG
- [ ] `MediaView.vue` : uploader le blob via `api.uploadMedia` (FormData avec nom `_nobg.png`)
- [ ] `MediaView.vue` : push le nouveau média dans `media.value`, afficher toast
- [ ] Tester avec images JPEG, PNG avec fond blanc, PNG semi-transparent

---

## 8. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Image SVG | Bouton `⬜` masqué (SVG = vectoriel, pas de fond pixel) |
| Image avec fond transparent existant | Traitement quand même (la librairie gère ce cas) |
| Image > 5 MB | Avertissement "Image volumineuse, le traitement peut être lent" |
| Modèle ONNX non disponible (pas de connexion au premier chargement) | Message "Connexion requise pour télécharger le modèle la première fois" |
| Traitement échoue (timeout, erreur WASM) | Toast erreur, image originale non modifiée |
| Résultat uploadé avec nom déjà existant | Déduplication par SHA1 → retourne le média existant |

---

## 9. Acceptance criteria

- [ ] Bouton visible uniquement sur les images (pas SVG)
- [ ] Traitement entièrement local (pas d'envoi à un tiers sauf Option B choisie)
- [ ] Le modèle est mis en cache (un seul téléchargement)
- [ ] Le résultat est un PNG avec transparence
- [ ] L'original est conservé (pas de remplacement)
- [ ] Le fond transparent est affiché avec le damier dans la grille

---

## 10. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 11. Open questions

- [ ] Option A (local WASM) ou Option B (API remove.bg) ? Budget ?
- [ ] Faut-il un champ `source_media_id` pour tracer l'origine ?
- [ ] Les SVGs sont-ils concernés ? (Ils pourraient avoir un fond fill rectangle à supprimer)

---

## 12. Notes & références

- `@imgly/background-removal` GitHub : https://github.com/imgly/background-removal-js
- Modèle ONNX basé sur REMBG (U²-Net)
- Documentation remove.bg API : https://www.remove.bg/api
- Taille du modèle `@imgly/background-removal` : ~42 MB (téléchargé une fois, mis en cache navigateur)
- L'option WASM fonctionne dans Chrome/Firefox/Safari modernes (Web Workers + WASM SIMD)
