# Design — Rendu carte en CSS mm + viewport scale/translate

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Approved (pending user file review)        |
| Date        | 2026-07-18                                 |
| Supersedes  | Partie « affichage » de TSD-022 (données mm conservées ; pipeline zoom remplacé) |
| Related     | TSD-001 (canvas), TSD-022 (mm physiques données), TSD-023 (guides) |

---

## 1. Goal

Refaire le pipeline d’affichage pour que :

1. **Toutes** les tailles / placements / offsets / polices liés à la carte (et utiles à l’impression) soient en **mm réels** dans le DOM (`4.5mm`, pas `px × zoom`).
2. Le zoom et le défilement de la zone de travail passent uniquement par **`transform: translate(...) scale(...)`** sur un wrapper viewport.
3. Le texte ne « bouge » plus au zoom (cause actuelle : chaque atome recalcule `mmToPx(mm * zoom)` indépendamment → dérive / arrondis).
4. Éditeur, preview et impression partagent la **même source de rendu mm**.

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Douleur principale | Texte qui bouge au zoom → impression non fiable (+ unités / preview / print) |
| Base DOM carte | **A** — unités CSS `mm` natives |
| Périmètre | **C** — éditeur + preview + pipeline print/PDF (même source) |
| Impression | Navigateur `window.print` / `@media print` ; carte seule à `scale(1)` |
| Multi-cartes print | Chaque zone carte = bloc atomique (`break-inside: avoid`) |
| Export PDF | Même DOM mm comme source ; techno html→PDF **plus tard** |
| Approche | **1** — CSS mm + viewport `scale`/`translate` |
| Chrome éditeur (grille, guides, handles) | **Dans** la zone mm (même calque scalé) — pas de compensation `scale(1/zoom)` |
| Drag & drop | Conservé |
| Mapping souris | Via `getBoundingClientRect()` de la surface carte → mm |

---

## 3. Architecture

Deux couches strictement séparées :

```
┌─ Viewport (écran) ─────────────────────────────────┐
│  transform: translate(panX, panY) scale(zoom)      │
│  ┌─ Monde carte (CSS mm) ────────────────────────┐ │
│  │  surface : width/height en mm                 │ │
│  │  éléments : left/top/width/height en mm       │ │
│  │  atomes : fontSize, padding, gaps… en mm      │ │
│  │  grille, snap visuel, guides, handles en mm   │ │
│  │  AUCUN facteur zoom dans les styles carte     │ │
│  └───────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

### Règles

1. **Données (store / JSON)** : nombres en mm (`x_mm`, `fontSize: 4.5`, `snapGrid`, etc.) — inchangé vs TSD-022.
2. **Rendu carte** : `n` → `` `${n}mm` ``. Jamais `px` pour une longueur carte. Jamais × zoom.
3. **Zoom / pan** : uniquement sur le wrapper viewport.
4. **Monde carte unifié** : grille, guides, poignées, éléments, atomes = même calque mm scalé.
5. **Print** : chrome app masqué ; transform viewport annulé (`scale(1)`) ; seules les zones carte visibles.

### Note navigateur

Sur écran, CSS `mm` est mappé via la référence CSS (~96 dpi) : ce n’est pas un mm physique mesurable à la règle sur tous les moniteurs. La fidélité physique vise surtout **l’impression**. Le gain immédiat est la **stabilité du layout** (texte + boîtes scalés ensemble).

---

## 4. Rendu atomes + helpers

### Helper carte

```js
function mm(n) {
  return `${n}mm`
}
```

Remplace l’usage de `mmToPx` / `useAtomScale` pour le **rendu** des longueurs carte.

### Changements

- Retirer la prop `zoom` de `AtomRenderer`, atomes, et `useAtomScale` (rendu).
- Longueurs linéaires → `mm(...)`.
- Ratios unitless inchangés : `lineHeight`, `opacity`, `diceScale`, `fontWeight`, etc.
- Positions relatives `%` (`posX` / `posY` backgrounds) inchangées.
- Preview cartes : même pipeline de styles mm (pas de zoom dans les tailles).

### Ce qui reste pour les px écran

- Conversion **pointeur** écran → mm carte (interaction uniquement).
- UI hors carte (toolbar, panneaux latéraux) : px CSS normaux, hors wrapper.

---

## 5. Interactions

### Souris → mm

Drag, resize, sélection, dessin : convertir via la surface carte déjà transformée :

```
mmX = (clientX - rect.left) / rect.width  × cardWidthMm
mmY = (clientY - rect.top)  / rect.height × cardHeightMm
```

Puis snap / déplacement purement en mm.

### Pan viewport

Reste en px écran (déplacement du wrapper), pas en mm carte.

### Zoom molette

Modifie `store.zoom` ; le wrapper applique `scale(zoom)`. Optionnel : zoom centré sur le curseur (ajuste `pan` en conséquence).

### Flèches clavier / snap / grille

Pas de mm→px→mm. Incréments et grille en **mm** dans le store ; rendu grille en CSS mm dans le calque carte.

### Guides (TSD-023)

Dessinés dans le calque mm (coordonnées mm). Scalent avec le viewport comme le reste.

### Handles de sélection

Dans le calque mm (dimensions en mm). Scalent avec le zoom — pas de `scale(1/zoom)`.

---

## 6. Preview + impression

### Preview

Même rendu mm que l’éditeur. Si zoom UI preview : wrapper `scale` uniquement.

### Print (`@media print` / `window.print`)

1. Masquer chrome (toolbar, panneaux, poignées, grille, guides).
2. Viewport : `transform: none` (carte à scale 1).
3. Afficher uniquement les surfaces carte (dimensions CSS mm = format cible).
4. **Multi-cartes** : chaque zone carte a `break-inside: avoid` (et page-break entre cartes si besoin) pour qu’une carte ne soit jamais coupée sur deux pages.

### Export PDF

Hors implémentation immédiate. Contrat : **même DOM carte mm** comme source. Techno (html→PDF) à décider plus tard.

---

## 7. Migration

| Sujet | Action |
|-------|--------|
| Données layouts / composants | Aucune re-conversion (déjà mm, TSD-022) |
| `useMmScale(zoom)` rendu | Remplacé par `mm()` CSS pour le monde carte |
| `useAtomScale` + prop `zoom` | Retirés du rendu atomes |
| `EditorCanvas` | Positions éléments en `mm` CSS ; wrapper `translate`+`scale` |
| CardPreview / print | Alignés sur le même pipeline |

---

## 8. Out of scope (immédiat)

- Choix et implémentation d’une lib html→PDF
- Calibration DPI écran « vrai mm physique à la règle »
- Changement du modèle de données (`x_mm`, etc.)

---

## 9. Acceptance criteria

- [ ] Zoom in/out : le texte ne dérive plus par rapport aux boîtes / cadres
- [ ] Panneau propriétés : valeurs mm stables quel que soit le zoom
- [ ] Grille, snap, guides, handles, flèches : mm, dans la zone carte
- [ ] Drag & drop / resize fonctionnels via mapping `getBoundingClientRect`
- [ ] Preview = même rendu mm que l’éditeur
- [ ] Print : chrome masqué ; cartes à scale 1 ; chaque carte non coupée (`break-inside: avoid`)
- [ ] Aucune longueur carte rendue via `mm * zoom` en px

---

## 10. Implementation sketch (non exhaustif)

Ordre suggéré pour le plan d’implémentation :

1. Helper `mm()` (rendu carte) ; utilitaire `clientPointToCardMm(el, clientX, clientY, cardWmm, cardHmm)` via `getBoundingClientRect`
2. `EditorCanvas` : wrapper `translate`+`scale` ; surface et éléments en CSS mm
3. Atomes : retirer zoom ; styles en `mm()`
4. Drag / resize / drawing : mapping rect → mm
5. Grille / guides / handles dans le calque mm
6. CardPreview aligné
7. Styles `@media print` + multi-cartes `break-inside: avoid`
8. Purge dead code `mmToPx×zoom` côté rendu + MAJ TSD-022 / guidelines
