# Pictorgame / Médias rembg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une case « Supprimer le fond » à l’upload (Médias + Pictorgame) et un bouton ✦ sur les tuiles Pictorgame qui remplace le BLOB en place (même `id` / `ref`).

**Architecture:** Traitement 100 % client via `removeBackground.js` (`@imgly`). Helper `applyRemoveBgToFiles` partagé. Nouvelle route `PUT /api/pictos/:id/content` pour remplacer le contenu picto. Le ✦ Médias (`_nobg` nouveau fichier) reste intact.

**Tech Stack:** Vue 3 Composition API, Express ESM, multer memory, `@imgly/background-removal`, tests Node (`node --test` / assert).

**Spec:** `docs/superpowers/specs/2026-07-17-pictorgame-rembg-design.md`

## Global Constraints

- Mesures UI inchangées (feature média, pas canvas)
- Pas de TypeScript ; ESM ; alias `@/` frontend
- Pas de migration DB
- Médias tuile ✦ : **ne pas modifier** le flux `{base}_nobg.png`
- Picto ✦ : même `id` / `filename` / `picto_ref` ; `source_media_id = NULL` après remplacement
- Commit uniquement si l’utilisateur le demande (sinon skip les steps Commit)

---

## File map

| Path | Responsibility |
|------|----------------|
| `frontend/src/utils/applyRemoveBgToFiles.js` | Boucle rembg optionnelle → `File[]` PNG |
| `frontend/src/utils/applyRemoveBgToFiles.test.js` | Tests helper (removeBg injecté) |
| `frontend/src/utils/removeBackground.js` | Inchangé |
| `frontend/src/views/MediaView.vue` | Toggle upload + appeler helper |
| `frontend/src/components/media/PictorgamePanel.vue` | Toggle upload + ✦ tuile/preview |
| `frontend/src/utils/api.js` | `replacePictoContent(id, formData)` |
| `backend/routes/pictos.js` | `PUT /:id/content` |
| `specs/WORKPLAN.md` | Journal de session |

---

### Task 1: Helper `applyRemoveBgToFiles`

**Files:**
- Create: `frontend/src/utils/applyRemoveBgToFiles.js`
- Create: `frontend/src/utils/applyRemoveBgToFiles.test.js`

**Interfaces:**
- Consumes: `removeBg(source, { onProgress })` from `./removeBackground.js` (injectable)
- Produces:
  ```js
  /**
   * @param {File[]|FileList} files
   * @param {{ enabled?: boolean, onProgress?: Function, removeBgFn?: Function }} [opts]
   * @returns {Promise<File[]>}
   */
  export async function applyRemoveBgToFiles(files, opts)
  ```

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyRemoveBgToFiles } from './applyRemoveBgToFiles.js'

describe('applyRemoveBgToFiles', () => {
  it('returns same files when enabled is false', async () => {
    const f = new File([Uint8Array.of(1, 2, 3)], 'a.jpg', { type: 'image/jpeg' })
    let called = 0
    const out = await applyRemoveBgToFiles([f], {
      enabled: false,
      removeBgFn: async () => { called++; return new Blob([Uint8Array.of(9)], { type: 'image/png' }) },
    })
    assert.equal(called, 0)
    assert.equal(out.length, 1)
    assert.equal(out[0], f)
  })

  it('replaces each image with PNG when enabled', async () => {
    const f = new File([Uint8Array.of(1)], 'hero.JPEG', { type: 'image/jpeg' })
    const out = await applyRemoveBgToFiles([f], {
      enabled: true,
      removeBgFn: async (src) => {
        assert.ok(src instanceof Blob || src instanceof File)
        return new Blob([Uint8Array.of(7, 7)], { type: 'image/png' })
      },
    })
    assert.equal(out.length, 1)
    assert.equal(out[0].name, 'hero.png')
    assert.equal(out[0].type, 'image/png')
  })

  it('skips rembg for non-image mime when enabled', async () => {
    const f = new File([Uint8Array.of(1)], 'x.bin', { type: 'application/octet-stream' })
    let called = 0
    const out = await applyRemoveBgToFiles([f], {
      enabled: true,
      removeBgFn: async () => { called++; return new Blob([]) },
    })
    assert.equal(called, 0)
    assert.equal(out[0], f)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && node --test src/utils/applyRemoveBgToFiles.test.js`  
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```js
// frontend/src/utils/applyRemoveBgToFiles.js
import { removeBg as defaultRemoveBg } from './removeBackground.js'

function baseName(name) {
  return String(name || 'image').replace(/\.[^.]+$/, '') || 'image'
}

/**
 * @param {File[]|FileList|Iterable<File>} files
 * @param {{ enabled?: boolean, onProgress?: Function, removeBgFn?: Function }} [opts]
 * @returns {Promise<File[]>}
 */
export async function applyRemoveBgToFiles(files, opts = {}) {
  const list = Array.from(files || [])
  const { enabled = false, onProgress, removeBgFn } = opts
  if (!enabled) return list

  const rembg = removeBgFn || defaultRemoveBg
  const out = []
  for (const file of list) {
    if (!file?.type?.startsWith('image/')) {
      out.push(file)
      continue
    }
    const blob = await rembg(file, { onProgress })
    out.push(new File([blob], `${baseName(file.name)}.png`, { type: 'image/png' }))
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && node --test src/utils/applyRemoveBgToFiles.test.js`  
Expected: PASS (3 tests)

- [ ] **Step 5: Commit** (si demandé)

```bash
git add frontend/src/utils/applyRemoveBgToFiles.js frontend/src/utils/applyRemoveBgToFiles.test.js
git commit -m "feat: add applyRemoveBgToFiles helper for optional upload rembg"
```

---

### Task 2: Toggle rembg à l’upload Médias

**Files:**
- Modify: `frontend/src/views/MediaView.vue`

**Interfaces:**
- Consumes: `applyRemoveBgToFiles(files, { enabled, onProgress })`
- Produces: UI `removeBgOnUpload` (ref boolean, défaut `false`)

- [ ] **Step 1: Add toggle next to Upload button**

In the header actions (`activeTab === 'library'`), before the Upload button:

```html
<label class="rembg-toggle" title="Traiter chaque image avant envoi">
  <input type="checkbox" v-model="removeBgOnUpload" :disabled="!!processingId" />
  Supprimer le fond
</label>
<button class="btn-primary" :disabled="!!processingId" @click="fileInput.click()">⤒ Upload</button>
```

Add script:

```js
const removeBgOnUpload = ref(false)
```

Minimal CSS (scoped or existing style block):

```css
.rembg-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
  cursor: pointer;
}
.rembg-toggle input { cursor: pointer; }
```

- [ ] **Step 2: Wire upload() to call helper**

Replace `upload` with:

```js
async function upload(e) {
  const raw = e.target.files
  if (!raw?.length) return
  processingId.value = '__upload__'
  downloadProgress.value = null
  try {
    const { applyRemoveBgToFiles } = await import('@/utils/applyRemoveBgToFiles.js')
    const files = await applyRemoveBgToFiles(raw, {
      enabled: removeBgOnUpload.value,
      onProgress(key, current, total) {
        if (key.includes('fetch') && total > 0) {
          downloadProgress.value = { current, total }
        } else {
          downloadProgress.value = null
        }
      },
    })
    downloadProgress.value = null
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    fd.append('folder_id', currentFolder.value === 'root' ? 'default' : currentFolder.value)
    const results = await api.uploadMedia(fd)
    if (Array.isArray(results)) {
      const existingIds = new Set(media.value.map(m => m.id))
      const newFiles = results.filter(r => !r.duplicate && !existingIds.has(r.id))
      const duplicates = results.filter(r => r.duplicate)
      media.value.push(...newFiles)
      if (duplicates.length) {
        showToast(`Déjà présent : ${duplicates.map(r => r.original_name).join(', ')}`, 'info')
      } else if (removeBgOnUpload.value) {
        showToast('Upload terminé (fond supprimé)')
      }
    }
  } catch (err) {
    console.error('Upload failed', err)
    showToast(err.message || 'Échec upload / rembg', 'error')
  } finally {
    processingId.value = null
    downloadProgress.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
}
```

Do **not** change `removeBgFor` (tuile ✦ → `_nobg`).

- [ ] **Step 3: Manual smoke (dev server)**

1. Médias, toggle off, upload JPEG → fichier opaque inchangé.
2. Toggle on, upload → PNG transparent (damier), pas de `_nobg` supplémentaire.
3. Tuile ✦ sur un média → toujours crée `{nom}_nobg.png`.

- [ ] **Step 4: Commit** (si demandé)

```bash
git add frontend/src/views/MediaView.vue
git commit -m "feat(media): optional remove-background toggle on upload"
```

---

### Task 3: Toggle rembg à l’upload Pictorgame

**Files:**
- Modify: `frontend/src/components/media/PictorgamePanel.vue`

**Interfaces:**
- Consumes: `applyRemoveBgToFiles`
- Produces: `removeBgOnUpload` ref ; `onUploadFile` traite le fichier si toggle on **avant** d’ouvrir le formulaire

- [ ] **Step 1: Add toggle + progress state**

In `.pg-toolbar-actions`, before Upload:

```html
<label class="rembg-toggle" title="Traiter l'image avant ouverture du formulaire">
  <input type="checkbox" v-model="removeBgOnUpload" :disabled="!!processingId" />
  Supprimer le fond
</label>
<button class="btn-primary btn-sm" :disabled="!!processingId" @click="uploadInput?.click()">+ Upload picto</button>
```

Script:

```js
const removeBgOnUpload = ref(false)
const processingId = ref(null)
const downloadProgress = ref(null)
```

Reuse or add a small banner like MediaView if `downloadProgress` is set (optional: toast « Traitement… » suffit en v1).

CSS: same `.rembg-toggle` as MediaView (copy into panel scoped styles).

- [ ] **Step 2: Process in onUploadFile**

Replace `onUploadFile`:

```js
async function onUploadFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (uploadInput.value) uploadInput.value.value = ''

  processingId.value = '__upload__'
  try {
    const { applyRemoveBgToFiles } = await import('@/utils/applyRemoveBgToFiles.js')
    const [processed] = await applyRemoveBgToFiles([file], {
      enabled: removeBgOnUpload.value,
      onProgress(key, current, total) {
        if (key.includes('fetch') && total > 0) {
          downloadProgress.value = { current, total }
        } else {
          downloadProgress.value = null
        }
      },
    })
    downloadProgress.value = null
    uploadFile.value = processed
    linkSourceId.value = null
    pictoFormMode.value = 'upload'
    pictoFormError.value = ''
    const base = processed.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    pictoForm.value = { picto_ref: base, picto_label: '', tagIds: [] }
  } catch (err) {
    showToast(err.message || 'Échec suppression fond', 'error')
  } finally {
    processingId.value = null
    downloadProgress.value = null
  }
}
```

`savePicto` upload branch stays the same (`uploadFile` already PNG if toggled).

- [ ] **Step 3: Manual smoke**

1. Toggle off → upload picto → image inchangée.
2. Toggle on → formulaire s’ouvre avec aperçu transparent → Créer → vignette damier, `ref` stable.

- [ ] **Step 4: Commit** (si demandé)

```bash
git add frontend/src/components/media/PictorgamePanel.vue
git commit -m "feat(pictorgame): optional remove-background on picto upload"
```

---

### Task 4: API `PUT /api/pictos/:id/content` + client

**Files:**
- Modify: `backend/routes/pictos.js`
- Modify: `frontend/src/utils/api.js`

**Interfaces:**
- Produces:
  - `PUT /api/pictos/:id/content` multipart field `files` (1 file) → picto JSON
  - `api.replacePictoContent(id, formData)` → same fetch pattern as `createPictoUpload`

- [ ] **Step 1: Add route before `router.delete`**

Insert in `backend/routes/pictos.js` (after `router.patch`, before `router.delete`):

```js
router.put('/:id/content', upload.array('files', 1), async (req, res) => {
  try {
    const db = getDb()
    const existing = await db.prepare(
      `SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ? AND kind = 'picto'`,
    ).get(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Not found' })

    const files = req.files || []
    if (!files.length) return res.status(400).json({ error: 'files required' })
    if (files.length > 1) return res.status(400).json({ error: 'One file required' })

    const file = files[0]
    const mime = file.mimetype || 'image/png'
    const originalName = file.originalname || existing.original_name || 'picto.png'

    await db.prepare(`
      UPDATE media
      SET content = ?, mime_type = ?, original_name = ?, source_media_id = NULL
      WHERE id = ? AND kind = 'picto'
    `).run(file.buffer, mime, originalName, req.params.id)

    res.json(await getPictoById(db, req.params.id))
  } catch (err) {
    sendError(res, err)
  }
})
```

Keep `id` and `filename` unchanged (stable `/uploads/${id}`).

- [ ] **Step 2: Add api method**

In `frontend/src/utils/api.js`, after `createPictoUpload`:

```js
replacePictoContent: (id, formData) => {
  return fetch(`${BASE}/pictos/${encodeURIComponent(id)}/content`, {
    method: 'PUT',
    body: formData,
    credentials: 'include',
  }).then(async (r) => {
    if (r.status === 401) {
      const loc = `${window.location.pathname}${window.location.search}`
      if (!loc.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(loc || '/layouts')}`
      }
      throw new Error('Non authentifié')
    }
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }))
      throw new Error(err.error || `API error ${r.status}`)
    }
    return r.json()
  })
},
```

- [ ] **Step 3: Quick API smoke (optional curl while logged in session cookie)**

Or skip to Task 5 UI which exercises the route.

- [ ] **Step 4: Commit** (si demandé)

```bash
git add backend/routes/pictos.js frontend/src/utils/api.js
git commit -m "feat(api): PUT pictos/:id/content for in-place image replace"
```

---

### Task 5: Bouton ✦ Pictorgame (remplace en place)

**Files:**
- Modify: `frontend/src/components/media/PictorgamePanel.vue`

**Interfaces:**
- Consumes: `api.replacePictoContent`, `removeBg` / `applyRemoveBgToFiles`
- Produces: `removeBgFor(p)`, `cacheBust` map ou query sur `pictoSrc`

- [ ] **Step 1: Cache-bust helper for thumbnails**

```js
const thumbBust = ref({}) // id → number

function pictoSrc(p) {
  const base = `/uploads/${p.filename || p.id}`
  const t = thumbBust.value[p.id]
  return t ? `${base}?t=${t}` : base
}
```

- [ ] **Step 2: Add ✦ on card actions + preview**

In `.media-actions` (before ✎):

```html
<button
  class="btn-icon btn-sm btn-rembg"
  :disabled="!!processingId"
  title="Supprimer le fond"
  @click="removeBgFor(p)"
>
  ✦
</button>
```

In preview modal actions (add a row if missing):

```html
<button
  class="btn-ghost btn-sm"
  :disabled="!!processingId"
  @click="removeBgFor(preview)"
>✦ Supprimer le fond</button>
```

Add class on card: `:class="{ processing: processingId === p.id }"`.

- [ ] **Step 3: Implement removeBgFor**

```js
async function removeBgFor(p) {
  if (!p?.id || processingId.value) return
  processingId.value = p.id
  downloadProgress.value = null
  try {
    const { removeBg } = await import('@/utils/removeBackground.js')
    const imgResp = await fetch(pictoSrc(p).split('?')[0])
    if (!imgResp.ok) throw new Error(`Cannot fetch image: ${imgResp.status}`)
    const imgBlob = await imgResp.blob()
    const blob = await removeBg(imgBlob, {
      onProgress(key, current, total) {
        if (key.includes('fetch') && total > 0) {
          downloadProgress.value = { current, total }
        } else {
          downloadProgress.value = null
        }
      },
    })
    downloadProgress.value = null
    const base = (p.original_name || p.picto_ref || 'picto').replace(/\.[^.]+$/, '')
    const fd = new FormData()
    fd.append('files', new File([blob], `${base}.png`, { type: 'image/png' }))
    await api.replacePictoContent(p.id, fd)
    thumbBust.value = { ...thumbBust.value, [p.id]: Date.now() }
    await pictosStore.load(true)
    showToast('Fond supprimé')
  } catch (e) {
    console.error(e)
    showToast(e.message || 'Échec suppression fond', 'error')
  } finally {
    processingId.value = null
    downloadProgress.value = null
  }
}
```

Optional: copy the SVG wand icon from `MediaView` instead of `✦` text for visual parity.

- [ ] **Step 4: Manual QA (spec §7)**

1. ✦ sur picto opaque → même `ref`, vignette transparente.
2. Picto lié à un média : média source dans onglet Médias **inchangé**.
3. Médias ✦ tuile → toujours `_nobg` (non-régression).
4. Upload toggles Médias + Pictorgame (Tasks 2–3).

- [ ] **Step 5: Commit** (si demandé)

```bash
git add frontend/src/components/media/PictorgamePanel.vue
git commit -m "feat(pictorgame): in-place remove-background on picto tiles"
```

---

### Task 6: WORKPLAN journal

**Files:**
- Modify: `specs/WORKPLAN.md`

- [ ] **Step 1: Add session journal line**

At top of section `f) Journal des sessions` table:

```markdown
| 2026-07-17 (32) | Rembg : toggle « Supprimer le fond » à l’upload (Médias + Pictorgame) ; ✦ Pictorgame remplace le BLOB en place (`PUT /pictos/:id/content`) ; Médias ✦ `_nobg` inchangé. |
```

- [ ] **Step 2: Commit** (si demandé)

```bash
git add specs/WORKPLAN.md
git commit -m "docs: WORKPLAN session rembg upload + pictorgame"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Toggle upload Médias | 2 |
| Toggle upload Pictorgame | 3 |
| Helper partagé | 1 |
| ✦ Pictorgame in-place | 5 |
| `PUT …/content` + detach `source_media_id` | 4 |
| Médias ✦ `_nobg` inchangé | 2 (explicit non-touch) |
| Cache bust vignette | 5 |
| Progress modèle IA | 2, 3, 5 |
| WORKPLAN | 6 |
