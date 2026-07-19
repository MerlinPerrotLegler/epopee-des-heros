# Design — Atome Plan (spec 2)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Approved (pending user file review)        |
| Date        | 2026-07-19                                 |
| Depends on  | Spec 1 — Track textures (`Chemin/Track`)   |
| Scope       | Atome `plan`, groupe lié, panneau DnD tuiles |

---

## 1. Goal

Permettre de construire un **plan** en posant des cases (textures Track) les unes à côté des autres sur le layout.

- Sélection du Plan (ou d’une tuile liée) → panneau à droite : catalogue filtrable + DnD
- Chaque case est un atome `image` autonome après création (resize, rotate, z-index)
- Z-order entre tuiles : Cmd/Ctrl+[ et ] (`nudgeItemInStack` existant)

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Contenu des cases | Textures Track du catalogue (`textureId` + `mediaId`) |
| Stockage | Groupe canvas + enfants (tuiles = fils du groupe, frères entre elles) |
| Type tuile | Atome `image` réutilisé |
| Trigger panneau | Atome `plan` réel (pas seulement un groupe nommé) |
| Lien Plan ↔ groupe | `params.tileGroupId` ; groupe créé avec le Plan |
| Visibilité panneau | Plan **ou** tuile `image` du groupe lié |
| Drop | Snap grille ; point de drop en mm carte |
| Taille défaut | Hauteur mm dans le panneau ; largeur auto (ratio pixels texture) |
| Après création | Tuile autonome (W/H/rotation libres) ; rectangulaire OK |
| Approche | Atome `plan` + groupe lié + tuiles `image` |

---

## 3. Data model

### 3.1 Atome `plan`

```js
// atoms/index.js
plan: {
  label: 'Plan',
  icon: '▦',
  defaultParams: {
    tileGroupId: null,   // id du groupe lié (posé à la création)
    guideVisible: true,  // contour guide éditeur
  },
  defaultSize: { width_mm: 40, height_mm: 40 },
}
```

### 3.2 Création

Quand l’utilisateur ajoute un Plan depuis la palette :

1. Créer un `group` (`kind: 'group'`, nom ex. `Plan`)
2. Créer l’élément `plan` **enfant** de ce groupe, avec `tileGroupId = group.id`
3. Sélectionner l’atome `plan` → panneau cases visible

Structure :

```
group (Plan)
  ├── element plan (tileGroupId → group.id)
  ├── image (tuile)
  └── image (tuile) …
```

### 3.3 Tuiles

Éléments `image` enfants du même groupe :

| Champ | Rôle |
|-------|------|
| `params.mediaId` | UUID média (rendu `/uploads/…`) |
| `params.textureId` | Id logique Track (traçabilité / filtre) |
| `width_mm` / `height_mm` | Taille autonome après pose |
| `rotation` | Rotation élément (existant) |
| `x_mm` / `y_mm` | Position carte |

Ordre dans `group.children` = z-index relatif. **V1 :** l’atome `plan` reste le premier enfant et n’est pas nudgé avec les tuiles ; Cmd/Ctrl+[ ] agit sur une `image` sélectionnée (réordonnancement parmi les frères `image`, ou parmi tous les enfants sauf le marqueur `plan`).

---

## 4. Panneau cases (UI)

### 4.1 Affichage

Visible quand :

- `selectedElement.atomType === 'plan'`, ou
- sélection = `image` dont le parent group id === un `plan.params.tileGroupId` du layout

Dock : panneau droit dédié (contextuel), sans empêcher l’édition des props de la tuile sélectionnée.

### 4.2 Contenu

- Filtres : type Track (+ tags optionnels)
- Grille miniatures (`api.getTrackTextures`)
- Champ **hauteur mm** (défaut prochaine pose) — largeur affichée en lecture seule = `height × (width_px / height_px)` ; si px manquants → largeur = hauteur
- Hints orientation upload (droit L→R, coin haut→gauche, impasse haut)

### 4.3 DnD

1. Drag miniature → drop sur canvas
2. `clientPointToCardMm` + `store.snap`
3. Créer `image` dans `group.children` :
   - `height_mm` = valeur panneau
   - `width_mm` = hauteur × ratio texture
   - `mediaId` / `textureId` depuis la texture
   - `x_mm`/`y_mm` = drop snappé (**V1 : coin haut-gauche au point snappé**)
4. Sélectionner la nouvelle tuile

Pas d’application des `margins` Track à la pose (réservés Track/CardTrack) — YAGNI V1.

---

## 5. Interactions canvas

- Move / resize / rotate : comportement atome standard
- Cmd/Ctrl+[ / ] : `nudgeItemInStack` sur la tuile sélectionnée (parmi les frères `image` ; ignorer l’enfant `plan` marqueur)
- Snap grille éditeur uniquement (pas de snap magnétique tuile↔tuile en V1)

---

## 6. Rendu

- **Tuiles** : rendu `AtomImage` inchangé
- **Plan** : si `guideVisible`, contour pointillé de la bbox en éditeur ; masqué en preview print / export DOM

---

## 7. Edge cases

| Cas | Comportement |
|-----|----------------|
| Groupe `tileGroupId` introuvable | Recréer un groupe vide + mettre à jour `tileGroupId`, ou désactiver DnD avec message |
| Suppression atome `plan` | Supprimer le **groupe lié entier** (tuiles incluses) |
| Suppression d’une tuile seule | OK |
| Suppression du groupe | Tout part (Plan + tuiles) |
| Texture sans dimensions px | `width_mm = height_mm` |

---

## 8. Out of scope

- Mélanger / voisins / Propager sur le Plan
- Snap entre tuiles
- Multi-sélection Plan
- Modification des margins Track à la pose
- Atome `planTile` dédié

---

## 9. Files to touch (indicative)

| File | Change |
|------|--------|
| `frontend/src/atoms/index.js` | Registre `plan` |
| `frontend/src/atoms/components/AtomPlan.vue` | Guide rendu |
| `frontend/src/atoms/paramHelp.js` | Aides |
| `frontend/src/components/editor/AtomRenderer.vue` | Register |
| `frontend/src/stores/editor.js` | `addPlan()` ; delete cascade ; nudge skip plan marker |
| `frontend/src/components/editor/PlanTilesPanel.vue` | Nouveau panneau |
| Shell éditeur (`EditorView` / layout) | Afficher panneau selon sélection |
| `frontend/src/components/editor/EditorCanvas.vue` | Drop target DnD |
| `specs/WORKPLAN.md` | Journal |

---

## 10. Acceptance

1. Ajouter Plan → un groupe + atome `plan` liés (`tileGroupId`).
2. Sélection Plan ou tuile liée → panneau cases (filtre type, hauteur, largeur auto).
3. DnD → `image` snappée dans le groupe avec `mediaId`/`textureId` et proportions.
4. Après pose : resize / rotate / Cmd+[ ] autonomes.
5. Preview/print : pas de panneau ; guide Plan masqué.
6. Supprimer le Plan → groupe + tuiles supprimés.
