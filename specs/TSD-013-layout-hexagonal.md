# TSD-013 — Layout hexagonal (carte en forme de tuile)

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Draft                        |
| Author      | @merlinperrot                |
| Created     | 2026-03-13                   |
| Last update | 2026-03-13 (Q1+Q2 résolus)   |
| Depends on  | TSD-001 (canvas éditeur), TSD-009 (export) |

---

## 1. Purpose

Certaines cartes du jeu ont une forme physique hexagonale (tuiles de terrain, hexagones de quête…). Aujourd'hui tous les layouts sont rectangulaires — il est impossible de composer visuellement un contenu dont la forme finale est un hexagone, ni d'exporter une image correctement découpée.

Ce TSD ajoute un type de layout `hexagon` : le canvas de l'éditeur est masqué en hexagone, les atomes restent positionnés dans le rectangle englobant, et l'export PNG/PDF découpe au contour hexagonal.

---

## 2. Scope & boundaries

### In scope
- Nouveau champ `shape` sur la table `layouts` (`'rectangle'` | `'hexagon'`)
- Canvas éditeur : clip-path SVG hexagonal affiché quand `shape === 'hexagon'`
- Halo grisé hors du clip pour montrer la zone inactive (idem Figma)
- Proportions forcées en création : hauteur = largeur × (2/√3) ≈ largeur × 1.1547 (hexagone pointy-top, convention standard du jeu)
- Grille de snap conservée, drag & resize inchangés (l'atome peut déborder du clip, c'est voulu)
- Export PNG et PDF : clip au polygone hexagonal, fond transparent hors du contour
- Option dans la modale de création de layout : checkbox "Forme hexagonale"
- PropertiesPanel du layout : afficher les dimensions en lecture seule et rappeler la contrainte de ratio

### Out of scope
- Hexagone flat-top (non utilisé dans ce jeu)
- Grille de tuiles hexagonales (composition de plusieurs hexagones) — voir éventuel TSD futur
- Clip non-hexagonal (cercle, losange…)
- Atome `hexTile` lui-même — il reste inchangé, il s'utilise *à l'intérieur* d'un layout rectangulaire

---

## 3. UX & interaction design

### Primary flow — création d'un layout hexagonal
1. L'utilisateur ouvre **LayoutsView** et clique « + Nouveau layout ».
2. Dans la modale de création, il coche **« Forme hexagonale »**.
3. Le champ `hauteur` se grise et devient calculé automatiquement (`hauteur = largeur × 1.1547`). Largeur par défaut : **40 mm** (taille standard des hexagones du jeu).
4. Il valide → layout créé avec `shape = 'hexagon'`.

### Primary flow — édition
5. L'éditeur affiche le canvas avec un **masque hexagonal** (polygone SVG en clip-path).
6. La zone hors du clip est affichée avec un **fond grisé semi-transparent** (overlay), pour indiquer visuellement la découpe finale.
7. Tout le reste de l'éditeur fonctionne normalement : drag, resize, snap, calques, PropertiesPanel.
8. Un badge **⬡ Hexagonal** apparaît dans le header du canvas à côté des dimensions.

### Primary flow — export
9. Lors de l'export PNG (`GET /api/export/layout/:id/png`) : sharp découpe l'image au polygone hexagonal, fond transparent.
10. Lors de l'export PDF : chaque page hexagonale est dessinée avec un chemin de découpe.

### Visual states
```
┌─────────────────────────────────────────┐
│  [canvas zone]                          │
│        ╱▔▔▔▔▔▔▔▔▔╲                     │
│       ╱  contenu   ╲     ← zone active  │
│      │   éditable   │                   │
│       ╲   (hex)    ╱                    │
│        ╲▁▁▁▁▁▁▁▁▁╱                     │
│   (zones grisées = hors clip)           │
└─────────────────────────────────────────┘
```

- **Canvas normal** : fond damier dans le clip, gris semi-transparent hors clip
- **Sélection d'atome** : poignées normales, même si l'atome déborde légèrement du clip
- **Export** : seul le contenu dans le clip est rendu (transparent ailleurs)

---

## 4. Data model

### Table `layouts` — nouveau champ

```sql
ALTER TABLE layouts ADD COLUMN shape TEXT NOT NULL DEFAULT 'rectangle';
-- Valeurs : 'rectangle' | 'hexagon'
-- Migration idempotente : try { ... } catch {}
```

### Géométrie hexagonale (frontend, pas stockée)

```js
// Hexagone pointy-top inscrit dans le rectangle width_mm × height_mm
// height_mm = width_mm * (2 / Math.sqrt(3))  — ratio forcé à la création
//
// Les 6 sommets en % du rectangle englobant :
const HEX_POINTS_PCT = [
  [50,  0  ],  // haut centre
  [100, 25 ],  // haut droite
  [100, 75 ],  // bas droite
  [50,  100],  // bas centre
  [0,   75 ],  // bas gauche
  [0,   25 ],  // haut gauche
]
// Utilisé pour clip-path SVG dans EditorCanvas et AtomRenderer (export)
```

### Store éditeur (`editor.js`)

Aucun changement de structure : `currentLayout.shape` est déjà disponible via la réponse API existante.

---

## 5. API changes

### `POST /api/layouts` — champ optionnel ajouté
- **Request body :** `{ ..., "shape": "hexagon" | "rectangle" }` (optionnel, défaut `'rectangle'`)
- **Response :** `{ ..., "shape": "hexagon" }` — champ retourné dans tous les GET/POST/PATCH

### `PATCH /api/layouts/:id`
- Accepte `shape` dans le body (même valeurs).
- N/A — on ne prévoit pas de changer la forme d'un layout existant (trop destructif), mais le champ reste patchable pour corriger une erreur.

### `GET /api/export/layout/:id/png` *(TSD-009)*
- Nouveau comportement si `shape === 'hexagon'` : sharp composite avec un masque SVG hexagonal avant retour.
- Fond = transparent (PNG avec canal alpha).

### `GET /api/export/layout/:id/pdf` *(TSD-009)*
- Nouveau query param optionnel : `?cropMarks=1`
- Si activé et `shape === 'hexagon'` : ajouter des marques de coupe autour du contour hexagonal (traits fins à 3 mm du bord, longueur 5 mm, couleur noir de repérage).
- Sans ce paramètre : export PDF normal sans marques.

Pas de nouvel endpoint.

---

## 6. Implementation steps

### DB
- [ ] Migration idempotente : `ALTER TABLE layouts ADD COLUMN shape TEXT NOT NULL DEFAULT 'rectangle'`

### Backend
- [ ] `routes/layouts.js` : inclure `shape` dans les SELECT, INSERT, PATCH
- [ ] `routes/export.js` : détecter `shape === 'hexagon'`, générer un masque SVG hexagonal, appliquer via `sharp().composite([{ input: maskSvgBuffer, blend: 'dest-in' }])` pour le PNG

### Frontend — store & utilitaires
- [ ] Créer `frontend/src/utils/hexGeometry.js` : exporter `HEX_POINTS_PCT`, `hexClipPathSvg(widthPx, heightPx)`, `isHexLayout(layout)`
- [ ] `frontend/src/stores/editor.js` : aucune modification structurelle requise

### Frontend — LayoutsView (modale de création)
- [ ] Checkbox « Forme hexagonale » dans la modale de création
- [ ] Si cochée : `height_mm` = `width_mm * (2 / Math.sqrt(3))`, champ hauteur en lecture seule
- [ ] Passer `shape: 'hexagon'` au POST

### Frontend — EditorCanvas
- [ ] Détecter `currentLayout.shape === 'hexagon'`
- [ ] Appliquer `clip-path: polygon(...)` CSS calculé à partir de `HEX_POINTS_PCT` et des dimensions px du canvas
- [ ] Overlay semi-transparent hors clip : `<div>` positionné en absolu au-dessus du canvas avec le même clip-path inversé (ou `SVG mask`)
- [ ] Badge ⬡ dans le header canvas

### Frontend — export (si export front-side)
- [ ] Si export géré côté frontend (canvas HTML → blob), appliquer le clip SVG avant capture

### Frontend — export PDF
- [ ] Ajouter une checkbox « Marques de coupe » dans l'UI d'export PDF (visible uniquement si le layout est hexagonal)
- [ ] Passer `?cropMarks=1` à l'API si cochée

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Utilisateur crée un hexagone avec largeur 0 | Bloquer la validation, afficher erreur inline |
| Ratio forcé donne une hauteur avec décimales | Arrondir à 0.1 mm (1 décimale) |
| Atome positionné en dehors du clip | Autorisé — l'overlay signale visuellement la zone inactive, mais l'atome reste modifiable |
| PATCH `shape` sur un layout existant avec des atomes | Autorisé — les positions des atomes ne changent pas, l'utilisateur repositionne manuellement |
| Export PNG d'un layout hexagonal sans canal alpha (JPEG) | Retourner une erreur 400 — seul PNG supporte la transparence pour le clip hex |
| Layout hexagonal en recto/verso | Les deux faces ont le même clip ; le shape est hérité du layout parent |

---

## 8. Acceptance criteria

- [ ] Un layout créé avec « Forme hexagonale » a `shape = 'hexagon'` en DB
- [ ] Le canvas de l'éditeur affiche un clip hexagonal visible (fond grisé hors clip)
- [ ] Les atomes peuvent être placés et bougés normalement dans le canvas hexagonal
- [ ] L'export PNG du layout hexagonal produit une image avec fond transparent hors du contour hex
- [ ] L'export PDF avec `?cropMarks=1` affiche des marques de coupe autour du contour hexagonal
- [ ] Un layout rectangulaire existant n'est pas impacté
- [ ] Le ratio hauteur/largeur est automatiquement respecté à la création (tolérance ± 0.1 mm)
- [ ] Le badge ⬡ est visible dans le header de l'éditeur

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [x] Q1 — Taille standard souhaitée pour les hexagones du jeu ? → **40 mm de largeur** (2026-03-13)
- [x] Q2 — L'export PDF doit-il inclure des marques de coupe ? → **Oui, en option** (`?cropMarks=1`) lors de l'export PDF (2026-03-13)

---

## 11. Notes & références

- Géométrie hexagonale pointy-top : largeur = √3 × R, hauteur = 2R. Avec largeur = 40 mm → R ≈ 23.09 mm, hauteur ≈ 46.19 mm (arrondi à 46.2 mm)
- L'atome `AtomHexTile.vue` utilise déjà ce ratio (viewBox 100×115 ≈ 1:1.15 ≈ 1:2/√3) — cohérent
- sharp masking : `sharp().composite([{ input: '<svg>…</svg>', blend: 'dest-in' }])` — fonctionne en PNG avec canal alpha
- Clip-path CSS : `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)` — valable pour un hexagone pointy-top inscrit dans son rectangle englobant
