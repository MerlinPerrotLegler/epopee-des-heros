# TSD-021 — Pictorgame (catalogue de pictos) + atome `picto`

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Review                                     |
| Author      | @merlinperrot                              |
| Created     | 2026-07-17                                 |
| Last update | 2026-07-17                                 |
| Depends on  | TSD-004 (médias), TSD-003 (atomes), TSD-020 (richText) |

---

## 1. Purpose

Le jeu utilise un grand nombre de pictogrammes (ressources, types de carte, armes, lieux, caractéristiques, dés, artisans, bâtiments, quartiers, classes…). Aujourd’hui, ces icônes sont des médias génériques sans identité stable ni classification. Le designer a besoin d’un **catalogue Pictorgame** : chaque picto a un `ref` stable (utilisable dans RichText et le data binding), un `label`, et un ou plusieurs **tags** colorés. Un atome `picto` et des shortcodes RichText permettent de les poser sur les cartes.

---

## 2. Scope & boundaries

### In scope
- Onglet **Pictorgame** dans la vue Media (séparé de Médias / Manquants)
- Vocabulaire global de **tags** (nom + couleur) géré dans cette vue
- Entrées picto basées sur la table `media` (`kind = 'picto'`) avec `picto_ref`, `picto_label`, tags N:N
- Création par **upload** ou par **lien** vers un média existant (`source_media_id`)
- Atome **`picto`** : selects Tag + Ref (`ref - label`), param `view` (6 modes)
- Extension RichText : `/<ref>` (icône) et `\<ref>` (icône + label)
- API dédiée tags + pictos ; config atomes (`/atoms-config`) pour le nouvel atome

### Out of scope
- Remplacer / déprécier les atomes `badge` ou `iconMap`
- Édition d’image (recadrage, rembg) spécifique aux pictos (réutilise le flux média existant si déjà possible)
- Import bulk CSV / sync externe
- Autocomplete des refs dans le textarea RichText (itération ultérieure)
- Export PDF spécifique (suit le rendu HTML existant)

---

## 3. UX & interaction design

### 3.1 — Vue Media : onglets

```
[ Médias ]  [ Pictorgame ]  [ Manquants ]
```

- **Médias** : affiche uniquement `kind = 'media'` (comportement actuel)
- **Pictorgame** : catalogue dédié (voir §3.2)
- **Manquants** : inchangé

### 3.2 — Onglet Pictorgame

**Colonne gauche — tags**
- Liste des tags (pastille couleur + nom)
- `+ Tag` → formulaire nom + color picker
- Édition / suppression d’un tag (la suppression détache les liens N:N, ne supprime pas les pictos)

**Zone principale — grille**
- Filtres chips par tag (multi-select, logique OR)
- Carte picto : vignette, `ref`, `label`, pastilles de tags
- Actions : éditer, supprimer
- Toolbar :
  1. `+ Upload picto` → upload image → formulaire `ref` / `label` / tags → crée `media` avec `kind='picto'`
  2. `+ Lier un média` → picker sur `kind='media'` → crée / enrichit une entrée picto avec `source_media_id` + `ref` / `label` / tags

**Édition picto (modale / panneau)**
- `ref` obligatoire, unique, slug (`[a-zA-Z0-9_-]+`)
- `label` (texte affiché)
- multi-select tags depuis le vocabulaire
- aperçu image (contenu propre ou résolu via `source_media_id`)

### 3.3 — Atome `picto` (éditeur)

1. Designer place un atome `picto` sur le canvas
2. PropertiesPanel : select **Tag** (filtre, bindable) puis select **Ref** (options filtrées si tag choisi ; libellé `ref - label` ; bindable)
3. Select **Vue** : `icon` | `horizontal` | `vertical` | `horizontal-inverse` | `vertical-inverse` | `text`
4. Params typographiques / taille icône / gap / fit / opacity (alignés sur `badge`)

**Vues**
| `view` | Rendu |
|--------|--------|
| `icon` | image seule |
| `horizontal` | image + label |
| `vertical` | image au-dessus du label |
| `horizontal-inverse` | label + image |
| `vertical-inverse` | label au-dessus de l’image |
| `text` | label seul |

**Résolution runtime** : `ref` est la source de vérité. Lookup par `picto_ref`. Si introuvable → placeholder cassé. Le `tag` filtre le picker ; un mismatch tag/ref en édition peut être signalé sans bloquer le rendu.

### 3.4 — RichText

Syntaxe ajoutée (après les shortcodes existants dans le parseur) :
- `/<ref>` → token picto, icône seule
- `\<ref>` → token picto, icône + label (layout horizontal compact)

Exemples : `/or`, `\une-main`

Shortcodes **réservés prioritaires** (inchangés) : `/D8{…}`, `/D12{…}`, `/R{…}`, `/FOR`…`/DEF`, `/SVG{…}`.  
Convention : ne pas créer de `picto_ref` collisionnant avec ces tokens (`D8`, `D12`, `R`, noms de stats, `SVG`).

Ref inconnu → placeholder inline (`?ref`).

---

## 4. Data model

Approche retenue : **médias + métadonnées** (pas de table `pictos` séparée).

```sql
-- Migrations idempotentes (schema.sql + database.js tryAlter)

ALTER TABLE media ADD COLUMN kind TEXT NOT NULL DEFAULT 'media';
  -- 'media' | 'picto'

ALTER TABLE media ADD COLUMN picto_ref TEXT;
ALTER TABLE media ADD COLUMN picto_label TEXT;
ALTER TABLE media ADD COLUMN source_media_id TEXT
  REFERENCES media(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS picto_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#888888',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_picto_tags (
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES picto_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, tag_id)
);

-- Unicité du ref pour les pictos (SQLite : index partiel si supporté ;
-- sinon contrainte applicative + index non unique + check au write)
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_picto_ref
  ON media(picto_ref) WHERE kind = 'picto' AND picto_ref IS NOT NULL;
```

**Image**
- Upload picto : BLOB sur la ligne `kind='picto'` (comme médias actuels)
- Lien : `source_media_id` pointe vers un `kind='media'` ; le serve d’image résout le contenu du source si le BLOB local est vide
- Suppression du média source → `source_media_id` NULL → picto cassé jusqu’à re-liaison / re-upload

**Atome `picto` — defaultParams**
```js
{
  tag: '',
  ref: '',
  view: 'horizontal', // icon | horizontal | vertical | horizontal-inverse | vertical-inverse | text
  iconSize: 6,        // mm
  gap: 1,             // mm
  fit: 'contain',
  fontSize: 2.8,      // % hauteur layout
  fontFamily: null,
  fontWeight: 400,
  color: null,
  textAlign: 'left',
  opacity: 1,
}
```

---

## 5. API changes

### Tags
| Method | Path | Body / query | Notes |
|--------|------|--------------|-------|
| GET | `/api/picto-tags` | — | Liste `{ id, name, color }` |
| POST | `/api/picto-tags` | `{ name, color }` | Création |
| PATCH | `/api/picto-tags/:id` | `{ name?, color? }` | Édition |
| DELETE | `/api/picto-tags/:id` | — | Détache liens, ne touche pas aux media |

### Pictos
| Method | Path | Body / query | Notes |
|--------|------|--------------|-------|
| GET | `/api/pictos` | `?tag=` (id, répétable) | `kind='picto'` + tags jointures |
| POST | `/api/pictos` | multipart upload **ou** JSON `{ source_media_id, picto_ref, picto_label, tagIds[] }` | |
| PATCH | `/api/pictos/:id` | `{ picto_ref?, picto_label?, tagIds?, source_media_id? }` | |
| DELETE | `/api/pictos/:id` | — | Supprime la ligne media picto |

Serve image : `/uploads/:filename` existant ; si `source_media_id` et pas de content local, résoudre le fichier/BLOB source.

Enregistrer les routes dans `backend/server.js` ; méthodes dans `frontend/src/utils/api.js`.

---

## 6. Frontend components & files

| Fichier | Rôle |
|---------|------|
| `frontend/src/views/MediaView.vue` | Onglet Pictorgame + UI tags |
| `frontend/src/components/media/*` | Sous-composants éventuels (grille, modale edit, tag list) |
| `frontend/src/atoms/index.js` | Type `picto` |
| `frontend/src/atoms/components/AtomPicto.vue` | Rendu des 6 vues |
| `frontend/src/components/editor/AtomRenderer.vue` | Branche `picto` |
| `frontend/src/components/editor/PropertiesPanel.vue` | Selects Tag / Ref / View + ENUM_MAPS |
| `frontend/src/components/config/AtomConfigPanel.vue` | Config atomes |
| `frontend/src/utils/richTextParser.js` | Tokens `/ref` et `\ref` |
| `frontend/src/atoms/components/AtomRichText.vue` | Rendu token `picto` |
| `frontend/src/stores/` (store léger ou fetch) | Cache catalogue pictos pour RichText + picker |
| `backend/routes/pictos.js`, `pictoTags.js` | API |
| `backend/db/schema.sql`, `database.js` | Schema + migrations |

---

## 7. Edge cases & error handling

- `picto_ref` dupliqué → 409 avec message clair
- `ref` invalide (caractères hors slug) → 400
- Tag filtré mais `ref` hors tag → rendu OK par `ref` ; warning optionnel en panneau propriétés
- Média source supprimé → placeholder cassé sur canvas / RichText
- Collision shortcode RichText (`/FOR` etc.) → shortcode réservé gagne ; documenter la convention de naming
- Picto sans image (ni BLOB ni source) → placeholder
- Suppression d’un tag utilisé → pictos restent, pastille disparaît

---

## 8. Testing strategy

- API : CRUD tags ; CRUD pictos (upload + link) ; filtre `?tag=` ; unicité `ref`
- UI Media : créer tag coloré, assigner à 2 pictos, filtrer
- Atome : chaque `view` ; binding `{{…}}` sur `tag` et `ref`
- RichText : `/or` vs `\or` ; non-régression `/D8{3}` `/R{or,1}` `/FOR{+1}`
- Snapshot DB : nouvelles tables incluses dans `createSnapshot()`

---

## 9. Open questions

Aucune — décisions figées en brainstorming (2026-07-17) :
- Section Media séparée (onglet)
- Selects Tag + Ref dans l’atome ; multi-icônes par tag ; multi-tags par icône
- Approche B (media + métadonnées)
- Upload et lien média
- RichText `/ref` et `\ref`
- Vocabulaire tags global (nom + couleur)

---

## 10. Implementation notes

- Suivre le checklist « Quand tu modifies un atome » (`.cursorrules`) : `index.js` → `AtomRenderer` → `PropertiesPanel` ENUM_MAPS → config atomes
- Mesures en **mm** ; tailles de police en % hauteur layout comme les autres atomes texte
- MySQL et SQLite : migrations idempotentes (`tryAlter`) pour les deux backends si le projet les supporte encore
- Index partiel SQLite : si non supporté sur la version embarquée, enforce unicité en application + index simple sur `picto_ref`
