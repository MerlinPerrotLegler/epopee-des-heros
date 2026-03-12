# TSD-012 — Génération de médias manquants par IA

| Field       | Value                              |
|-------------|------------------------------------|
| Status      | Draft                              |
| Author      | @merlinperrot                      |
| Created     | 2026-03-12                         |
| Last update | 2026-03-12                         |
| Depends on  | TSD-004 (médias), TSD-007 (instances cartes) |

---

## 1. Purpose

Lors de l'import CSV/Google Sheets (TSD-007), certaines instances de cartes référencent des médias (`mediaId`) qui n'existent pas encore dans la bibliothèque. Plutôt que de bloquer l'import ou de laisser des cases vides silencieusement, on veut :

1. **Détecter** les médias manquants et les consigner dans une table dédiée (non-bloquant).
2. **Générer** ces images via une API d'IA (DALL-E / Stability AI / fal.ai) à partir de prompts configurables.
3. **Intégrer** les images générées dans la bibliothèque de médias et marquer les références comme résolues.

Le game designer peut ainsi définir un style artistique global et des instructions par type de visuel, puis lancer la génération en batch depuis une interface dédiée.

---

## 2. Scope & boundaries

### In scope
- Table `missing_media` pour consigner les références non résolues.
- Table `ai_generation_config` : prompt général (contexte artistique du jeu) + templates par type de média.
- Interface "Médias manquants" : liste, statut, déclenchement de génération individuelle ou en batch.
- Pipeline de génération : construction du prompt final → appel API IA → stockage → résolution.
- Stockage du fichier généré dans le dossier média existant, création d'un enregistrement `media`.
- Support initial : OpenAI DALL-E 3 (provider par défaut, configurable).

### Out of scope
- Recadrage / retouche des images générées (→ TSD-011 pour la suppression de fond).
- Génération de texte (descriptions, noms de cartes).
- Génération automatique déclenchée sans action humaine (pas de cron automatique).
- Support multi-provider simultané (un seul provider actif à la fois).
- Fine-tuning / LoRA spécifique au jeu.

---

## 3. UX & interaction design

### 3.1 Architecture des prompts — deux niveaux

La construction du prompt final combine **deux niveaux** :

```
prompt_final = global_prompt (config IA)
             + "\n"
             + ai_prompt_template (sur l'élément image dans le layout)
               avec les variables de binding interpolées depuis les données de l'instance
```

**Niveau 1 — Config globale IA** (style artistique du jeu, unique, dans Config > IA) :
- `global_prompt` : style général, palette, références visuelles, ambiance. Injecté en tête de chaque prompt.
- `provider` / `api_key` / paramètres par défaut.

**Niveau 2 — Template par élément image dans le layout** :
- Chaque atome `image` d'un layout possède un champ `ai_prompt_template` dans ses params.
- Ce template peut inclure des variables de binding de l'instance : `{{card_name.text}}`, `{{card_type}}`, `{{stats.force.value}}`, etc.
- L'interpolation est faite au moment de la génération depuis les données JSON de l'instance.
- Sans ce template, le bouton "Générer" est désactivé avec un avertissement explicite.

> Rationale : le prompt global décrit l'univers visuel du jeu. Le template de l'élément décrit le sujet précis à générer, contextualisé par les données de la carte. Séparer les deux permet de réutiliser la config globale sur tous les layouts.

### 3.1b Configuration globale IA (Config > IA / Génération)

1. L'utilisateur ouvre **Config > IA / Génération**.
2. Il saisit le **prompt global** (style artistique, ambiance générale).
3. Il configure le **provider** et la **clé API**.
4. Des **presets de résolution par type de média** (`illustration`, `icone`, `fond`) définissent les dimensions et le style preset provider.
5. Sauvegarde via `PUT /api/config/ai`.

#### Wireframe Config IA

```
┌─────────────────────────────────────────────────────┐
│  Config IA                                          │
│                                                     │
│  Prompt global (style / ambiance — injecté en tête) │
│  ┌───────────────────────────────────────────────┐  │
│  │ Illustration fantasy médiévale, palette        │  │
│  │ chaude, trait encré, inspiré Donjons & Dragons │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Provider  [OpenAI DALL-E 3 ▾]   Clé API [••••••]  │
│                                                     │
│  Presets par type de média                          │
│  ┌──────────────────────────────────────────────┐   │
│  │ illustration   Résolution [1024×1024 ▾]       │   │
│  │                Style preset [vivid]           │   │
│  ├──────────────────────────────────────────────┤   │
│  │ icone          Résolution [512×512 ▾]         │   │
│  │                Style preset [natural]         │   │
│  ├──────────────────────────────────────────────┤   │
│  │ fond           Résolution [1024×1792 ▾]       │   │
│  └──────────────────────────────────────────────┘   │
│  [+ Ajouter type]              [Sauvegarder]        │
└─────────────────────────────────────────────────────┘
```

### 3.1c Template de prompt sur l'élément image (dans l'éditeur de layout)

Dans le panneau **Propriétés** d'un atome `image`, un champ dédié :

```
┌──────────────────────────────────────────────────┐
│  Propriétés — image                              │
│  …                                               │
│  ┌────────────────────────────────────────────┐  │
│  │  IA — Prompt de génération                 │  │
│  │  Type  [illustration ▾]                    │  │
│  │  Template                                  │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │ Illustration d'un {{card_name.text}}, │  │  │
│  │  │ vue de face, {{card_type}},           │  │  │
│  │  │ style médiéval fantasy                │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │  Variables disponibles :                   │  │
│  │  card_name.text  card_type  price.or  …    │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- La liste "Variables disponibles" est extraite des `bindingPaths` du layout (cf. TSD-007 `getBindablePaths()`).
- Cliquer sur une variable l'insère dans le textarea à la position du curseur.

### 3.2 File de génération (page Médias > onglet "Manquants")

1. L'utilisateur ouvre la page **Médias > onglet "Manquants"**.
2. La liste affiche chaque entrée `missing_media` avec :
   - Nom de l'instance de carte liée
   - Chemin de binding (`card_illustration.mediaId`)
   - Type de média déduit
   - **Lien vers le layout** (nom cliquable → ouvre l'éditeur du layout en question)
   - Statut (`pending`, `generating`, `resolved`, `error`, `ignored`)
   - Aperçu thumbnail si `resolved`
3. **Si `ai_prompt_template` est vide sur l'élément image du layout** :
   - Badge d'avertissement orange : "⚠ Prompt manquant dans le layout"
   - Bouton "Générer" désactivé
   - Bouton "Configurer →" cliquable qui ouvre directement le layout dans l'éditeur
4. Actions :
   - **Aperçu prompt** → affiche le prompt final interpolé dans une modale (mode dry-run, voir §3.4).
   - **Générer** (actif seulement si prompt configuré) → démarre la génération.
   - **Générer tout** → batch sur toutes les entrées `pending` avec prompt configuré (saute les autres).
   - **Ignorer** → passe le statut à `ignored`, sort de la liste par défaut.
   - **Assigner manuellement** → ouvre le media picker pour lier un média existant.

#### Wireframe File

```
┌────────────────────────────────────────────────────────────────────┐
│  Médias manquants  (12 pending, 3 generating, 5 resolved)          │
│                                                                    │
│  [Générer tout (9 configurés)]              [Afficher : pending ▾] │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ ◎ Épée en fer          card_illustration.mediaId           │   │
│  │   Layout : Équipement →            type: illustration      │   │
│  │   ● pending                                                │   │
│  │   [Aperçu prompt] [Générer] [Ignorer] [Assigner]           │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │ ◎ Bouclier de chêne    card_illustration.mediaId           │   │
│  │   Layout : Équipement →            type: illustration      │   │
│  │   ⟳ generating…                                           │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │ ⚠ Potion de soin       card_illustration.mediaId           │   │
│  │   Layout : Bric-à-brac →           type: illustration      │   │
│  │   ⚠ Prompt manquant dans le layout    [Configurer →]       │   │
│  ├────────────────────────────────────────────────────────────┤   │
│  │ ✓ Rune de feu          card_icon.mediaId                   │   │
│  │   Layout : Rune →                  type: icone             │   │
│  │   ● resolved  [img 32×32]                                  │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### 3.3 Déduction du type de média

Le type est déduit en priorité depuis le champ `ai_media_type` de l'élément image dans le layout (voir §3.1c). En l'absence de ce champ, fallback sur le `binding_path` :
- Contient `illustration` → `illustration`
- Contient `icon` ou `icone` → `icone`
- Contient `fond` ou `background` → `fond`
- Sinon → `autre` (utilise le prompt global seul)

L'utilisateur peut surcharger le type manuellement depuis la liste.

### 3.4 Aperçu du prompt final (dry-run)

Accessible par le bouton **"Aperçu prompt"** sur chaque entrée, **même si aucun provider n'est configuré**.

- Appelle `POST /api/missing-media/:id/preview-prompt`
- Le backend reconstruit le prompt final : `global_prompt + "\n" + template interpolé avec les données de l'instance`
- Affiche une modale :

```
┌──────────────────────────────────────────────────────┐
│  Aperçu du prompt — Épée en fer                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ Illustration fantasy médiévale, palette chaude,│  │
│  │ trait encré, inspiré Donjons & Dragons         │  │
│  │                                                │  │
│  │ Illustration d'une Épée en fer, vue de face,   │  │
│  │ carte équipement, style médiéval fantasy       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [Copier]    [Générer avec ce prompt]    [Fermer]    │
└──────────────────────────────────────────────────────┘
```

- **Copier** : copie le prompt dans le presse-papier (utile pour coller dans une IA en mode navigateur).
- **Générer avec ce prompt** : déclenche la génération si un provider est configuré (bouton désactivé sinon, avec tooltip "Aucun provider configuré").
- Le prompt est affiché dans un `<pre>` avec scroll horizontal pour les prompts longs.

### Visual states
- `pending` (prompt configuré) : gris, boutons "Aperçu prompt" + "Générer" actifs
- `pending` (prompt manquant) : orange, badge "⚠ Prompt manquant", bouton "Générer" désactivé, bouton "Configurer →" actif
- `generating` : spinner animé, tous boutons désactivés sauf "Aperçu prompt"
- `resolved` : vert, thumbnail visible, bouton "Regénérer" optionnel
- `error` : rouge, message d'erreur, bouton "Réessayer" actif
- `ignored` : gris clair, masqué par défaut du filtre (visible avec filtre "Tous")

---

## 4. Data model

### 4.1 Table `missing_media`

```sql
CREATE TABLE IF NOT EXISTS missing_media (
  id               TEXT PRIMARY KEY,
  card_instance_id TEXT NOT NULL REFERENCES card_instances(id) ON DELETE CASCADE,
  binding_path     TEXT NOT NULL,          -- ex: "card_illustration.mediaId"
  media_type       TEXT,                   -- déduit ou saisi manuellement
  media_id_ref     TEXT,                   -- valeur dans les data (peut être un slug attendu)
  status           TEXT NOT NULL DEFAULT 'pending',
    -- pending | generating | resolved | error | ignored
  resolved_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
  error_message    TEXT,
  detected_at      TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at      TEXT,
  generation_prompt TEXT                   -- prompt final utilisé (pour debug/audit)
);

CREATE INDEX IF NOT EXISTS idx_missing_media_status ON missing_media(status);
CREATE INDEX IF NOT EXISTS idx_missing_media_instance ON missing_media(card_instance_id);
-- Unique par instance + path pour éviter les doublons lors de re-sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_missing_media_uniq
  ON missing_media(card_instance_id, binding_path);
```

### 4.2 Champs IA sur l'atome `image` (dans la définition JSON du layout)

Ces champs sont stockés dans `layout.definition` (JSON), dans les `params` de chaque élément de type `image`. Aucune nouvelle colonne SQL — c'est une extension des params existants.

```json
{
  "id": "uuid",
  "type": "image",
  "nameInLayout": "card_illustration",
  "params": {
    "mediaId": null,
    "objectFit": "cover",
    "ai_media_type": "illustration",
    "ai_prompt_template": "Illustration d'un {{card_name.text}}, carte {{card_type}}, style médiéval fantasy"
  }
}
```

- `ai_media_type` : type de média (`illustration`, `icone`, `fond`, ou valeur libre). Détermine le preset de résolution/style depuis `ai_generation_config`.
- `ai_prompt_template` : template du sujet à générer. Peut contenir `{{binding_path}}` de n'importe quelle variable du layout. Si absent ou vide → génération bloquée avec warning.

### 4.3 Table `ai_generation_config`

```sql
CREATE TABLE IF NOT EXISTS ai_generation_config (
  id              TEXT PRIMARY KEY DEFAULT 'singleton',  -- une seule ligne config globale
  provider        TEXT NOT NULL DEFAULT 'openai',        -- openai | stability | fal
  api_key         TEXT,                                  -- stocké en clair (instance locale)
  global_prompt   TEXT NOT NULL DEFAULT '',
  media_type_presets TEXT NOT NULL DEFAULT '[]',         -- JSON array, voir §4.4
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 4.4 Structure JSON `media_type_presets`

Les presets définissent uniquement les paramètres techniques (résolution, style provider). Le template de prompt est sur l'élément image dans le layout (§4.2).

```json
[
  {
    "type": "illustration",
    "label": "Illustration",
    "resolution": "1024x1024",
    "style_preset": "vivid",
    "negative_prompt": ""
  },
  {
    "type": "icone",
    "label": "Icône",
    "resolution": "512x512",
    "style_preset": "natural",
    "negative_prompt": "photorealistic, photo"
  },
  {
    "type": "fond",
    "label": "Fond",
    "resolution": "1024x1792",
    "style_preset": "natural",
    "negative_prompt": ""
  }
]
```

### 4.4 Migration idempotente

```js
try { db.exec(`CREATE TABLE IF NOT EXISTS missing_media (...)`) } catch {}
try { db.exec(`CREATE TABLE IF NOT EXISTS ai_generation_config (...)`) } catch {}
try { db.exec(`INSERT OR IGNORE INTO ai_generation_config (id) VALUES ('singleton')`) } catch {}
```

---

## 5. API changes

### `GET /api/config/ai`
- **Purpose:** Récupère la config IA complète.
- **Auth:** required
- **Response:**
  ```json
  {
    "provider": "openai",
    "api_key_set": true,
    "global_prompt": "...",
    "media_types": [...]
  }
  ```
  > `api_key` n'est jamais renvoyée en clair — seulement `api_key_set: bool`.

### `PUT /api/config/ai`
- **Purpose:** Sauvegarde la config IA.
- **Auth:** required
- **Request body:**
  ```json
  {
    "provider": "openai",
    "api_key": "sk-...",
    "global_prompt": "...",
    "media_types": [...]
  }
  ```
- **Response:** `{ "ok": true }`
- **Error cases:** 400 si `media_types` n'est pas un tableau JSON valide.

### `GET /api/missing-media`
- **Purpose:** Liste les entrées `missing_media`.
- **Auth:** required
- **Query params:** `?status=pending` (filtre optionnel), `?instance_id=`
- **Response:** array de `missing_media` augmenté de :
  - `card_instance_name` (join sur `card_instances`)
  - `layout_id`, `layout_name` (via `card_instances.layout_id`)
  - `prompt_configured: bool` — `true` si `ai_prompt_template` non vide sur l'élément dans le layout

### `POST /api/missing-media/:id/preview-prompt`
- **Purpose:** Construit et renvoie le prompt final interpolé (dry-run, aucun appel IA).
- **Auth:** required
- **Response:**
  ```json
  { "prompt": "Illustration fantasy médiévale, palette chaude...\n\nIllustration d'une Épée en fer, carte équipement..." }
  ```
- **Error cases:** 404, 422 si `ai_prompt_template` absent sur l'élément du layout.

### `POST /api/missing-media/:id/generate`
- **Purpose:** Déclenche la génération IA pour une entrée.
- **Auth:** required
- **Response:** `{ "ok": true, "status": "generating" }` (asynchrone)
- **Error cases:** 404, 409 si déjà `generating`.

### `POST /api/missing-media/generate-all`
- **Purpose:** Batch — génère toutes les entrées `pending`.
- **Auth:** required
- **Request body:** `{ "media_type": "illustration" }` (optionnel, filtre par type)
- **Response:** `{ "queued": 12 }`

### `PATCH /api/missing-media/:id`
- **Purpose:** Mise à jour manuelle (statut, assigned media, type override).
- **Auth:** required
- **Request body:** `{ "status": "ignored" }` ou `{ "resolved_media_id": "uuid", "status": "resolved" }`
- **Response:** objet mis à jour.

---

## 6. Implementation steps

### DB
- [ ] Migration : `CREATE TABLE IF NOT EXISTS missing_media` avec index
- [ ] Migration : `CREATE TABLE IF NOT EXISTS ai_generation_config` + `INSERT OR IGNORE` singleton

### Backend — config IA
- [ ] `GET /api/config/ai` et `PUT /api/config/ai` dans `backend/routes/config.js`
- [ ] Masquer `api_key` dans les réponses GET (renvoyer `api_key_set: bool`)

### Backend — missing_media CRUD
- [ ] `GET /api/missing-media` avec filtre `status`, join `card_instances` + `layouts`, calcul `prompt_configured`
- [ ] `PATCH /api/missing-media/:id`

### Backend — pipeline de génération
- [ ] `backend/services/aiGeneration.js` :
  - `buildPrompt(entry, layoutDef, config, instanceData)` → string (global + template interpolé)
  - `interpolateTemplate(template, instanceData)` → résout `{{binding_path}}` avec les données de l'instance
  - `callProvider(provider, apiKey, prompt, resolution, stylePreset)` → Buffer image
  - `saveGeneratedImage(buffer, filename)` → `media` row
  - `resolveEntry(id, mediaId)` → UPDATE missing_media
- [ ] `POST /api/missing-media/:id/preview-prompt` (dry-run, pas d'appel IA)
- [ ] `POST /api/missing-media/:id/generate` (appel asynchrone, réponse immédiate `generating`)
- [ ] `POST /api/missing-media/generate-all` (saute les entrées sans `ai_prompt_template`)
- [ ] Au démarrage serveur : remettre à `pending` les entrées bloquées en `generating`
- [ ] Gestion des erreurs : `status = 'error'`, `error_message` enregistré

### Backend — détection lors de l'import (TSD-007 integration)
- [ ] Appeler `detectMissingMedia(instanceId, data, bindingPaths, db)` après chaque upsert d'instance dans `POST /card-instances/import-url`

### Frontend — config IA
- [ ] Section "IA / Génération" dans `ConfigPanel.vue` ou nouvelle page `AIConfigView.vue`
- [ ] Champ `global_prompt` (textarea), sélecteur `provider`, champ `api_key` (masqué, affiche `••••••` si configuré)
- [ ] Liste des presets par type de média : résolution, style_preset, negative_prompt
- [ ] `api.getAIConfig()`, `api.putAIConfig()` dans `api.js`

### Frontend — propriétés atome image (éditeur de layout)
- [ ] Champ `ai_media_type` (select) et `ai_prompt_template` (textarea) dans `PropertiesPanel.vue` pour les éléments `type === 'image'`
- [ ] Liste des variables disponibles extraite de `getBindablePaths(definition)` — clic insère dans le textarea

### Frontend — file de génération
- [ ] Onglet "Manquants" dans `MediaView.vue` (ou vue dédiée)
- [ ] Liste `missing_media` avec statut coloré, lien layout cliquable, thumbnail si resolved
- [ ] Badge "⚠ Prompt manquant" + bouton "Configurer →" (lien vers éditeur du layout) si `!prompt_configured`
- [ ] Bouton "Aperçu prompt" → modale avec `<pre>` du prompt final + bouton Copier
- [ ] Boutons Générer (désactivé si `!prompt_configured`) / Ignorer / Assigner (ouvre media picker)
- [ ] Polling toutes les 3s sur les entrées `generating`
- [ ] "Générer tout (N configurés)" avec indicateur de progression

### Frontend — api.js
- [ ] `getMissingMedia(status)`, `patchMissingMedia(id, data)`
- [ ] `previewPrompt(id)`, `generateMissingMedia(id)`, `generateAllMissingMedia(opts)`
- [ ] `getAIConfig()`, `putAIConfig(data)`

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Clé API absente au moment de générer | 400 avec message "Clé API non configurée" |
| Provider rate-limit (429) | `status = 'error'`, message explicite, bouton Réessayer |
| Instance de carte supprimée → `missing_media` orpheline | CASCADE DELETE supprime l'entrée |
| Même `(card_instance_id, binding_path)` inséré deux fois lors de re-sync | UNIQUE index → `INSERT OR IGNORE` silencieux |
| Image générée très grande (> 5 Mo) | Acceptée, pas de limite artificielle côté app |
| Provider renvoie une URL (DALL-E) plutôt qu'un buffer | `aiGeneration.js` télécharge l'URL et sauvegarde localement |
| `media_type` inconnu dans la config | Utilise le `global_prompt` seul sans template |
| Batch interrompu (crash serveur) | Les entrées restent `pending` ou `generating` ; au redémarrage, les `generating` sont remises à `pending` |

---

## 8. Acceptance criteria

- [ ] Après un import CSV, les `mediaId` non résolus apparaissent dans la table `missing_media` avec statut `pending`.
- [ ] Un atome `image` dans le layout expose les champs `ai_media_type` et `ai_prompt_template` dans le panneau Propriétés, avec la liste des variables disponibles.
- [ ] Si `ai_prompt_template` est vide sur l'élément, la file affiche le badge "⚠ Prompt manquant" et désactive le bouton "Générer".
- [ ] Le bouton "Aperçu prompt" affiche le prompt final interpolé dans une modale `<pre>` avec bouton Copier, même si aucun provider n'est configuré.
- [ ] La page Config IA permet de saisir un prompt global + presets par type (résolution, style) et de sauvegarder.
- [ ] La clé API n'est jamais exposée dans les réponses GET de l'API.
- [ ] Cliquer "Générer" déclenche l'appel IA, crée un enregistrement `media`, et résout l'entrée (`status = 'resolved'`).
- [ ] L'image générée est visible dans la bibliothèque médias normale.
- [ ] L'instance de carte concernée affiche l'image générée lors du prochain rendu.
- [ ] "Générer tout" fonctionne sur ≥ 50 entrées sans timeout (traitement asynchrone), saute silencieusement celles sans prompt.
- [ ] Les erreurs (clé invalide, quota dépassé) sont visibles dans la liste sans bloquer les autres générations.
- [ ] Ignorer une entrée la masque de la vue par défaut (filtre `pending`).
- [ ] Assigner manuellement un média existant résout l'entrée.
- [ ] Au redémarrage du serveur, les entrées bloquées en `generating` sont remises à `pending`.

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [x] Q1 — Clé API dans la DB ? **Oui** — l'outil tourne en local, configurable depuis la page Config IA. Jamais exposée en clair dans les réponses GET.
- [x] Q2 — Polling 3s vs SSE ? **Polling 3s** — suffisant pour un batch de 50 cartes, complexité réduite.
- [x] Q3 — Mode dry-run "Aperçu prompt" ? **Oui** — accessible même sans provider configuré. Modale avec `<pre>` + bouton Copier (permet de coller dans une IA en mode navigateur). Voir §3.4.
- [ ] Q4 — Support Stability AI et fal.ai en v1 ? Architecture prévue pour multi-provider (`callProvider` abstrait), mais seul DALL-E 3 implémenté en v1. Les autres providers ajoutés à la demande.

---

## 11. Notes & références

- DALL-E 3 API : `POST https://api.openai.com/v1/images/generations`, paramètres `model`, `prompt`, `size`, `style`, `n: 1`.
- Stability AI : `POST https://api.stability.ai/v1/generation/{engine}/text-to-image`.
- fal.ai : `POST https://fal.run/fal-ai/flux/dev` (ou variante flux-pro).
- Dépendances npm à ajouter : `node-fetch` (ou `undici`) côté backend pour télécharger les URLs DALL-E. `openai` SDK officiel recommandé.
- Voir TSD-007 §11.3 pour `detectMissingMedia()` qui alimente cette table.
- Voir TSD-004 pour le modèle `media` dans lequel les images générées sont intégrées.
