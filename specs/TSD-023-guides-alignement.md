# TSD-023 — Guides d’alignement (placement layout)

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Done                         |
| Author      | @merlinperrot                |
| Created     | 2026-07-17                   |
| Last update | 2026-07-17                   |
| Depends on  | TSD-001 (éditeur canvas)     |

---

## 1. Purpose

Lors du placement d’atomes et de composants sur un layout, le designer a besoin d’aides visuelles (centres de carte, alignements entre éléments, marges, cadres) pour positionner précisément — sans magnétisme automatique. Les guides s’affichent uniquement pendant un geste de déplacement/redimensionnement, et chaque famille de guide est activable indépendamment.

---

## 2. Scope & boundaries

### In scope
- Guides **affichage seul** (pas de magnétisme / snap vers les guides)
- Centres du **layout** (milieu horizontal + milieu vertical de la carte)
- Alignement **bords à bords** avec les autres éléments (left / right / top / bottom)
- Alignement **centres à centres** avec les autres éléments (centre H / centre V)
- Affichage des **marges** au voisin le plus proche (H/B/G/D) + mise en évidence si marges opposées égales
- Affichage des **cadres** des autres éléments non lockés / visibles pendant le geste
- Activation pendant **drag**, **resize** et **flèches clavier**
- Deux seuils pour les lignes d’alignement :
  - **visibilité** : ligne proche si `|Δ| ≤ 3 mm` — style selon source : **dashed** (centres layout/éléments), **dotted** (bords)
  - **aligné / actif** : ligne **solid** 1 px si `|Δ| < snapGrid` (pas de grille courant, ex. 1 mm)
  - Toutes les lignes d’alignement : **stroke-width 1 px** (écran)
- Marges vers les éléments **proches** en horizontal **et** vertical (voisins H/B/G/D)
- Menu toolbar « Guides » avec toggles par option
- Persistance des préférences en `localStorage`
- Même comportement en mode layout et mode composant (éditeur canvas)

### Out of scope
- Magnétisme / snap soft vers les guides (le snap grille mm existant reste inchangé)
- Égalisation automatique d’espacement (distribution)
- Guides persistants hors geste
- Alignement multi-sélection (une seule sélection active aujourd’hui)
- Centre géométrique du polygone hexagonal (on utilise le centre de la bbox layout)

---

## 3. UX & interaction design

### Primary flow — déplacement souris
1. L’utilisateur commence un drag (ou resize) sur un élément non locké.
2. Si au moins une option Guides est active, l’overlay apparaît.
3. À chaque move, le système recalcule les guides pour la bbox courante.
4. Si un bord/centre est à ≤ **3 mm** d’une cible : ligne **dashed** (centre) ou **dotted** (bord) ; si `|Δ| < snapGrid` : ligne **solid** (actif). Toutes en 1 px.
5. Si Marges est actif : traits de cote + labels `N.N mm` vers les éléments **proches** en horizontal et vertical (voisin le plus proche de chaque côté H/B/G/D) ; style « égal » si L≈R ou T≈B (`|gapA - gapB| < snapGrid`).
6. Si Cadres est actif : outline dashed sur chaque élément candidat.
7. Au mouseup, l’overlay disparaît.

### Primary flow — flèches clavier
1. L’utilisateur déplace la sélection avec les flèches.
2. Mêmes guides que pour le drag.
3. L’overlay reste visible tant que les flèches sont utilisées ; disparaît ~300 ms après le dernier keyup (ou au prochain geste non lié).

### Secondary — menu Guides
1. Bouton « Guides » dans la toolbar (près de Grille / Snap).
2. Ouvre un petit panneau avec 5 cases à cocher (voir tableau).
3. Un master implicite : si toutes les options sont off, aucun overlay même pendant un geste.

### Options (toggles)

| Clé store / localStorage | Label UI | Défaut | Effet |
|--------------------------|----------|--------|--------|
| `layoutCenters` | Centres layout | on | Croix milieu H/V de la carte |
| `elementEdges` | Bords ↔ éléments | on | Alignement left/right/top/bottom |
| `elementCenters` | Centres ↔ éléments | on | Alignement centre H/V entre éléments |
| `margins` | Marges | on | Distance voisins proches H/V + highlight égalité |
| `frames` | Cadres éléments | on | Contours des candidats |

Clé `localStorage` : `card-designer.guideOptions` (JSON objet des 5 booléens).

### Visual states

| État | Description |
|------|-------------|
| Hors geste | Pas d’overlay |
| Geste, aucune option | Pas d’overlay |
| Geste + option | Overlay SVG `pointer-events: none` |
| Proche centre (≤3 mm, `|Δ| ≥ snapGrid`, source layout/center) | Ligne **1 px dashed**, couleur accent atténuée |
| Proche bord (≤3 mm, `|Δ| ≥ snapGrid`, source edge) | Ligne **1 px dotted**, couleur accent atténuée |
| Aligné / actif (`|Δ| < snapGrid`) | Ligne **1 px solid**, couleur accent |
| Marge normale | Trait fin + label mm (voisins H et V) |
| Marges opposées égales | Trait/label plus vif (même teinte accent) |
| Cadre candidat | Outline dashed discret |

### Sketch overlay

```
┌────────── layout ──────────┐
│            │               │  ← centre V layout (si aligné)
│   ┌────┐   │               │
│   │ A  │───┼─── 3.0 mm ───│  ← marge + éventuel alignement bord
│   └────┘   │               │
│────────────┼───────────────│  ← centre H layout
│         ┌──┴──┐            │
│         │  B  │ (dashed)   │  ← cadre candidat
│         └─────┘            │
└────────────────────────────┘
```

---

## 4. Data model

Pas de changement DB / API.

```js
// store/editor.js (ou sous-objet dédié)
guideOptions: ref({
  layoutCenters: true,
  elementEdges: true,
  elementCenters: true,
  margins: true,
  frames: true,
})

// runtime (pas persisté) — état du geste
guidesActive: ref(false)
activeGuides: ref([])   // liste calculée pour l’overlay
```

Structure d’un guide calculé :

```js
// Ligne d’alignement (émise si |Δ| ≤ 3 mm)
// strong = true si |Δ| < snapGrid (solid), false sinon (dashed centre / dotted bord selon source)
{ kind: 'line', axis: 'x'|'y', position_mm: number, strong: boolean, source: 'layout'|'edge'|'center' }

// Marge
{
  kind: 'margin',
  side: 'left'|'right'|'top'|'bottom',
  from_mm: { x, y },   // point départ (bord élément actif)
  to_mm: { x, y },     // point arrivée (bord voisin)
  distance_mm: number,
  equal: boolean       // true si marge opposée ≈ égale
}

// Cadre candidat
{
  kind: 'frame',
  x_mm, y_mm, width_mm, height_mm
}
```

---

## 5. API changes

N/A — purement frontend / store local.

---

## 6. Implementation steps

- [x] Step 1 — `alignmentGuides.js` : helpers bbox, candidats, calcul lignes/marges/frames (visibilité 3 mm, strong si `|Δ| < snapGrid`)
- [x] Step 2 — store : `guideOptions`, load/save `localStorage`, `setGuideOption`, runtime `guidesActive` / `activeGuides`
- [x] Step 3 — `AlignmentGuidesOverlay.vue` : rendu SVG (lignes, marges+labels, frames)
- [x] Step 4 — brancher overlay dans `EditorCanvas.vue` (dans `card-boundary`, sous les handles)
- [x] Step 5 — brancher activation dans `useDragAndDrop.js` (start/move/end drag + resize)
- [x] Step 6 — brancher flèches dans `EditorCanvas` / `moveSelected` + clear différé
- [x] Step 7 — `GuidesMenu.vue` + bouton dans `EditorToolbar.vue`
- [x] Step 8 — tests unitaires (`alignmentGuides.test.js`, 8/8) + mise à jour WORKPLAN ; QA navigateur manuelle recommandée

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Calque `visible: false` | Élément ignoré (candidat et overlay) |
| Calque / élément locké | Ignoré comme candidat ; pas de cadre |
| Élément sélectionné | Exclu des candidats |
| Background atom non locké | Inclus comme candidat (cadres + alignements) |
| Aucun voisin dans une direction | Pas de marge de ce côté |
| Chevauchement (marge ≤ 0) | Pas de trait de marge de ce côté |
| Layout hex | Centres = `width_mm/2`, `height_mm/2` de la bbox |
| Toutes options off | Aucun overlay pendant le geste |
| Read-only / lock layout | Pas de drag ; guides non pertinents |
| Zoom extrême | Lignes en px écran (épaisseur constante à l’écran), positions en mm converties |

### Règles de calcul

**Candidats :** `allElements` filtrés : `id ≠ selected`, calque visible, non `_layerLocked`, non lock élément si applicable.

**Constantes :** `VISIBILITY_MM = 3`. Seuil strong = `snapGrid` courant du store (défaut 1 mm) : `strong` si `|Δ| < snapGrid`.

**Centres layout :**
- ligne verticale à `x = width_mm / 2` si l’une des valeurs X de l’actif (left, cx, right) est à ≤ `VISIBILITY_MM` de ce milieu
- ligne horizontale à `y = height_mm / 2` si l’une des valeurs Y (top, cy, bottom) est à ≤ `VISIBILITY_MM` de ce milieu
- `strong` si le `|Δ|` min `< snapGrid`

**Bords / centres éléments :** comparaison **all-to-all** : chaque valeur X de l’actif (left, cx, right) vs chaque valeur X du candidat ; idem pour Y. Si `|Δ| ≤ VISIBILITY_MM`, émettre une ligne à la **position du candidat** (cible), avec `strong = (|Δ| < snapGrid)`. Avec `elementEdges` off, n’utiliser que `cx`/`cy` ; avec `elementCenters` off, n’utiliser que left/right/top/bottom.

**Marges :** pour chaque côté (left, right, top, bottom), parmi les candidats qui « font face » (chevauchement projeté sur l’axe perpendiculaire), prendre le voisin **le plus proche** avec gap > 0 — donc toujours les deux axes (horizontal **et** vertical). Label arrondi 1 décimale. `equal` si `|gapLeft - gapRight| < snapGrid` (idem top/bottom).

---

## 8. Acceptance criteria

- [x] Pendant un drag, resize ou flèches, les guides configurés s’affichent *(code ; QA navigateur recommandée)*
- [x] Aucun magnétisme : la position finale n’est pas altérée par les guides (seul le snap grille existant s’applique)
- [x] Ligne d’alignement si `|Δ| ≤ 3 mm` (dashed centre / dotted bord), **solid** si `|Δ| < snapGrid` ; rien si `> 3 mm` *(calcul couvert par tests ; styles overlay)*
- [x] Centres layout H et V fonctionnent *(couvert par tests unitaires)*
- [x] Alignement bords et centres entre éléments fonctionne *(couvert par tests unitaires)*
- [x] Marges vers voisins proches H **et** V + style « égal » si L≈R ou T≈B *(couvert par tests unitaires)*
- [x] Cadres sur éléments non lockés / visibles (hors sélection) *(couvert par tests unitaires)*
- [x] Chaque toggle du menu Guides active/désactive correctement sa famille *(code ; QA navigateur recommandée)*
- [x] Préférences restaurées après reload (localStorage) *(code ; QA navigateur recommandée)*
- [x] Overlay disparait à la fin du geste *(code ; QA navigateur recommandée)*

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| — | — | — | — |

---

## 10. Open questions

Aucune — décisions figées en brainstorming (2026-07-17) + amendements auteur :
- Centres = layout only (pas centre-à-centre layout/élément comme option séparée au-delà de `elementCenters`)
- Drag + resize + flèches
- Seuils lignes : visible ≤ 3 mm (dashed centre / dotted bord), strong si `|Δ| < snapGrid` (solid 1 px)
- Marges = voisins proches H et V + highlight égalité
- UI = menu Guides (pas toggles toujours visibles)

---

## 11. Notes & references

- Related : TSD-001 (drag, resize, snap grille), toolbar `EditorToolbar.vue` (`showGrid`, `snapGrid`)
- Architecture choisie : composable `useAlignmentGuides` + overlay SVG + options store (approche isolée)
- Couleur : réutiliser `var(--accent-primary)` ou une teinte guide dédiée si contraste insuffisant sur fond blanc
)
