# Design — Type Track `omnidirectionnel`

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| Status      | Approved                                                              |
| Date        | 2026-07-19                                                            |
| Scope       | Catalogue Track : 4ᵉ type + matching / `pickCoin`                     |
| Depends on  | Spec Track textures (`2026-07-19-track-textures-design.md`)           |

---

## 1. Goal

Ajouter un type de texture Track nommé **`omnidirectionnel`** qui peut servir sur une case **droit**, **coin** ou **impasse** sans rotation automatique. La rotation manuelle (`coin` 0/90/180/270) reste possible.

Cas d’usage : assets symétriques / indifférents à l’orientation (carrefours flous, motifs isotropes, fillers).

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Compatibilité rôles | **B** — match droit **et** coin **et** impasse |
| Nom du type | `omnidirectionnel` |
| Alignement H/V | **B** — le champ `alignment` (`horizontal` / `vertical` / `both`) reste appliqué |
| Rotation auto | Toujours **0°** (`pickCoin` → `0`) |
| Rotation manuelle | Conservée via override case `coin` |
| Approche | **1** — seed `track_types` + règles dans `isTextureCompatible` / `pickCoin` |

---

## 3. Data model

### 3.1 Seed `track_types`

Ajout idempotent (schema + migration runtime si besoin) :

| id | name | color (suggestion) |
|----|------|--------------------|
| `tt-omnidirectionnel` | `omnidirectionnel` | `#4ade80` |

Les 3 types existants (`droit`, `coin`, `impasse`) inchangés.

### 3.2 `track_meta.type`

Valeur autorisée supplémentaire : `'omnidirectionnel'`.

Pas de nouveau champ JSON. Pas de multi-types.

### 3.3 Convention upload

| Type | Orientation fichier |
|------|---------------------|
| `omnidirectionnel` | **Aucune** imposée (rotation auto = 0°) |

Hints UI (TrackMetaForm, PlanTilesPanel, etc.) : texte dédié du type  
« Aucune orientation imposée — rotation auto = 0° (modifiable à la main). »

---

## 4. Matching & rotation

### 4.1 `isTextureCompatible`

Règle type actuelle :

```js
if (texture.type !== requiredType) return false
```

Devient :

```js
const typeOk =
  texture.type === requiredType ||
  texture.type === 'omnidirectionnel'
if (!typeOk) return false
```

Ensuite inchangé :

- `alignmentMatches(texture.alignment, requiredAlignment)`
- `voisinsMatch(...)`

Donc un omnidirectionnel `alignment: 'horizontal'` **ne** matche **pas** une case qui exige `vertical`.

### 4.2 `pickCoin`

Branche :

```js
if (textureType === 'omnidirectionnel') return 0
```

(avant ou après les branches droit/coin/impasse — résultat identique.)

Mélanger / assignation système pose donc `coin: 0` pour ce type.

### 4.3 Override manuel

L’UI existante qui édite `cellOverrides[idx].coin` reste valide : l’utilisateur peut forcer 90/180/270 même sur une texture omnidirectionnelle.

---

## 5. Surfaces UI (texte / select)

| Surface | Changement |
|---------|------------|
| Seed / liste `track_types` API | Type visible automatiquement si lu depuis DB |
| `TrackMetaForm.vue` | Hint orientation pour `omnidirectionnel` |
| `PlanTilesPanel.vue` | Idem filtre / hint |
| Autres filtres type (picker Track) | Pas de hardcode des 3 seuls noms — s’appuyer sur la liste types |

Si un select est hardcodé `['droit','coin','impasse']`, l’étendre ou le remplacer par les types API.

---

## 6. Tests

Étendre `frontend/src/utils/trackMatch.test.js` :

- `isTextureCompatible(omni, { requiredType: 'droit'|‘coin'|‘impasse', … })` → `true` (avec alignment OK)
- omni `alignment: 'horizontal'` + `requiredAlignment: 'vertical'` → `false`
- `pickCoin(anyDir, 'omnidirectionnel')` → `0`

---

## 7. Acceptance criteria

- [ ] Type `omnidirectionnel` présent en seed / DB
- [ ] Texture de ce type assignable / mélangable sur cases droit, coin, impasse (si alignment OK)
- [ ] Auto-rotation toujours 0° pour ce type
- [ ] Rotation manuelle case toujours possible
- [ ] Alignement toujours respecté
- [ ] Hints upload / filtre mis à jour
- [ ] Tests `trackMatch` verts

---

## 8. Non-goals

- Remplacer les 3 types de base
- Multi-types par texture
- Ignorer `voisins` pour l’omnidirectionnel (règle voisins inchangée)
- Changer le modèle Plan / TrakPath au-delà du matching

---

## 9. Implementation sketch

| Zone | Fichiers |
|------|----------|
| Seed | `backend/db/schema.sql` (+ migration idempotente dans `database.js` si INSERT seed y vit) |
| Matching | `frontend/src/utils/trackMatch.js` + `.test.js` |
| Hints UI | `TrackMetaForm.vue`, `PlanTilesPanel.vue`, éventuellement picker |
| Docs | note courte dans WORKPLAN ; optionnel amend track-textures-design |
