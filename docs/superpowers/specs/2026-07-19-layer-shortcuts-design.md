# Design — Raccourcis clavier calques (Dupliquer / Supprimer)

| Field       | Value                |
|-------------|----------------------|
| Status      | Approved (pending file review) |
| Date        | 2026-07-19           |
| Depends on  | Éditeur layout / composants (store `editor.js`) |

---

## 1. Goal

Ajouter des raccourcis clavier pour agir sur le **calque sélectionné** dans le panneau (`selectedItemId`) :

1. **Ctrl/Cmd+D** → dupliquer (élément ou groupe)
2. **Delete** ou **Backspace** → supprimer (sans confirmation)

---

## 2. Decisions

| Question | Choice |
|----------|--------|
| Cible duplication | **C** — `selectedItemId` (élément **ou** groupe) |
| Touches suppression | **B** — Delete **et** Backspace |
| Approche | **1** — handlers dans `EditorView` / `ComponentEditorView` + `duplicateItem` store |

---

## 3. Behavior

| Shortcut | Action | Guards |
|----------|--------|--------|
| Ctrl/Cmd+D | `duplicateItem(selectedItemId)` | Pas focus INPUT/TEXTAREA/SELECT ; éditeur éditable |
| Delete / Backspace | `removeItem(selectedItemId)` | Idem |

- `preventDefault` sur Ctrl/Cmd+D (évite le bookmark navigateur).
- Pas de confirmation (aligné sur le bouton ✕ du `LayerPanel`).
- Remplace le Delete actuel qui appelait seulement `removeElement(selectedElementId)`.

### Duplicate semantics

**Élément** (`kind === 'element'` ou équivalent sans enfants groupe) :

- Clone JSON profond
- Nouvel `id` (UUID)
- `x_mm += 2`, `y_mm += 2`
- `nameInLayout` → `${nameInLayout}_copy` si non vide
- Inséré juste après l’original dans le même parent
- Sélectionne le clone (`selectedElementId` + `selectedItemId`)

**Groupe** :

- Clone profond ; chaque nœud (groupe / élément) reçoit un nouvel `id`
- Chaque enfant **élément** est offset de `+2 mm` en x/y (récursif)
- Inséré juste après le groupe original
- Sélectionne le groupe clone (`selectedItemId` ; `selectedElementId` cleared ou null)

`assertEditable()` / lock lecture seule → no-op.

---

## 4. Technique

| Piece | Change |
|-------|--------|
| `frontend/src/stores/editor.js` | Ajouter `duplicateItem(id)` ; `duplicateElement` délègue à `duplicateItem` (rétrocompat) |
| `frontend/src/views/EditorView.vue` | Ctrl/Cmd+D ; Delete/Backspace → `removeItem` |
| `frontend/src/views/ComponentEditorView.vue` | Même logique |

Pas de migration DB. Pas de nouveau composable (approche 1).

---

## 5. Out of scope

- Bouton UI « Dupliquer » dans le panneau calques
- Multi-sélection
- Raccourci Cut/Copy/Paste presse-papiers

---

## 6. Manual test

1. Sélectionner un élément → Cmd/Ctrl+D → clone décalé, sélectionné.
2. Sélectionner un groupe → Cmd/Ctrl+D → groupe + enfants clonés (nouveaux IDs), sélection du groupe.
3. Delete / Backspace sur élément et sur groupe → disparition + désélection.
4. Focus dans un champ propriétés → raccourcis **ignorés**.
5. Mode lecture seule / lock non tenu → no-op.
