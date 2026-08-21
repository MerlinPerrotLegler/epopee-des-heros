# TSD-031 — Taille du layout d’un composant

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Done                         |
| Author      | @merlinperrot                |
| Created     | 2026-08-21                   |
| Last update | 2026-08-21                   |
| Depends on  | TSD-005 (listing), TSD-001 (éditeur canvas) |

---

## 1. Purpose

Un composant a une taille native (`width_mm` × `height_mm`) qui définit le canvas de son éditeur. Cette taille n’est saisissable **qu’à la création**. Les layouts, eux, se redimensionnent après coup via ⚙. Le designer doit pouvoir changer la taille (et le nom) d’un composant existant, depuis l’éditeur et depuis la liste, sans recréer le composant.

---

## 2. Scope & boundaries

### In scope
- Modal **Modifier le composant** : nom + largeur × hauteur mm + bouton ⇄
- Accès ⚙ + nom cliquable dans la toolbar de l’éditeur composant
- Accès ⚙ sur les tuiles de la liste Composants
- `PATCH /api/components/:id` étendu à `width_mm` et `height_mm`
- Persistance immédiate (sans renvoyer la `definition`)
- Recadrage canvas (`requestFit = 'fit'`) après un changement de dims depuis l’éditeur
- Tests store (`applyLayoutMeta`) + helper de validation PATCH

### Out of scope
- Molécules (même trou, recopiable ensuite)
- Mise à jour des instances déjà posées sur des layouts
- Recapture de miniature au seul changement de taille
- Alerte ou clipping si des atomes dépassent le nouveau canvas
- Remplacer la modal de **création** Composants (nom / description / dims inchangée)
- Édition de la `description` depuis la modal ⚙
- Poignées de resize sur le canvas, édition inline du badge

### Décisions (brainstorming)

| Question | Choix |
|----------|--------|
| Intent | Taille native du canvas composant, après création |
| Instances posées | **C** — non parcourues, non réécrites ; scaling instance inchangé |
| UI | **A** — ⚙ + modal allégée (éditeur + liste), comme les layouts |

Conséquence de C : `ComponentRenderer` étire toujours le composant dans le cadre de l’instance (`instanceW / nativeW`). Un changement de ratio natif peut déformer visuellement les instances déjà posées. Accepté.

---

## 3. UX & interaction design

### Primary flow — éditeur
1. Ouvrir un composant. Badge `L × H mm` déjà visible (lecture).
2. Clic sur le **nom** ou sur **⚙** → modal « Modifier le composant ».
3. Changer nom et/ou dims (1–500 mm), éventuellement ⇄.
4. Enregistrer → `PATCH` immédiat → canvas aux nouvelles dims, `fit`. Les atomes gardent leurs `x_mm` / `y_mm` / `width_mm` / `height_mm`.
5. Annuler ou clic overlay → rien n’est écrit.

### Primary flow — liste
1. Sur une tuile, ⚙ (à côté de ✎ / ⧉ / ✕, même pattern que Layouts).
2. Même modal. Après succès, la tuile met à jour nom et badges `L × H mm` (titre + meta). Le clic tuile hors ⚙ ouvre toujours l’éditeur.

### Secondary
- Enregistrer désactivé si nom vide (trim) ou pendant le save.
- `min="1"` `max="500"` `step="0.1"` sur les inputs dims.
- Pas de verrou composant : ⚙ toujours actif (contrairement au layout `readOnly`).

### Visual states
- Ouverte, champs préremplis depuis le composant
- Saving : bouton « Enregistrement… »
- Erreur API : message rouge sous les champs, modal reste ouverte, canvas inchangé
- Succès : modal fermée

---

## 4. Data model

Pas de migration. Colonnes déjà présentes :

```sql
components.width_mm   -- DOUBLE NULL
components.height_mm  -- DOUBLE NULL
```

Le store éditeur en mode `component` réutilise `layout` comme stand-in :

```js
layout.value = {
  id, name, width_mm, height_mm, card_type: null, definition
}
```

`applyLayoutMeta` copie déjà `name`, `width_mm`, `height_mm` (parmi d’autres clés layout). Aucune nouvelle clé store.

`saveDefinition` (PUT) envoie déjà `width_mm` / `height_mm` : un auto-save ultérieur ne rétablit pas l’ancienne taille.

---

## 5. API changes

Auth : inchangée (`requireAuth`).

### `PATCH /api/components/:id`
- **Purpose :** métadonnées seulement (pas la `definition`)
- **Request body** (tous optionnels) :
  ```json
  { "name": "string", "width_mm": 40, "height_mm": 25 }
  ```
- **Response 200 :** composant complet (comme aujourd’hui, `definition` parsée)
- **400** nom fourni mais vide après trim ; `width_mm` ou `height_mm` fourni mais non fini, ou hors `[1, 500]`
- **404** id inconnu
- Champ absent → `COALESCE` / conserve la valeur actuelle
- Ne pas envoyer `definition` ni `thumbnail`

Frontend : `api.patchComponent(id, data)` existe déjà.

Validation extraite dans un helper testable, ex. `normalizeComponentMeta(body)` → `{ ok, patch }` ou `{ ok: false, status, error }`.

---

## 6. Implementation steps

- [x] Helper `normalizeComponentMeta` + tests (nom, dims valides / invalides / absentes)
- [x] Backend `PATCH` : name + width_mm + height_mm via le helper ; 400 / 404
- [x] `ComponentSettingsModal.vue` (nom, dims, ⇄, `saveFn`)
- [x] `EditorToolbar` : ⚙ + nom cliquable si `mode === 'component'` ; PATCH puis `applyLayoutMeta` + `requestFit = 'fit'`
- [x] `ComponentsView` : bouton ⚙, même modal, mise à jour locale de la tuile
- [x] Store test : `applyLayoutMeta` en mode composant met à jour nom/dims, `definition` intacte

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Nom `"  "` | Enregistrer désactivé ; si PATCH `name: "  "` → 400 |
| Dims 0, négatives, `NaN`, `"abc"` | 400, canvas inchangé |
| Dims 0.5 | 400 (min 1) |
| Dims 501 | 400 |
| Dims 1 et 500 | OK |
| PATCH `{ name }` seul | dims inchangées (rétrocompat rename inline ✎) |
| Rétrécir sous les atomes | autorisé ; débordement visible, pas d’alerte |
| Instances sur layouts | non parcourues ; cadre instance inchangé |
| Miniature | inchangée jusqu’au prochain `saveDefinition` |
| Réseau KO | message dans la modal ; store non mis à jour |
| Molécule ouverte | pas de ⚙ taille (hors scope) |

---

## 8. Acceptance criteria

- [x] Depuis l’éditeur composant, ⚙ (ou clic nom) permet de changer L × H mm ; le canvas suit ; les atomes ne bougent pas
- [x] Depuis la liste Composants, ⚙ fait de même ; badges tuile à jour
- [x] `PATCH` name-only (rename ✎) continue de fonctionner
- [x] Dims invalides → 400 + erreur visible, pas d’écriture
- [x] Instances déjà posées non modifiées en base
- [x] Tests helper + `applyLayoutMeta` verts

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | Taille composant figée après création (badge toolbar lecture seule) | fixed in TSD-031 | 2026-08-21 |

---

## 10. Open questions

*(aucune — tranchées en brainstorming)*

---

## 11. Notes & références

- Layouts : `LayoutSettingsModal` + ⚙ liste/toolbar. On **ne réutilise pas** cette modal (trop de champs carte : type, hex, verso).
- `ComponentRenderer` : `scaleX = width_mm / compW` — documenté, pas modifié.
- Design companion : `docs/superpowers/specs/2026-08-21-component-layout-size-design.md`
