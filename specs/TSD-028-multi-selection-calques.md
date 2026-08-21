# TSD-028 — Multi-sélection de calques (Cmd/Ctrl)

| Field       | Value                  |
|-------------|------------------------|
| Status      | Done                   |
| Author      | @merlinperrot          |
| Created     | 2026-08-21             |
| Last update | 2026-08-21             |
| Depends on  | TSD-002, TSD-001       |

---

## 1. Purpose

Le designer doit pouvoir sélectionner plusieurs calques à la fois (éditeur layout **et** composant), puis les déplacer ensemble sur la carte ou les regrouper — comme dans un outil de design (Figma, Affinity). Aujourd’hui la sélection est unique (`selectedItemId`).

---

## 2. Scope & boundaries

### In scope
- Cmd/Ctrl + clic : bascule un calque dans la sélection (panneau Calques **et** canvas)
- Clic simple : sélection exclusive
- Clic sur un élément déjà dans la sélection : conserver le set ; drag = déplacement de tout le set ; clic sans bouger = exclusive
- Déplacement canvas (drag) et flèches : tous les racines de sélection (éléments + enfants des groupes)
- Grouper la sélection : bouton ⊞ si ≥ 2 items, raccourci Cmd/Ctrl+G
- Delete / Cmd+D : s’appliquent à toute la sélection
- Highlight canvas de tous les éléments du set (y compris enfants d’un groupe sélectionné)
- Poignées / toolbar flottante : uniquement sur l’élément primaire (`selectedElementId`)

### Out of scope
- Shift + clic plage (range select)
- Bounding box de groupe / poignées communes
- Cmd+Shift+G dégrouper
- Alignement multi-sélection (TSD-023)
- Nested-group policy au-delà de ce que l’arbre supporte déjà

---

## 3. UX & interaction design

### Primary flow — multi-sélection
1. Clic sur un calque (panneau ou canvas) → sélection exclusive
2. Cmd/Ctrl + clic sur un autre → ajout / retrait du set
3. Les lignes du panneau et les outlines canvas reflètent tout le set

### Primary flow — déplacer
1. Avec plusieurs calques (ou un groupe) sélectionnés, glisser un élément du set sur le canvas
2. Tous les éléments déverrouillés du set se déplacent du même Δ (snap sur l’élément cliqué)
3. Flèches : même Δ sur les racines de sélection (un groupe locké est ignoré)

### Primary flow — grouper
1. Sélectionner ≥ 2 calques
2. Cmd/Ctrl+G **ou** bouton ⊞ du panneau
3. Un nouveau groupe contient les items (ordre d’arbre conservé)
4. Si tous ont le même parent → le groupe est inséré à cet endroit ; sinon → niveau racine
5. Le groupe est sélectionné et développé dans le panneau

### Secondary
- ⊞ sans multi-sélection : groupe vide (comportement actuel)
- Cmd/Ctrl+clic canvas : toggle **sans** démarrer un drag
- Clic fond de canvas : vide la sélection

---

## 4. Data model

Pas de persistance. État éditeur :

| Store | Rôle |
|-------|------|
| `selectedItemIds` | array d’ids (éléments et/ou groupes) |
| `selectedItemId` | primaire (dernier cliqué, panneau propriétés / groupe ΔxΔy) |
| `selectedElementId` | élément primaire pour poignées canvas |

Racines de sélection : items du set qui ne sont pas descendants d’un autre item du set (évite de déplacer deux fois un enfant dont le groupe est aussi sélectionné).

---

## 5. API changes

N/A — pas d’endpoint. La structure `layers` est inchangée.

---

## 6. Implementation steps

- [x] Store : `selectedItemIds`, `selectItem`, racines, group/move/remove/duplicate du set
- [x] `LayerPanel` : highlight multi, Cmd/Ctrl+clic, ⊞ → grouper, DnD multi
- [x] `EditorCanvas` + `useDragAndDrop` : toggle, drag du set, outlines
- [x] `EditorView` / `ComponentEditorView` : Cmd+G, Delete/Cmd+D sur le set
- [x] Tests store

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Cmd+clic d’un déjà sélectionné | Retrait du set ; primaire = dernier restant |
| Groupe + un de ses enfants tous deux sélectionnés | L’enfant n’est pas une racine ; move/group/delete voient le groupe |
| Item verrouillé dans le set | Non déplacé (les autres oui) |
| 1 seul item + Cmd+G | No-op |
| Parents différents au groupement | Groupe créé en racine, items extraits de leurs parents |
| Drop d’un groupe dans lui-même | Ignoré |

---

## 8. Acceptance criteria

- [x] Cmd/Ctrl+clic ajoute/retire des calques (layout et composant)
- [x] Le canvas déplace tout le set
- [x] Cmd/Ctrl+G et ⊞ groupent ≥ 2 items
- [x] Delete / duplication s’appliquent au set
- [x] Clic simple reste une sélection exclusive
