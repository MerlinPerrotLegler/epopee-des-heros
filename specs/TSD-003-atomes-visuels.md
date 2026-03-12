# TSD-003 — Atomes visuels (registre, rendu, pen strokes)

| Field       | Value                  |
|-------------|------------------------|
| Status      | Done (partiel — hexTile & image à finaliser) |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | TSD-001                |

---

## 1. Purpose

Les atomes sont les primitives visuelles de base du designer. Chaque atome a un type, des paramètres par défaut, un composant Vue de rendu, et une icône dans le panneau. L'ensemble est géré via un registre central (`atoms/index.js`) qui évite de disperser les définitions.

---

## 2. Scope & boundaries

### In scope
- Registre des types d'atomes dans `atoms/index.js`
- Composant de rendu par type (`AtomDie8`, `AtomDie12`, `AtomText`, etc.)
- Paramètres par défaut (`defaultParams`) et taille par défaut (`defaultSize`)
- Système de pen strokes SVG calligraphiques pour D8 et D12
- Rendu de tous les types dans `AtomRenderer.vue` (dispatcher)
- Ajout d'atomes depuis le panneau gauche (clic → ajout au canvas)

### Out of scope
- Drag & drop inter-canvas (atomes entre layouts) — non prévu
- Atome custom créé par l'utilisateur (code) — non prévu
- Animations ou effets de transition — non prévu

---

## 3. UX & interaction design

### Ajout d'un atome
1. Dans le panneau gauche, l'utilisateur clique sur le type d'atome souhaité
2. L'atome est ajouté au centre du canvas visible avec ses `defaultParams` et `defaultSize`
3. Il est sélectionné immédiatement
4. L'utilisateur peut le déplacer, redimensionner et éditer ses propriétés

### Édition des paramètres
- Le panneau droit `PropertiesPanel` affiche les champs propres au type d'atome sélectionné
- Chaque champ est synchronisé en temps réel avec le store (pas de validation on-blur)

### Visual states des atomes sur le canvas
| Type | Rendu |
|------|-------|
| text / title | Texte rendu avec police, taille, couleur configurées |
| icon | Image SVG centrée dans la zone |
| pastille | Cercle coloré avec texte centré |
| die8 | Losange/triangle SVG avec pen strokes + numéro |
| die12 | Pentagone SVG avec pen strokes + numéro |
| price | Rangée d'icônes ressources |
| resource | Icône ressource seule |
| counter | Rectangle avec valeur numérique |
| hexTile | Hexagone SVG avec tuile de terrain |
| image | Image uploadée recadrée |
| rectangle | Rectangle coloré (bg pur) |
| line | Ligne SVG horizontale ou verticale |
| cardPlaceholder | Zone grise avec "Carte" |
| resourcePlaceholder | Zone grise avec "Ressource" |
| cardType | Badge type de carte |

---

## 4. Data model

### Registre `atoms/index.js`
```js
export const ATOM_TYPES = {
  title: {
    label: "Titre",
    icon: "T",
    defaultSize: { width: 40, height: 8 },  // mm
    defaultParams: {
      text: "Titre",
      fontSize: 5,          // mm
      fontFamily: "default",
      color: "#1a1a2e",
      align: "center",
      bold: true,
    }
  },
  die8: {
    label: "Dé 8",
    icon: "⬡",
    defaultSize: { width: 8, height: 8 },
    defaultParams: {
      value: 3,
      fontSize: 3.5,   // taille du nombre — indépendant de la forme
      color: "#1a1a2e",
      strokeColor: "#1a1a2e",
    }
  },
  // … tous les types
}
```

### Pen strokes D8 / D12
```js
// atoms/components/AtomDie8.vue
const R      = computed(() => Math.min(W.value, H.value) / 2 * 0.85)
const textSz = computed(() => (p.value.fontSize || 3.5) * SCALE)
// R est piloté par les dimensions de l'élément (width/height en mm)
// textSz est indépendant de R
```

Les pen strokes sont générés via `cardTrackStrokes.js` (fonctions `buildStrokePool`, `variantToPath`, `pickVariant`). Pas de fill — uniquement des bords dessinés comme des fuseaux calligraphiques.

---

## 5. API changes

N/A — les atomes sont rendus côté client uniquement. Leur définition est dans la `definition` du layout (JSON).

---

## 6. Implementation steps

- [x] `atoms/index.js` : registre complet avec tous les types, defaultParams, defaultSize
- [x] `AtomRenderer.vue` : dispatcher `<component :is="..." />` selon `atomType`
- [x] `AtomDie8.vue` : SVG pen strokes (R depuis dimensions, textSz depuis fontSize)
- [x] `AtomDie12.vue` : SVG pen strokes pentagon
- [x] `cardTrackStrokes.js` : buildStrokePool, variantToPath, pickVariant
- [x] `AtomText.vue`, `AtomTitle.vue` : rendu texte
- [x] `AtomIcon.vue` : rendu SVG/image
- [x] `AtomPastille.vue`, `AtomRectangle.vue`, `AtomLine.vue`
- [x] `AtomPrice.vue`, `AtomResource.vue`, `AtomCounter.vue`
- [x] `AtomCardPlaceholder.vue`, `AtomResourcePlaceholder.vue`
- [x] `AtomCardType.vue`
- [x] `AtomImage.vue` : upload + recadrage + rendu
- [ ] `AtomHexTile.vue` : finaliser rendu SVG hexagonal avec types de terrain

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| `fontSize` modifié sur un die8/12 | Change uniquement la taille du numéro, pas la forme |
| Élément redimensionné très petit (< 3mm) | Le pen stroke se dessine à petite échelle, pas de crash |
| Paramètre manquant dans `params` | `defaultParams` du registre utilisé comme fallback |
| Atome inconnu dans `definition` | `AtomRenderer` affiche un placeholder `?` sans crash |
| Police non disponible | Fallback sur police système |
| Valeur `value` hors plage (ex: dé8 avec valeur 99) | Affiché tel quel, pas de validation |

---

## 8. Acceptance criteria

- [x] Tous les types d'atomes peuvent être ajoutés depuis le panneau
- [x] Die8 et Die12 : forme pilotée par les dimensions, nombre par fontSize
- [x] Pen strokes SVG sur die8/die12 (pas de fill, traits calligraphiques)
- [x] `defaultParams` complets pour tous les types dans le registre
- [x] AtomImage : upload et affichage dans le canvas
- [ ] AtomHexTile : rendu hexagonal complet

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | Die8/Die12 : taille de la forme pilotée par fontSize (comportement indésirable) | fixed — R = min(W,H)/2*0.85, textSz indépendant | 2026-03-12 |

---

## 10. Open questions

- [ ] AtomHexTile : quels types de terrain ? Couleurs ou textures ? Source des assets ?
- [ ] AtomImage : recadrage libre ou ratio fixe ?

---

## 11. Notes

- Le système de pen strokes est le même que pour "CardTrack" (jeu précédent de l'auteur)
- `cardTrackStrokes.js` est une librairie interne, ne pas modifier sans vérifier les variantes
- La taille par défaut des atomes dans le registre est en mm et correspond aux dimensions typiques dans une carte 63×88 mm
