# Pictorgame + atome `picto` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un catalogue Pictorgame (médias `kind=picto` + tags colorés), un atome `picto` (tag/ref/view), et les shortcodes RichText `/ref` et `\ref`.

**Architecture:** Les pictos restent dans la table `media` avec colonnes `kind`, `picto_ref`, `picto_label`, `source_media_id` ; tags dans `picto_tags` + N:N `media_picto_tags`. API `/api/picto-tags` et `/api/pictos`. Frontend : onglet Media dédié, store catalogue, atome `AtomPicto`, parseur RichText étendu.

**Tech Stack:** Vue 3 Composition API, Pinia, Express ESM, better-sqlite3 (+ MySQL tryAlter), fetch `api.js`.

**Spec:** `specs/TSD-021-pictorgame.md`

## Global Constraints

- Mesures visuelles en **mm** ; police relative via `% hauteur layout` (comme `badge`)
- Pas de TypeScript ; ESM partout ; alias `@/` frontend
- Migrations DB **idempotentes** (`tryAlter` / `try { ALTER } catch {}`)
- Checklist atome : `atoms/index.js` → `AtomRenderer` → `PropertiesPanel` ENUM_MAPS → `AtomConfigPanel` / `paramHelp`
- Shortcodes RichText réservés prioritaires : `/D8`, `/D12`, `/R{…}`, stats, `/SVG{…}`
- Refs picto : slug `[a-zA-Z0-9_-]+`, uniques pour `kind='picto'`
- Commit uniquement si l’utilisateur le demande (sinon skip les steps Commit)

---

## File map

| Path | Responsibility |
|------|----------------|
| `backend/db/schema.sql` | Colonnes media + tables tags |
| `backend/db/database.js` | Migrations SQLite/MySQL + snapshots |
| `backend/services/mediaStorage.js` | Colonnes liste + resolve image via `source_media_id` |
| `backend/routes/media.js` | Filtrer `kind=media` sur GET `/` |
| `backend/routes/pictoTags.js` | CRUD tags |
| `backend/routes/pictos.js` | CRUD pictos + upload/link |
| `backend/server.js` | Mount routes |
| `frontend/src/utils/api.js` | Client HTTP |
| `frontend/src/stores/pictos.js` | Cache tags + pictos |
| `frontend/src/views/MediaView.vue` | Onglet Pictorgame |
| `frontend/src/components/media/PictorgamePanel.vue` | UI tags + grille + modales |
| `frontend/src/atoms/index.js` | Type `picto` |
| `frontend/src/atoms/components/AtomPicto.vue` | Rendu 6 vues |
| `frontend/src/atoms/paramHelp.js` | Tooltips params |
| `frontend/src/components/editor/AtomRenderer.vue` | Map type → composant |
| `frontend/src/components/editor/PropertiesPanel.vue` | Selects tag/ref/view |
| `frontend/src/utils/richTextParser.js` | Tokens picto |
| `frontend/src/atoms/components/AtomRichText.vue` | Rendu token picto |
| `frontend/src/utils/richTextParser.pictos.test.js` | Tests parseur (node assert) |
| `specs/WORKPLAN.md` | Journal session |

---

### Task 1: Schema + serve image + filtre médias

**Files:**
- Modify: `backend/db/schema.sql`
- Modify: `backend/db/database.js`
- Modify: `backend/services/mediaStorage.js`
- Modify: `backend/routes/media.js`

**Interfaces:**
- Produces: colonnes `media.kind|picto_ref|picto_label|source_media_id` ; tables `picto_tags`, `media_picto_tags` ; `MEDIA_LIST_COLUMNS` étendu ; `getMediaForServe` suit `source_media_id` ; `GET /api/media` exclut les pictos

- [ ] **Step 1: Étendre `schema.sql`**

Dans `CREATE TABLE media`, ajouter (ou documenter via commentaires si table déjà créée — les ALTER vivent dans `database.js`) :

Après la définition `media`, ajouter :

```sql
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
```

Ne pas casser le `CREATE TABLE media` existant : les nouvelles colonnes passent par migrations (Step 2). Optionnel : si tu recrées le schéma from scratch, ajoute dans `media` :

```sql
  kind TEXT NOT NULL DEFAULT 'media',
  picto_ref TEXT,
  picto_label TEXT,
  source_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
```

- [ ] **Step 2: Migrations idempotentes dans `database.js`**

Dans `initMysqlMigrations` / `initSqliteSync` (même pattern que `content LONGBLOB`) :

```js
await tryAlter("ALTER TABLE media ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'media'")
await tryAlter('ALTER TABLE media ADD COLUMN picto_ref VARCHAR(128) NULL')
await tryAlter('ALTER TABLE media ADD COLUMN picto_label VARCHAR(255) NULL')
await tryAlter('ALTER TABLE media ADD COLUMN source_media_id VARCHAR(255) NULL')
await tryAlter(`CREATE TABLE IF NOT EXISTS picto_tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(128) NOT NULL UNIQUE,
  color VARCHAR(32) NOT NULL DEFAULT '#888888',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`)
await tryAlter(`CREATE TABLE IF NOT EXISTS media_picto_tags (
  media_id VARCHAR(255) NOT NULL,
  tag_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (media_id, tag_id)
)`)
```

SQLite équivalent avec `TEXT` / `try { sqliteDb.exec(...) } catch {}`.

Unicité `picto_ref` : enforce en application (Task 3). Optionnel :

```js
try { sqliteDb.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_media_picto_ref ON media(picto_ref) WHERE kind = 'picto' AND picto_ref IS NOT NULL") } catch {}
```

Mettre à jour `createSnapshot` / `restoreSnapshot` : ajouter `'picto_tags'` et `'media_picto_tags'` dans les listes `tables` (dump après `media` ; restore : delete `media_picto_tags` avant `media`, insert après).

- [ ] **Step 3: Étendre `mediaStorage.js`**

```js
export const MEDIA_LIST_COLUMNS =
  'id, filename, original_name, mime_type, width_px, height_px, folder_id, kind, picto_ref, picto_label, source_media_id, created_at'

export async function getMediaForServe(db, filename) {
  const row = await db.prepare(
    'SELECT id, content, mime_type, source_media_id FROM media WHERE id = ? OR filename = ?'
  ).get(filename, filename)
  if (!row) return null
  let buf = toBuffer(row.content)
  let mime = row.mime_type
  if (!buf && row.source_media_id) {
    const src = await db.prepare(
      'SELECT content, mime_type FROM media WHERE id = ?'
    ).get(row.source_media_id)
    buf = toBuffer(src?.content)
    mime = src?.mime_type || mime
  }
  if (!buf) return null
  return { buffer: buf, mime_type: mime || guessMimeFromFilename(filename) }
}
```

Mettre à jour `insertMediaRecord` pour accepter `kind = 'media'` par défaut et colonnes optionnelles si besoin (Task 3 peut faire un INSERT dédié).

- [ ] **Step 4: Filtrer GET `/api/media`**

Dans `backend/routes/media.js` GET `/` :

```sql
SELECT ${MEDIA_LIST_COLUMNS} FROM media
WHERE (kind = 'media' OR kind IS NULL OR kind = '')
  AND (...folder_id si présent...)
ORDER BY original_name
```

- [ ] **Step 5: Vérifier**

Redémarrer le backend. `curl -s http://localhost:3001/api/media | head` doit répondre JSON (pas d’erreur SQL).  
`sqlite3` ou log : tables `picto_tags` / `media_picto_tags` existent.

- [ ] **Step 6: Commit** (si demandé)

```bash
git add backend/db/schema.sql backend/db/database.js backend/services/mediaStorage.js backend/routes/media.js
git commit -m "$(cat <<'EOF'
Add pictorgame media columns, tag tables, and source image resolve

EOF
)"
```

---

### Task 2: API `picto-tags`

**Files:**
- Create: `backend/routes/pictoTags.js`
- Modify: `backend/server.js`

**Interfaces:**
- Consumes: tables Task 1
- Produces: `GET/POST/PATCH/DELETE /api/picto-tags`

- [ ] **Step 1: Créer `backend/routes/pictoTags.js`**

```js
import { Router } from 'express'
import { randomUUID } from 'crypto'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/', async (_req, res) => {
  const db = getDb()
  const rows = await db.prepare('SELECT id, name, color, created_at FROM picto_tags ORDER BY name').all()
  res.json(rows)
})

router.post('/', async (req, res) => {
  const db = getDb()
  const name = String(req.body?.name || '').trim()
  const color = String(req.body?.color || '#888888').trim()
  if (!name) return res.status(400).json({ error: 'name required' })
  const id = randomUUID()
  try {
    await db.prepare('INSERT INTO picto_tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color)
  } catch (e) {
    return res.status(409).json({ error: 'Tag name already exists' })
  }
  const row = await db.prepare('SELECT id, name, color, created_at FROM picto_tags WHERE id = ?').get(id)
  res.status(201).json(row)
})

router.patch('/:id', async (req, res) => {
  const db = getDb()
  const existing = await db.prepare('SELECT * FROM picto_tags WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name
  const color = req.body.color !== undefined ? String(req.body.color).trim() : existing.color
  if (!name) return res.status(400).json({ error: 'name required' })
  try {
    await db.prepare('UPDATE picto_tags SET name = ?, color = ? WHERE id = ?').run(name, color, req.params.id)
  } catch {
    return res.status(409).json({ error: 'Tag name already exists' })
  }
  res.json(await db.prepare('SELECT id, name, color, created_at FROM picto_tags WHERE id = ?').get(req.params.id))
})

router.delete('/:id', async (req, res) => {
  const db = getDb()
  await db.prepare('DELETE FROM media_picto_tags WHERE tag_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM picto_tags WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 2: Monter dans `server.js`**

```js
import pictoTagsRouter from './routes/pictoTags.js'
app.use('/api/picto-tags', pictoTagsRouter)
```

- [ ] **Step 3: Vérifier avec curl** (session cookie si auth requise — utiliser le même flux que le reste de l’app)

```bash
curl -s -X POST http://localhost:3001/api/picto-tags \
  -H 'Content-Type: application/json' \
  -d '{"name":"ressource","color":"#fbbf24"}'
curl -s http://localhost:3001/api/picto-tags
```

Expected: 201 puis liste contenant `ressource`.

- [ ] **Step 4: Commit** (si demandé)

---

### Task 3: API `pictos`

**Files:**
- Create: `backend/routes/pictos.js`
- Modify: `backend/server.js`
- Modify: `backend/services/mediaStorage.js` (helper insert picto si utile)

**Interfaces:**
- Consumes: tags API, media storage
- Produces:
  - `GET /api/pictos?tag=<id>&tag=<id>` → pictos + `tags: [{id,name,color}]`
  - `POST /api/pictos` multipart (`files` + `picto_ref` + `picto_label` + `tagIds` JSON) **ou** JSON `{ source_media_id, picto_ref, picto_label, tagIds }`
  - `PATCH /api/pictos/:id`, `DELETE /api/pictos/:id`

- [ ] **Step 1: Helpers de validation**

```js
const REF_RE = /^[a-zA-Z0-9_-]+$/
function assertRef(ref) {
  const r = String(ref || '').trim()
  if (!r || !REF_RE.test(r)) {
    const err = new Error('Invalid picto_ref')
    err.status = 400
    throw err
  }
  return r
}
```

Avant insert/update : si un autre row `kind='picto'` a le même `picto_ref` → 409.

- [ ] **Step 2: Implémenter GET avec tags**

Joindre `media_picto_tags` + `picto_tags`. Filtrer `kind='picto'`. Si `req.query.tag` (string ou array) : `media_id IN (SELECT media_id FROM media_picto_tags WHERE tag_id IN (...))` avec logique OR (DISTINCT).

Réponse item :

```json
{
  "id": "...",
  "filename": "...",
  "picto_ref": "or",
  "picto_label": "Or",
  "source_media_id": null,
  "kind": "picto",
  "tags": [{ "id": "...", "name": "ressource", "color": "#fbbf24" }]
}
```

- [ ] **Step 3: POST upload**

Multer memory comme `media.js`. Pour chaque fichier : SHA1 filename, `insert` avec `kind='picto'`, `picto_ref`, `picto_label`, `folder_id='default'`, puis sync `media_picto_tags` depuis `tagIds` (JSON string dans body).

Colonnes INSERT explicites (ne pas casser `insertMediaRecord` existant) :

```sql
INSERT INTO media (id, filename, original_name, mime_type, width_px, height_px, folder_id, content, kind, picto_ref, picto_label, source_media_id)
VALUES (?, ?, ?, ?, NULL, NULL, 'default', ?, 'picto', ?, ?, NULL)
```

- [ ] **Step 4: POST link JSON**

Body `{ source_media_id, picto_ref, picto_label, tagIds }`. Vérifier source existe et `kind` media. Créer nouvelle ligne `kind=picto` avec `content=NULL`, `filename`/`id` = `picto-${uuid}${ext}` ou réutiliser un id unique, `source_media_id` set, `mime_type` / `original_name` copiés du source.

- [ ] **Step 5: PATCH / DELETE**

PATCH : `picto_ref`, `picto_label`, `tagIds` (replace links), `source_media_id` optionnel.  
DELETE : `DELETE FROM media WHERE id=? AND kind='picto'`.

- [ ] **Step 6: Mount `app.use('/api/pictos', pictosRouter)`**

- [ ] **Step 7: Vérifier**

Créer tag, upload ou link un picto, `GET /api/pictos?tag=...`, ref dupliquée → 409.

- [ ] **Step 8: Commit** (si demandé)

---

### Task 4: Client API + store Pinia

**Files:**
- Modify: `frontend/src/utils/api.js`
- Create: `frontend/src/stores/pictos.js`

**Interfaces:**
- Produces: `api.getPictoTags`, `createPictoTag`, `updatePictoTag`, `deletePictoTag`, `getPictos`, `createPictoUpload`, `createPictoLink`, `updatePicto`, `deletePicto`
- Store: `usePictosStore()` avec `tags`, `pictos`, `load()`, `pictosByTag(tagId)`, `byRef(ref)`

- [ ] **Step 1: Ajouter méthodes dans `api.js`** (près des méthodes media)

```js
getPictoTags: () => request('/picto-tags'),
createPictoTag: (data) => request('/picto-tags', { method: 'POST', body: data }),
updatePictoTag: (id, data) => request(`/picto-tags/${id}`, { method: 'PATCH', body: data }),
deletePictoTag: (id) => request(`/picto-tags/${id}`, { method: 'DELETE' }),

getPictos: (tagIds) => {
  const q = new URLSearchParams()
  ;(tagIds || []).forEach((t) => q.append('tag', t))
  const qs = q.toString()
  return request(qs ? `/pictos?${qs}` : '/pictos')
},
createPictoLink: (data) => request('/pictos', { method: 'POST', body: data }),
updatePicto: (id, data) => request(`/pictos/${id}`, { method: 'PATCH', body: data }),
deletePicto: (id) => request(`/pictos/${id}`, { method: 'DELETE' }),
createPictoUpload: (formData) =>
  fetch(`${BASE}/pictos`, { method: 'POST', body: formData, credentials: 'include' })
    .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json() }),
```

- [ ] **Step 2: Store `frontend/src/stores/pictos.js`**

```js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/utils/api'

export const usePictosStore = defineStore('pictos', () => {
  const tags = ref([])
  const pictos = ref([])
  const loaded = ref(false)

  async function load(force = false) {
    if (loaded.value && !force) return
    const [t, p] = await Promise.all([api.getPictoTags(), api.getPictos()])
    tags.value = t
    pictos.value = p
    loaded.value = true
  }

  function byRef(ref) {
    const r = String(ref || '').trim()
    return pictos.value.find((p) => p.picto_ref === r) || null
  }

  function pictosForTag(tagId) {
    if (!tagId) return pictos.value
    return pictos.value.filter((p) => (p.tags || []).some((t) => t.id === tagId || t.name === tagId))
  }

  return { tags, pictos, loaded, load, byRef, pictosForTag }
})
```

- [ ] **Step 3: Vérifier** — depuis la console navigateur après login : `api.getPictoTags()`.

- [ ] **Step 4: Commit** (si demandé)

---

### Task 5: UI Media — onglet Pictorgame

**Files:**
- Create: `frontend/src/components/media/PictorgamePanel.vue`
- Modify: `frontend/src/views/MediaView.vue`

**Interfaces:**
- Consumes: store + api Task 4
- Produces: onglet UI tags CRUD + grille pictos + upload/link/edit

- [ ] **Step 1: Brancher l’onglet dans `MediaView.vue`**

```js
// activeTab: 'library' | 'pictorgame' | 'missing'
```

Bouton tab « Pictorgame ». Si `activeTab === 'pictorgame'`, rendre `<PictorgamePanel />` (masquer upload/folders library).

- [ ] **Step 2: Implémenter `PictorgamePanel.vue`**

Layout :
- gauche : liste tags (couleur + nom), `+ Tag` (prompt ou mini-form name+color), edit, delete
- droite : chips filtre tag, grille cartes (`/uploads/${id}`), toolbar Upload + Lier média
- modale édition : ref, label, multi-select tags

Réutiliser styles existants de `MediaView` (classes `media-card`, `btn-primary`, etc.) via classes partagées ou scoped copies minimales.

Upload : `FormData` avec `files`, `picto_ref`, `picto_label`, `tagIds` (JSON string).  
Lier : picker simple — `api.getMedia()` liste, choisir un id → `createPictoLink`.

- [ ] **Step 3: Vérifier manuellement**

1. Créer tags « ressource » (jaune) et « arme » (gris)
2. Upload 2 pictos, multi-tags
3. Filtrer par tag
4. Lier un média existant
5. Onglet Médias ne montre plus les pictos

- [ ] **Step 4: Commit** (si demandé)

---

### Task 6: Atome `picto` (registry + composant + renderer)

**Files:**
- Modify: `frontend/src/atoms/index.js`
- Create: `frontend/src/atoms/components/AtomPicto.vue`
- Modify: `frontend/src/atoms/paramHelp.js`
- Modify: `frontend/src/components/editor/AtomRenderer.vue`
- Modify: `frontend/src/atoms/index.js` export si barre d’outils lit `ATOM_TYPES`

**Interfaces:**
- Consumes: `usePictosStore().byRef(ref)`
- Produces: type `picto` rendu sur canvas

- [ ] **Step 1: Ajouter dans `ATOM_TYPES`** (près de `badge`)

```js
picto: {
  label: 'Picto',
  icon: '⌖',
  defaultParams: {
    tag: '',
    ref: '',
    view: 'horizontal',
    iconSize: 6,
    gap: 1,
    fit: 'contain',
    fontSize: 2.8,
    fontFamily: null,
    fontWeight: 400,
    color: null,
    textAlign: 'left',
    opacity: 1,
  },
  defaultSize: { width_mm: 24, height_mm: 8 },
},
```

- [ ] **Step 2: Créer `AtomPicto.vue`**

S’inspirer de `AtomBadge.vue` :
- `onMounted` / watch → `usePictosStore().load()`
- resolve `byRef(params.ref)` → `mediaId = picto.id`, `label = picto.picto_label`
- `view` → flags showIcon/showLabel + flexDirection + order (inverse = label first via `order` CSS ou template branches)
- image : `/uploads/${mediaId}`
- styles mm via `useAtomScale` + `useLayoutRelativeFontMm`

Vues :
| view | icon | label | direction | order |
|------|------|-------|-----------|-------|
| icon | yes | no | row | — |
| horizontal | yes | yes | row | icon, label |
| vertical | yes | yes | column | icon, label |
| horizontal-inverse | yes | yes | row | label, icon |
| vertical-inverse | yes | yes | column | label, icon |
| text | no | yes | row | — |

- [ ] **Step 3: Brancher `AtomRenderer.vue`**

```js
import AtomPicto from '@/atoms/components/AtomPicto.vue'
// map:
picto: AtomPicto,
```

- [ ] **Step 4: `paramHelp.js`** — entrées `tag`, `ref`, `view`, `iconSize` (si absentes).

- [ ] **Step 5: Vérifier** — placer atome Picto dans l’éditeur ; sans ref → `?` ; avec ref existant → image+label.

- [ ] **Step 6: Commit** (si demandé)

---

### Task 7: PropertiesPanel — selects Tag / Ref / View

**Files:**
- Modify: `frontend/src/components/editor/PropertiesPanel.vue`

**Interfaces:**
- Consumes: `usePictosStore`
- Produces: UI cascade tag → ref (`ref - label`) ; enum `view`

- [ ] **Step 1: ENUM_MAPS**

```js
view: ['icon', 'horizontal', 'vertical', 'horizontal-inverse', 'vertical-inverse', 'text'],
```

- [ ] **Step 2: Section dédiée si `el.atomType === 'picto'`**

Deux `<select>` (ou combobox binding-aware comme les autres params) :
1. Tag : options `store.tags` (`value=id` ou `name` — **utiliser `name` ou `id` de façon cohérente avec le store filter** ; préférer **tag id** en stockage param, label affiché = name). Spec dit « tag » : stocker l’**id** du tag (stable) ; afficher `name`.
2. Ref : options `store.pictosForTag(params.tag)` ; `value=picto_ref` ; label `${picto_ref} - ${picto_label}`

Charger store au mount de la section.  
Garder le binding `{{…}}` : si la valeur actuelle ressemble à `{{`, afficher l’input texte binding existant plutôt que le select (même pattern que les autres params bindables du panel — inspecter comment `mediaId` / enums gèrent déjà le binding).

- [ ] **Step 3: Vérifier** — choisir tag filtre la liste ref ; changer view met à jour le canvas.

- [ ] **Step 4: Commit** (si demandé)

---

### Task 8: RichText `/ref` et `\ref`

**Files:**
- Modify: `frontend/src/utils/richTextParser.js`
- Create: `frontend/src/utils/richTextParser.pictos.test.js`
- Modify: `frontend/src/atoms/components/AtomRichText.vue`

**Interfaces:**
- Produces: token `{ type: 'picto', ref: string, withLabel: boolean }`
- Rendu inline image ± label

- [ ] **Step 1: Écrire le test parseur (TDD)**

Créer `frontend/src/utils/richTextParser.pictos.test.js` :

```js
import { tokenize } from './richTextParser.js'
import assert from 'node:assert/strict'

const tokens = tokenize('Coût /or et \\epee-longue puis /D8{3}')
const types = tokens.map((t) => t.type)
assert.ok(types.includes('picto'))
assert.ok(types.includes('die'))
const icon = tokens.find((t) => t.type === 'picto' && t.ref === 'or')
assert.equal(icon.withLabel, false)
const labeled = tokens.find((t) => t.type === 'picto' && t.ref === 'epee-longue')
assert.equal(labeled.withLabel, true)
const die = tokens.find((t) => t.type === 'die')
assert.equal(die.sides, 8)
console.log('ok richTextParser pictos')
```

- [ ] **Step 2: Run — doit FAIL**

```bash
cd frontend && node src/utils/richTextParser.pictos.test.js
```

Expected: FAIL (pas de token picto / assert).

- [ ] **Step 3: Étendre `TOKEN_RE` et `tokenize`**

Ordre : shortcodes existants **d’abord**, puis :

```js
// Ajouter dans l’alternance regex (après /SVG) :
// \\/[a-zA-Z0-9_-]+   pour \ref  — attention échappement
// \/[a-zA-Z0-9_-]+    pour /ref  — mais NE DOIT PAS manger /D8{…} déjà matchés

const TOKEN_RE = /(\$\$\$[\s\S]+?\$\$\$|\$\$[^$]+?\$\$|\/D12\{[^}]*\}|\/D8\{[^}]*\}|\/R\{[^}]*\}|\/(FOR|DEX|INI|CHA|MAG|DEV|VIE|DEF)(?:\{[^}]*\})?|\/SVG\{[^}]*\}|\\[a-zA-Z0-9_-]+|\/[a-zA-Z0-9_-]+)/g
```

Dans la boucle, avant le fallback stat :

```js
} else if (raw.startsWith('\\')) {
  tokens.push({ type: 'picto', ref: raw.slice(1), withLabel: true })
} else if (/^\/[a-zA-Z0-9_-]+$/.test(raw)) {
  tokens.push({ type: 'picto', ref: raw.slice(1), withLabel: false })
} else {
  // stat existant
}
```

Note : `/FOR` reste capturé par la branche stats (groupe alternance plus spécifique avant `/[a-zA-Z0-9_-]+`).

- [ ] **Step 4: Run test — PASS**

```bash
cd frontend && node src/utils/richTextParser.pictos.test.js
```

Expected: `ok richTextParser pictos`

- [ ] **Step 5: Rendu dans `AtomRichText.vue`**

```vue
<span v-else-if="token.type === 'picto'" class="rt-picto" :style="inlineTagStyle">
  <img
    v-if="pictoMediaId(token.ref)"
    :src="`/uploads/${pictoMediaId(token.ref)}`"
    class="rt-picto-img"
    :style="dieSpanStyle"
    alt=""
  />
  <span v-else class="rt-picto-missing">?{{ token.ref }}</span>
  <span v-if="token.withLabel" class="rt-picto-label">{{ pictoLabel(token.ref) }}</span>
</span>
```

```js
import { usePictosStore } from '@/stores/pictos'
const pictosStore = usePictosStore()
pictosStore.load()
function pictoMediaId(ref) { return pictosStore.byRef(ref)?.id || null }
function pictoLabel(ref) { return pictosStore.byRef(ref)?.picto_label || ref }
```

- [ ] **Step 6: Non-régression manuelle** — contenu RichText avec `/D8{3}`, `/R{or,1}`, `/FOR{+1}`, `/or`, `\or`.

- [ ] **Step 7: Commit** (si demandé)

---

### Task 9: WORKPLAN + polish TSD

**Files:**
- Modify: `specs/WORKPLAN.md`
- Modify: `specs/TSD-021-pictorgame.md` (Status → Review ou Done)

- [x] **Step 1:** Cocher / ajouter tâches Pictorgame ; journal session date du jour ; recalcul % si la structure du WORKPLAN le demande.
- [x] **Step 2:** Status TSD → `Review` (ou `Done` si QA OK).
- [x] **Step 3: Commit** (si demandé)

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Onglet Pictorgame séparé | 5 |
| Tags globaux nom+couleur | 2, 5 |
| media kind + ref/label/source | 1, 3 |
| Upload + lien média | 3, 5 |
| API tags + pictos | 2, 3, 4 |
| Atome tag+ref+6 views | 6, 7 |
| RichText `/ref` `\ref` | 8 |
| Snapshots nouvelles tables | 1 |
| Filtrer bibliothèque médias | 1, 5 |
| Config atomes / paramHelp | 6 (AtomConfigPanel lit `ATOM_TYPES` automatiquement — vérifier ; sinon ajouter entrée si whitelist) |

**Check AtomConfigPanel :** si une whitelist de types existe, ajouter `picto`. Sinon rien à faire.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-07-17-pictorgame.md` (spec : `specs/TSD-021-pictorgame.md`).

**Two execution options:**

1. **Subagent-Driven (recommended)** — un sous-agent frais par task, review entre les tasks  
2. **Inline Execution** — exécution dans cette session avec checkpoints  

Which approach?
