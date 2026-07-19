# Design — Grille Layouts + tuile Recto/Verso liée

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| Status      | Done                                                                  |
| Date        | 2026-07-19                                                            |
| Scope       | `LayoutsView`, tuiles layout, bascule éditeur recto↔verso             |
| Out of scope| Refonte TSD-006 (2 piles de calques dans une seule `definition`)      |
| Depends on  | Modèle actuel `is_back` + `back_layout_id` (2 layouts DB liés)        |

---

## 1. Goal

1. Remettre l’affichage `/layouts` en **grille de tuiles (blocs)**, plus le mode liste actuel.
2. Traiter un couple recto + verso comme **une expérience « une carte »** sur la tuile recto (surtout quêtes) : lier le verso, basculer l’aperçu, ouvrir la face affichée — tout en **gardant** les layouts verso listés dans l’onglet Verso.
3. À chaque bascule Recto ↔ Verso (tuile aperçu côté listing n’édite pas ; **dans l’éditeur**), **enregistrer** la face courante avant d’ouvrir l’autre.

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Affichage listing | Grille / blocs (pas liste) |
| Modèle données v1 | **Approche 1** — 2 layouts DB + `back_layout_id` (pas fusion `definition`) |
| Bouton Modifier / clic éditeur | **A** — ouvre la **face affichée** sur la tuile |
| Versos liés dans onglet Verso | **B** — restent listés à part (tuile DOS) |
| Au switch de face (éditeur) | **Save** de la face courante, puis navigation vers l’autre layout |
| Config verso sur tuile | Sélecteur si **pas** de verso ; si lié → toggle Recto/Verso en tête, pas de re-config encombrante |

---

## 3. LayoutsView — grille

### 3.1 Affichage

- Remplacer `.items-list` / `.item-row` par une **grille de tuiles** (miniature, nom, badges, actions), alignée sur le design historique / `ComponentsView` si proche.
- Conserver : recherche, tri, onglets Recto | Verso, création, rename, duplicate, delete, modal config (⚙).

### 3.2 Tuile recto (onglet Recto)

```
┌─────────────────────────────┐
│ [ Recto | Verso ]  ← si back_layout_id  │
│                             │
│      miniature (face active)│
│                             │
│ Nom · type · dims           │
│ Verso: [sélecteur]  ← si !back_layout_id │
│ ⚙ ✎ ⧉ ✕                     │
└─────────────────────────────┘
```

**Sans verso lié** (`!back_layout_id`)

- Pas de toggle Recto/Verso.
- Afficher le sélecteur « Verso lié » (Aucun / liste des `is_back` / + Créer…) — comportement actuel.

**Avec verso lié** (`back_layout_id`)

- Afficher le toggle **Recto | Verso** en tête de tuile.
- Miniature = thumbnail (ou placeholder) de la **face active** du toggle.
- Ne **pas** afficher le sélecteur verso sur la tuile (évite le doublon) ; le changement de lien reste possible via **⚙ Config** (modal), où le champ verso existe déjà.
- Clic tuile / action « ouvrir éditeur » → layout id de la **face active** (recto = `l.id`, verso = `l.back_layout_id`).

État du toggle : local à la session (ex. `Map` id→`'recto'|'verso'`), défaut `'recto'`. Pas besoin de persister en DB.

### 3.3 Tuile verso (onglet Verso)

- Inchangé fonctionnellement : tuiles des layouts `is_back`, badge DOS.
- Les versos liés restent visibles (**décision B**).
- Optionnel (nice-to-have, pas bloquant v1) : sous-titre « lié à : [nom recto] » si un recto pointe dessus.

### 3.4 Modal config (⚙)

- Inchangé : permet toujours d’éditer `back_layout_id` (lier / délier / changer), y compris quand le sélecteur n’est plus sur la tuile.

---

## 4. Éditeur — bascule avec save

### 4.1 Quand afficher le contrôle

Sur `EditorView` / `EditorToolbar`, si le layout chargé a un **partenaire** :

- Layout recto avec `back_layout_id` → partenaire = verso.
- Layout verso : trouver le recto tel que `back_layout_id === currentId` (requête déjà possible côté client via liste layouts, ou endpoint léger si besoin).

Afficher un contrôle **Recto | Verso** (face courante surlignée).

### 4.2 Comportement au switch

1. Si dirty / autosave actif : **forcer save** de la définition courante (même chemin que save manuel).
2. Si save échoue (ex. 423 lock) → **ne pas** naviguer ; toast / message d’erreur.
3. Si OK → `router.push` vers `/editor/:partnerId` (acquérir lock sur la nouvelle face selon règles existantes).

Pas de fusion des deux definitions dans un seul document en v1.

### 4.3 Hors scope éditeur v1

- Dupliquer calques recto → verso (« presque identique ») — reporté (approche 3).
- Aperçu flip 3D.
- Deux faces dans une seule session sans navigation.

---

## 5. Data model (inchangé)

| Champ | Rôle |
|-------|------|
| `layouts.is_back` | `true` = layout verso (onglet Verso) |
| `layouts.back_layout_id` | Sur un **recto** : id du layout verso lié |

Pas de migration DB pour cette v1.

---

## 6. Implementation sketch

| Zone | Fichiers probables |
|------|-------------------|
| Grille + tuile + toggle | `frontend/src/views/LayoutsView.vue` (+ CSS tuiles ; éventuellement extraire `LayoutTile.vue` si le fichier grossit) |
| Modal verso | déjà `LayoutSettingsModal.vue` |
| Toggle + save-then-navigate | `EditorToolbar.vue` et/ou `EditorView.vue`, `stores/editor.js` (`save`, dirty, locks) |
| Résoudre recto parent d’un verso | client : `layouts.find(l => l.back_layout_id === id)` après `api.getLayouts()` ou cache existant |

---

## 7. Acceptance criteria

- [x] `/layouts` affiche une **grille de blocs**, pas une liste lignes.
- [x] Recto **sans** verso : sélecteur Verso sur la tuile ; pas de toggle face.
- [x] Recto **avec** verso : toggle Recto/Verso en tête ; miniature suit la face ; **pas** de sélecteur verso sur la tuile ; ⚙ permet encore de changer le lien.
- [x] Ouvrir l’éditeur depuis la tuile ouvre la **face active** du toggle.
- [x] Onglet Verso liste toujours les layouts `is_back`, y compris ceux déjà liés.
- [x] Dans l’éditeur, bascule Recto↔Verso : **save** puis navigation vers le partenaire ; échec save = pas de navigation.
- [x] Pas de régression rename / duplicate / delete / create / locks.

---

## 8. Non-goals / follow-ups

- TSD-006 : faces dans une seule `definition` (calques recto/verso).
- Action « Créer verso par duplication du recto » pour quêtes quasi-identiques.
- Masquer les versos liés de l’onglet Verso (rejeté : décision B).

---

## 9. Open points (non bloquants)

- Afficher « lié à : … » sur les tuiles verso.
- Extraire `LayoutTile.vue` vs tout garder dans `LayoutsView.vue`.
