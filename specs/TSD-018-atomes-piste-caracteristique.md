# TSD-018 — Atomes spécialisés : Pistes (trak, trakCorner, cardTrack) & Caractéristique

| Field       | Value                             |
|-------------|-----------------------------------|
| Status      | Done                              |
| Author      | @merlinperrot                     |
| Created     | 2026-03-13                        |
| Last update | 2026-03-13                        |
| Depends on  | TSD-003 (atomes visuels)          |

---

## 1. Purpose

Les cartes du jeu ont deux familles de visuels non couverts dans TSD-003 :

1. **Pistes numérotées** : anneau de cases qui court sur les 4 bords de la carte (pour tracker la progression d'un aventurier), ses variantes linéaires simples (`trak`) et les cases de coin (`trakCorner`).
2. **Caractéristique** : badge de statistique (FOR, DEX, INI…) avec modificateur et seuil, utilisé sur les cartes de classe et d'équipement.

---

## 2. Scope & boundaries

### In scope
- Atome `trak` : piste linéaire numérotée (horizontal ou vertical), cases carrées + triangles-cap optionnels
- Atome `trakCorner` : case carrée avec numéro incliné, pour les angles d'une piste manuelle
- Atome `cardTrack` : piste sur 4 bords auto-calculée (anneau de cases + coins), avec traits de plume optionnels, sélection de case individuelle dans l'éditeur, surcharges par case (`cellOverrides`)
- Atome `caracteristique` : badge de stat avec fond coloré, modificateur et seuil, SVG décoratif superposable

### Out of scope
- Piste circulaire (arc)
- Piste interactive en jeu (uniquement rendu statique pour les cartes)
- Éditeur de cas individual (pour `cellOverrides`) — la modification se fait en JSON dans PropertiesPanel

---

## 3. UX & interaction design

### Atome `trak`
- Placé comme tout atome : drag & drop sur le canvas, resize
- Paramètres : `n_start`, `n_end`, direction (horizontal/vertical), `cellSize_mm`, couleurs, `caps`
- Redimensionner le `trak` ajuste visuellement — la distribution des cases suit `cellSize_mm`

### Atome `trakCorner`
- Case carrée unique, numéro incliné à `textRotation` degrés
- Utilisé manuellement pour habiller les angles d'une piste composée de plusieurs `trak`
- Ou utilisé par `CardTrack` qui en génère un en interne pour chaque coin

### Atome `cardTrack`
- Occupe idéalement toute la carte (63×88 mm par défaut)
- Distribution auto des cases sur 4 bords depuis `n_start` à `n_end` (défaut 0→50)
- **Sélection de case** : double-clic sur une case déjà sélectionnée dans l'éditeur → surlignage jaune de la case, `activeCellIdx` dans le store
- **Surcharges** (`cellOverrides`) : map `{idx: {bgColor?, svgMediaId?}}` — chaque case peut avoir sa propre couleur de fond ou un SVG décoratif
- **Style plume** (`penStyle: true`) : remplace les bordures par des traits calligraphiques SVG (fuseaux remplis)

### Atome `caracteristique`
- Rectangle coloré (couleur dépend du type de stat : FOR=rouge, DEX=vert…)
- Affiche : `modifier` (ex: "+2 ") + stat (ex: "FOR") + threshold (ex: ">5")
- SVG décoratif optionnel positionnable en avant ou en arrière-plan

---

## 4. Data model

Pas de table dédiée. Les params sont stockés dans `definition.layers[].elements[].params` des layouts/components (JSON).

### Paramètres `trak`
```json
{
  "n_start": 0,
  "n_end": 10,
  "direction": "horizontal",
  "cellSize_mm": 5,
  "bgColor": "#2a3050",
  "textColor": "#ffffff",
  "fontSize": 2.5,
  "borderColor": "#6c7aff",
  "borderWidth": 0.2,
  "caps": false
}
```

### Paramètres `trakCorner`
```json
{
  "n": 0,
  "bgColor": "#2a3050",
  "textColor": "#ffffff",
  "fontSize": 2.5,
  "borderColor": "#6c7aff",
  "borderWidth": 0.2,
  "svgMediaId": "",
  "textRotation": 45
}
```

### Paramètres `cardTrack` (sélection)
```json
{
  "n_start": 0,
  "n_end": 50,
  "cells_top": null,
  "cells_left": null,
  "startCorner": "topLeft",
  "roundMode": "round",
  "textOrientation": "parallel",
  "cornerTextMode": "bisect",
  "cornerTextAngle": 45,
  "bgColor": "#2a3050",
  "textColor": "#ffffff",
  "fontSize": 2.5,
  "borderColor": "#6c7aff",
  "borderWidth": 0.2,
  "fontFamily": "Outfit",
  "svgMediaId": "",
  "cellOverrides": {},
  "penStyle": false,
  "penColor": "#6c7aff",
  "penWidth": 0.4,
  "penPoolSize": 4,
  "penSeedH": 1,
  "penSeedV": 2
}
```

### Paramètres `caracteristique`
```json
{
  "stat": "FOR",
  "modifier": "",
  "threshold": "",
  "textColor": "#ffffff",
  "fontSize": 3,
  "svgMediaId": "",
  "svgPosition": "front"
}
```

### `STAT_TYPES` (enum frontend, non stocké)
```js
{ FOR: '#ef4444', DEX: '#22c55e', INI: '#14b8a6', CHA: '#ec4899', MAG: '#a855f7', DEV: '...', VIE: '...' }
```

---

## 5. API changes

N/A — ces atomes sont purement frontend/rendus. Pas de nouveaux endpoints.

---

## 6. Implementation steps

- [x] `AtomTrak.vue` : SVG viewBox calculée depuis `cells`, caps triangulaires
- [x] `AtomTrakCorner.vue` : SVG viewBox 100×100, texte rotaté
- [x] `AtomCardTrack.vue` : SVG calculé via `buildCardTrackCells()` (utilitaire séparé)
- [x] `frontend/src/utils/cardTrackLayout.js` : calcul de la distribution des cases sur 4 bords
- [x] `frontend/src/utils/cardTrackStrokes.js` : génération des traits de plume (fuseaux SVG remplis)
- [x] `AtomCaracteristique.vue` : rectangle coloré, texte, SVG overlay
- [x] Sélection de case dans `EditorCanvas` : `hitTestCardTrackCell()` + `store.activeCellIdx`
- [x] `PropertiesPanel` : sections dédiées pour chaque param (couleurs, overrides, plume)
- [x] `atoms/index.js` : `defaultParams` + `defaultSize` pour tous les 4 atomes, `STAT_TYPES` exporté

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| `n_end < n_start` pour `trak` | Aucune case rendue (array vide) |
| `cardTrack` trop petit pour les cases | Cases se chevauchent — pas d'erreur, rendu dégradé visible |
| `cellOverrides` avec un idx hors plage | Ignoré silencieusement |
| Sélection d'une case de `cardTrack` non sélectionné | Double-clic requis : premier clic sélectionne l'atome, second clic sélectionne la case |
| `svgMediaId` inexistant | Image non rendue (navigateur ignore les `<img>` avec src invalide) |

---

## 8. Acceptance criteria

- [x] `trak` horizontal rendu avec le bon nombre de cases et les caps si activés
- [x] `trak` vertical rendu idem en rotation
- [x] `trakCorner` affiche le numéro incliné au bon angle
- [x] `cardTrack` distribue les cases sur 4 bords depuis `startCorner`
- [x] Sélection de case dans `cardTrack` surligne la case en jaune
- [x] `penStyle` remplace les bordures par des fuseaux calligraphiques SVG
- [x] `caracteristique` affiche la bonne couleur selon le type de stat

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

- `cardTrackLayout.js` est l'utilitaire partagé entre le rendu SVG (`AtomCardTrack.vue`) et la détection de clic (`hitTestCardTrackCell()` dans `EditorCanvas.vue`) — toute modification structurelle doit se faire là.
- `cardTrackStrokes.js` génère un pool de variantes de traits calligraphiques déterministes (seed-based) pour garantir la cohérence entre renders.
- Les traits de plume sont des fuseaux remplis (filled polygons), pas des `<path stroke>`, pour un résultat plus robuste en export SVG/PNG.
- `STAT_TYPES` définit 7 stats avec couleurs fixes ; les couleurs ne sont pas configurables pour garantir la cohérence du jeu.
