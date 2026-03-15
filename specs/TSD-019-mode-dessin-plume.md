# TSD-019 — Mode dessin à la plume calligraphique

| Field       | Value                                                  |
|-------------|--------------------------------------------------------|
| Status      | Ready                                                  |
| Author      | @merlinperrot                                          |
| Created     | 2026-03-13                                             |
| Last update | 2026-03-13                                             |
| Depends on  | TSD-001 (canvas éditeur), TSD-003 (atomes visuels)    |

---

## 1. Purpose

Permettre à l'utilisateur de dessiner à main levée directement sur le canvas de l'éditeur, avec des outils plume calligraphiques.

Chaque coup de plume produit un **trait de largeur variable** selon :
- l'**angle du bec** (nib angle) — un bec à 45° trace des diagonales épaisses et des horizontales fines, comme une plume sergent-major ;
- la **vitesse du geste** — plus le mouvement est lent, plus l'encre s'accumule (trait épais) ;
- la **largeur nominale** de la plume.

Les traits sont stockés comme du **SVG pur** (polygones remplis bezier) dans un atome `drawing`, exportable sans perte.

---

## 2. Scope & boundaries

### In scope
- Atome `drawing` : conteneur SVG de traits calligraphiques
- **Mode dessin** : activation par double-clic sur l'atome `drawing` sélectionné
- Algorithme calligraphique : largeur variable par point selon angle bec + direction instantanée
- Simulation de pression via la vitesse (Pointer Events `pressure` si disponible, fallback vitesse)
- Lissage des points bruts (Catmull-Rom → Bezier) avant stockage
- **5 plumes configurables** par atome (presets nommés), sélectionnables dans la toolbar de dessin
- Effaceur (supprime le dernier trait, ou Ctrl+Z)
- Annulation du dernier trait en mode dessin (Ctrl+Z)
- Rendu SVG live pendant le dessin (aperçu temps réel)
- Support souris + stylet (Pointer Events API)

### Out of scope
- Sélection / déplacement d'un trait individuel (v1 : les traits sont non sélectionnables)
- Lasso/zone d'effacement (v1 : effacement du dernier trait seulement)
- Calque de dessin indépendant du calque atom (les traits appartiennent à l'atome)
- Remplissage de zone (flood fill)
- Import de SVG externe dans l'atome drawing

---

## 3. UX & interaction design

### Ajout et activation

1. L'utilisateur ajoute un atome `drawing` depuis la palette.
2. L'atome apparaît sur le canvas (invisible tant qu'il n'a pas de traits).
3. **Un clic** → sélectionne l'atome (handles de resize, PropertiesPanel).
4. **Double-clic** → entre en **mode dessin** : le curseur devient une croix avec indicateur de plume, une mini-toolbar flottante apparaît au-dessus du canvas.

### Mode dessin (toolbar flottante)

```
[ ✏ Plume 1 ▾ ] [ 🖌 Plume 2 ▾ ] … [ 🖊 Plume 5 ▾ ]   [ ✕ Effacer dernier ]   [ ✓ Terminer ]
```

- Clic sur une plume = plume active (surlignée)
- Dessin : `pointerdown` → `pointermove` → `pointerup`
- Pendant le `pointermove` : trait en cours rendu en SVG live
- `pointerup` : trait finalisé, lissé, ajouté à `params.strokes`
- **Ctrl+Z** : supprime le dernier trait ajouté
- **Échap** ou clic en dehors = quitte le mode dessin

### Curseur de dessin

Un SVG de prévisualisation suit le curseur : représente le bec de la plume à son angle et largeur nominaux, avec la couleur de la plume active.

---

## 4. Data model

Pas de table DB. Les données sont dans `definition.layers[].params` de l'atome.

### Params de l'atome `drawing`

```json
{
  "strokes": [
    {
      "d": "M 10 20 C ...",
      "color": "#2a1a0a",
      "opacity": 0.9,
      "penIdx": 0
    }
  ],
  "pens": [
    {
      "name": "Sergent-major",
      "color": "#2a1a0a",
      "opacity": 1.0,
      "nibWidth": 1.5,
      "nibAngle": 45,
      "pressureScale": 0.6,
      "smoothing": 0.5
    },
    {
      "name": "Plume fine",
      "color": "#2a1a0a",
      "opacity": 0.85,
      "nibWidth": 0.5,
      "nibAngle": 0,
      "pressureScale": 0.3,
      "smoothing": 0.7
    },
    {
      "name": "Pinceau large",
      "color": "#2a1a0a",
      "opacity": 0.75,
      "nibWidth": 3.0,
      "nibAngle": 30,
      "pressureScale": 0.8,
      "smoothing": 0.4
    },
    { "name": "Plume 4", ... },
    { "name": "Plume 5", ... }
  ],
  "activePenIdx": 0
}
```

### Description des paramètres d'une plume

| Paramètre       | Type    | Description                                                          |
|-----------------|---------|----------------------------------------------------------------------|
| `name`          | string  | Nom affiché dans la toolbar de dessin                                |
| `color`         | string  | Couleur CSS du trait                                                 |
| `opacity`       | number  | Opacité globale (0–1)                                                |
| `nibWidth`      | number  | Largeur nominale du bec en mm (= largeur max du trait)               |
| `nibAngle`      | number  | Angle du bec en degrés (0 = horizontal, 45 = diagonal, 90 = vertical)|
| `pressureScale` | number  | Influence de la vitesse/pression sur l'épaisseur (0 = fixe, 1 = max) |
| `smoothing`     | number  | Lissage de la courbe Catmull-Rom (0 = brut, 1 = très lissé)         |

---

## 5. Algorithme calligraphique

### Principe

Pour chaque segment entre deux points consécutifs `Pi` et `Pi+1` :

1. **Direction instantanée** φ = atan2(dy, dx)
2. **Largeur calligraphique** w(φ) = nibWidth × |sin(φ − nibAngle × π/180)|
   - Trait parallèle au bec → w ≈ 0 (trait minimum, jamais 0 pour éviter les artefacts)
   - Trait perpendiculaire au bec → w = nibWidth (trait maximum)
   - Minimum garanti : nibWidth × 0.05
3. **Modulation vitesse/pression** :
   - speed = distance(Pi, Pi+1) / Δt (ou `event.pressure` si stylus)
   - factor = 1 / (1 + speed × pressureScale × 0.01)
   - w_final = w(φ) × lerp(1, factor, pressureScale)
4. **Vecteur perpendiculaire** n = (−sin(φ), cos(φ))
5. Deux points du polygone : `Pi ± n × w_final/2`

### Lissage (Catmull-Rom → Bezier)

Après collecte des points bruts :
1. Réduction Douglas-Peucker (ε = smoothing × 0.5 mm) pour supprimer les points redondants
2. Conversion Catmull-Rom en segments cubiques : les tangentes aux points de contrôle assurent la continuité C1
3. Construction du polygone final (aller : côté gauche, retour : côté droit) → path SVG `d` fermé avec `Z`

### Stockage

- Chaque trait = un path SVG `d` complet (polygone rempli)
- Couleur et opacité stockées par trait (snapshot au moment du dessin)
- Taille typique : 200–800 caractères SVG par trait, ~50 Ko pour 100 traits

---

## 6. API changes

Aucun — les traits sont du JSON pur dans la définition du layout.

---

## 7. Implementation steps

- [ ] `frontend/src/utils/calligraphyStroke.js` : `buildStroke(points, pen, scale)` → path SVG `d`
  - Algorithme complet : direction + nibAngle + pressure + Douglas-Peucker + Catmull-Rom
- [ ] `AtomDrawing.vue` : rendu SVG des traits stockés + trait en cours (prop `liveStroke`)
- [ ] `useDrawingMode.js` : composable gérant les Pointer Events, l'état du trait en cours, et l'appel à `buildStroke`
- [ ] `EditorCanvas.vue` : détection double-clic sur atome `drawing` → entrée/sortie mode dessin, transmission des pointer events
- [ ] Toolbar de dessin flottante `DrawingToolbar.vue` : sélecteur de plume, effacer dernier, terminer
- [ ] `atoms/index.js` : enregistrement `drawing` + 5 plumes par défaut
- [ ] `AtomRenderer.vue` : ajout `drawing` → `AtomDrawing`
- [ ] `PropertiesPanel.vue` : section dédiée (liste des plumes avec édition inline des params)

---

## 8. Edge cases

| Scénario | Comportement attendu |
|----------|----------------------|
| Trait très court (< 2 points) | Ignoré silencieusement |
| `nibAngle = 0` et trait horizontal | Largeur minimale garantie (nibWidth × 0.05) |
| Pointer Events non supportés (vieux navigateur) | Fallback MouseEvents, `pressure = 0.5` constant |
| Atome `drawing` redimensionné après dessin | Les traits sont en SVG relatif au viewBox → scaling transparent |
| Ctrl+Z sur un atome sans traits | Rien (pas d'erreur) |
| 500+ traits dans un atome | Rendu SVG linéaire, pas de problème de perf à cette échelle |
| Quitter mode dessin en cliquant sur un autre atome | Mode dessin fermé, atome `drawing` désélectionné |

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

*(aucune — toutes résolues)*

| Question | Décision |
|----------|----------|
| Calque de transparence | **Transparent uniquement** — pas de couleur de fond sur l'atome ; la couleur est portée par chaque trait |
| Couche de rendu | **Ordre Z normal** — l'atome `drawing` respecte sa position dans la pile de calques, positionnable librement |
| Nombre de plumes | **5 fixes** — presets nommés éditables, pas d'ajout/suppression dynamique en v1 |

---

## 11. Notes & références

- `calligraphyStroke.js` est l'utilitaire central : il est indépendant de Vue (pur JS) et peut être réutilisé pour la prévisualisation de la plume dans PropertiesPanel.
- L'algorithme de largeur calligraphique `w(φ) = nibWidth × |sin(φ − θ)|` est la même formule utilisée par Inkscape pour ses outils calligraphiques.
- Le Douglas-Peucker avec ε adaptatif (basé sur `smoothing`) évite les polygones trop complexes tout en préservant les angles vifs.
- Pointer Events API (`event.pressure`) retourne 0.5 pour la souris et une valeur réelle [0–1] pour les stylets Wacom/Surface. Le `pressureScale` permet de calibrer l'effet.
- Taille indicative d'un layout avec 50 traits : ~25 Ko JSON, parfaitement gérable par SQLite et le store Pinia.
