# TSD-001 — Éditeur de canvas (canvas principal, drag & drop, zoom)

| Field       | Value                  |
|-------------|------------------------|
| Status      | Done                   |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | none                   |

---

## 1. Purpose

Fournir un canvas interactif permettant au designer de placer, déplacer, redimensionner et inspecter les éléments d'un layout ou d'un composant. Le canvas est l'interface principale du tool ; tout le reste (panneaux, store) en est l'infrastructure.

---

## 2. Scope & boundaries

### In scope
- Affichage du canvas avec les éléments du layout courant
- Sélection d'un élément au clic
- Déplacement d'un élément par drag (souris)
- Redimensionnement par les poignées (coins + bords)
- Snap magnétique sur grille mm (défaut 1 mm, configurable)
- Zoom molette + boutons (1:1, fit, +/−) sans limite de min
- Auto-fit à l'ouverture d'un layout ou composant
- Pan du canvas (espace + glisser, ou bouton milieu souris)
- Rendu de la zone de carte (dimensions en mm, fond blanc)
- Guides visuels (bords de carte, règle optionnelle)

### Out of scope
- Rendu de l'autre face (recto/verso) → TSD-006
- Édition des propriétés des éléments → panneau PropertiesPanel
- Gestion des calques → TSD-002
- Export du canvas → TSD-009

---

## 3. UX & interaction design

### Primary flow — déplacer un élément
1. L'utilisateur clique sur un élément → il devient sélectionné (surligné)
2. Il maintient le clic et glisse → l'élément suit la souris
3. Le snap arrondit la position au mm le plus proche
4. Il relâche → position enregistrée dans le store, flag `dirty = true`

### Primary flow — redimensionner
1. L'élément sélectionné affiche 8 poignées (4 coins + 4 bords)
2. Glisser une poignée redimensionne dans la direction correspondante
3. Snap appliqué sur width/height
4. Shift maintenu conserve le ratio (optionnel, non implémenté à ce stade)

### Primary flow — zoom
1. Molette → zoom centré sur la position du curseur
2. Bouton `+` / `−` → zoom de ±10% centré sur le centre du canvas
3. Bouton `1:1` → zoom = 1 (1 px écran = 1 px rendu), canvas centré sur la carte
4. Bouton `⊡` → zoom calculé pour que la carte remplisse l'espace disponible, centré

### Auto-fit à l'ouverture
- `loadLayout()` et `loadComponent()` posent `requestFit = 'fit'` dans le store
- `EditorCanvas` consomme ce flag dans `onMounted` via double `requestAnimationFrame` (timing : le composant est masqué par `v-if="!store.loading"` donc il monte après le chargement)

### Visual states
| État | Description |
|------|-------------|
| Chargement | Canvas masqué (`v-if`), spinner dans la vue parent |
| Vide | Fond blanc de la carte, aucun élément |
| Élément sélectionné | Bordure bleue + 8 poignées |
| Drag en cours | Curseur `grabbing`, élément déplacé en temps réel |
| Zoom < 30% | Texte et icônes illisibles mais pas bloqué |

---

## 4. Data model

```js
// store/editor.js
zoom     : ref(1)          // facteur multiplicatif (pas de limite)
panX     : ref(0)          // décalage horizontal en px
panY     : ref(0)          // décalage vertical en px
requestFit : ref(null)     // 'fit' | '1:1' | null — signal one-shot

// Élément dans layers[].elements[]
{
  id         : "uuid",
  type       : "atom | component | molecule",
  atomType   : "text | icon | die8 | …",  // si type === 'atom'
  x          : 12.5,   // mm depuis coin haut-gauche du layout
  y          : 8.0,    // mm
  width      : 30.0,   // mm
  height     : 10.0,   // mm
  params     : { … },  // paramètres spécifiques à l'atome
  locked     : false,
  visible    : true,
  opacity    : 1.0,
}
```

### Conversion mm ↔ px
```js
const SCALE = 3.7795  // px/mm
const px = mm => mm * SCALE * zoom.value
const mm = px => px / SCALE / zoom.value
```

---

## 5. API changes

N/A — le canvas est entièrement côté client. La sauvegarde est gérée par `PUT /layouts/:id/definition` (voir TSD-005).

---

## 6. Implementation steps

- [x] Composant `EditorCanvas.vue` avec div scrollable
- [x] Transformation CSS `scale + translate` via `zoom`, `panX`, `panY`
- [x] Composable `useDragAndDrop.js` : mousedown → mousemove → mouseup
- [x] Snap : `Math.round(val / snapMm) * snapMm`
- [x] Composable `useMmScale.js` : constante SCALE + helpers
- [x] Zoom molette (`onWheel`)
- [x] Boutons zoom dans `EditorToolbar.vue`
- [x] `applyFit(mode)` : calcul zoom + pan pour 'fit' et '1:1'
- [x] `requestFit` dans le store, watch + double RAF dans `EditorCanvas`
- [x] `onMounted` consomme `requestFit` pré-existant (race condition fix)

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Élément partiellement hors des bords de la carte | Autorisé, rendu tel quel (pas de contrainte de clipping) |
| Zoom très faible (< 5%) | Autorisé, pas de limite |
| Drag d'un élément verrouillé | Ignoré — l'élément ne bouge pas |
| Resize à une dimension < 1 mm | Bloqué à 1 mm minimum |
| Layout sans éléments | Canvas vide, fond blanc de la carte visible |
| Double RAF race condition | `onMounted` re-lit `store.requestFit` et appelle `handleFitRequest` |

---

## 8. Acceptance criteria

- [x] Drag & drop déplace un élément avec snap mm
- [x] Resize fonctionne sur les 8 poignées avec snap mm
- [x] Zoom molette centré sur le curseur
- [x] Bouton 1:1 centre et remet zoom à 1
- [x] Bouton ⊡ ajuste le zoom pour remplir l'espace disponible
- [x] Auto-fit fonctionnel à l'ouverture d'un layout
- [x] Aucune limite de zoom minimum

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | Auto-fit ne s'appliquait pas à l'ouverture (race condition v-if + loadLayout) | fixed — double RAF dans onMounted | 2026-03-12 |

---

## 10. Open questions

— (aucune)

---

## 11. Notes & références

- Scale 3.7795 px/mm = résolution 96 dpi convertie en mm
- `useDragAndDrop.js` gère aussi le resize en détectant la poignée active au mousedown
- Le pan libre (espace+glisser) n'est pas encore implémenté — le scroll natif du conteneur est utilisé
