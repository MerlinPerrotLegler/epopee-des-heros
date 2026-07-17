# TSD-024 — Ornements de coins sur l’atome Cadre

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Done                                       |
| Author      | @merlinperrot                              |
| Created     | 2026-07-17                                 |
| Last update | 2026-07-17                                 |
| Depends on  | TSD-003 (atomes visuels)                   |

---

## 1. Purpose

L’atome `cadre` dessine un rectangle calligraphique (traits + titre optionnel) sans ornements de coin. Pour les cartes fantasy, il faut pouvoir ajouter de petites formes décoratives aux quatre coins (étoile, rond, carré, triangle), avec une forme commune et la possibilité de masquer certains coins.

---

## 2. Scope & boundaries

### In scope
- Formes SVG remplies aux coins du cadre : `star4`, `star5`, `circle`, `square`, `triangle`, plus `none`
- Forme unique pour tous les coins visibles (`cornerShape`)
- Taille réglable en mm (`cornerSize`) ; couleur = `params.color` du cadre
- Visibilité individuelle par coin (`cornerTL`, `cornerTR`, `cornerBL`, `cornerBR`)
- Exposition dans PropertiesPanel, paramHelp, et config atomes via `defaultParams`
- Défaut à la création : `star4`, taille 2 mm, 4 coins visibles

### Out of scope
- Forme différente par coin
- Couleur dédiée aux coins (`cornerColor`)
- Style calligraphique des ornements (moteur `frameStrokes`)
- Atome séparé « coin »
- Animation / interaction sur les formes

---

## 3. UX & interaction design

### Primary flow
1. L’utilisateur place un atome Cadre → les 4 coins affichent déjà une étoile 4 branches.
2. Dans le panneau propriétés, il change `cornerShape` (select) → toutes les formes visibles se mettent à jour.
3. Il ajuste `cornerSize` (mm) → les formes redimensionnent.
4. Il décoche un coin (ex. `cornerTR`) → ce coin disparaît ; les autres restent.

### Secondary interactions
- `cornerShape = none` → aucun ornement, quel que soit l’état des booléens.
- Tooltips via `paramHelp` sur chaque nouveau param.

### Visual states
- Forme active + coin true → forme rendue
- Forme active + coin false → pas de forme sur ce coin
- `cornerShape = none` → aucun ornement
- Cadres existants sans params → mêmes défauts que la création (`star4` + 4 coins)

---

## 4. Data model

Pas de table DB. Params JSON sur l’élément cadre :

```json
{
  "cornerShape": "star4",
  "cornerSize": 2,
  "cornerTL": true,
  "cornerTR": true,
  "cornerBL": true,
  "cornerBR": true
}
```

| Param | Type | Défaut | Valeurs |
|-------|------|--------|---------|
| `cornerShape` | string | `"star4"` | `none` \| `star4` \| `star5` \| `circle` \| `square` \| `triangle` |
| `cornerSize` | number (mm) | `2` | > 0 |
| `cornerTL` / `TR` / `BL` / `BR` | boolean | `true` | — |

Migration : aucune ALTER. Les layouts sans ces clés utilisent les défauts au rendu (`??` / `defaultParams`).

---

## 5. API changes

N/A — pas de changement backend. Les params sont déjà persistés dans la définition JSON du layout/composant.

---

## 6. Implementation steps

1. Ajouter les 6 params dans `cadre.defaultParams` (`atoms/index.js`).
2. Ajouter tooltips dans `paramHelp.js`.
3. Ajouter `cornerShape` dans `ENUM_MAPS` (`PropertiesPanel.vue`).
4. Dans `AtomCadre.vue` : générer et dessiner les formes SVG aux 4 coins (après les traits), centrées sur `(pad, pad)` etc., taille `cornerSize * SCALE`, fill = `strokeColor`, triangle orienté vers l’extérieur.
5. Vérifier manuellement : création, changement de forme, masquage d’un coin, resize du cadre, export/preview si applicable.

---

## 7. Acceptance criteria

- [x] Nouveau cadre affiche `star4` sur les 4 coins
- [x] Changer `cornerShape` met à jour les coins visibles
- [x] `cornerSize` redimensionne les formes en mm
- [x] Couleur des formes = couleur du trait du cadre
- [x] Décocher un coin le masque sans affecter les autres
- [x] `none` masque tous les ornements
- [x] Cadres anciens sans params se comportent comme le défaut
- [x] Params visibles dans PropertiesPanel et config atomes

**Note (QA résiduelle)** : la smoke QA navigateur (création cadre, changement forme/taille, masquage coin dans l’éditeur) a été reportée — login bloqué en session. Couverture actuelle : chemins code (`cornerOrnaments.js`, `AtomCadre.vue`), tests unitaires géométrie/défauts, câblage PropertiesPanel + config atomes.

---

## 8. Open questions

Aucune — décisions validées en design :
- Approche SVG remplie dans `AtomCadre.vue`
- Forme commune + masquage par coin
- Taille réglable, couleur héritée
- Défaut décoratif immédiat (`star4`)
