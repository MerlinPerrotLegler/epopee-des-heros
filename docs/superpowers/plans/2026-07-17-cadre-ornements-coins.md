# Cadre — ornements de coins (TSD-024) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter des ornements SVG (étoile 4/5, rond, carré, triangle) aux coins de l’atome Cadre, avec forme commune, taille en mm, et masquage par coin.

**Architecture:** Helper pur `cornerOrnaments.js` qui calcule les éléments SVG (centres + géométrie). `AtomCadre.vue` les rend par-dessus les traits calligraphiques. Params exposés via `defaultParams` → PropertiesPanel / AtomConfig.

**Tech Stack:** Vue 3 Composition API, ESM, tests Node (`node --test` / assert).

**Spec:** `specs/TSD-024-cadre-ornements-coins.md`

## Global Constraints

- Mesures en **mm** ; conversion écran via `SCALE = 10` déjà utilisé dans `AtomCadre.vue` (unités SVG = mm × 10)
- Couleur des ornements = `params.color` (même `strokeColor` que le trait) — pas de `cornerColor`
- Forme unique `cornerShape` ; visibilité par coin via 4 booléens
- Pas de TypeScript ; alias `@/`
- Commit **uniquement** si l’utilisateur le demande (sinon skip les steps Commit)
- Mettre à jour `specs/WORKPLAN.md` en fin de session

---

## File map

| Path | Responsibility |
|------|----------------|
| `frontend/src/utils/cornerOrnaments.js` | Géométrie SVG des formes + liste des coins visibles |
| `frontend/src/utils/cornerOrnaments.test.js` | Tests Node assert |
| `frontend/src/atoms/index.js` | `cadre.defaultParams` |
| `frontend/src/atoms/paramHelp.js` | Tooltips FR |
| `frontend/src/components/editor/PropertiesPanel.vue` | `ENUM_MAPS.cornerShape` + step `cornerSize` |
| `frontend/src/atoms/components/AtomCadre.vue` | Rendu SVG des ornements |
| `specs/TSD-024-cadre-ornements-coins.md` | Status → Done en fin d’impl |
| `specs/WORKPLAN.md` | Journal de session |

---

### Task 1: Helper `cornerOrnaments` + tests

**Files:**
- Create: `frontend/src/utils/cornerOrnaments.js`
- Create: `frontend/src/utils/cornerOrnaments.test.js`

**Interfaces:**
- Produces:
  - `CORNER_SHAPES = ['none', 'star4', 'star5', 'circle', 'square', 'triangle']`
  - `buildCornerOrnaments({ svgW, svgH, pad, shape, sizeSvg, corners }) → Ornament[]`
  - `Ornament = { key: 'TL'|'TR'|'BL'|'BR', kind: string, cx, cy, r, rotationDeg?, points? }`
  - `corners = { TL?: boolean, TR?: boolean, BL?: boolean, BR?: boolean }` (défaut true si absent)
  - Si `shape === 'none'` ou `sizeSvg <= 0` → `[]`
  - Centres : TL `(pad,pad)`, TR `(svgW-pad,pad)`, BL `(pad,svgH-pad)`, BR `(svgW-pad,svgH-pad)`
  - Triangle : `rotationDeg` pointe vers l’extérieur (TL −45°, TR 45°, BR 135°, BL −135°)
  - `starPath(cx, cy, outerR, points, innerRatio)` helper interne pour star4/star5 (retourne string `d` ou points — au choix, documenté dans le module)

- [ ] **Step 1: Écrire les tests (fail attendu)**

```js
// frontend/src/utils/cornerOrnaments.test.js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCornerOrnaments, CORNER_SHAPES } from './cornerOrnaments.js'

describe('buildCornerOrnaments', () => {
  it('exposes expected shapes', () => {
    assert.deepEqual(CORNER_SHAPES, ['none', 'star4', 'star5', 'circle', 'square', 'triangle'])
  })

  it('returns empty when shape is none', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'none', sizeSvg: 20,
      corners: { TL: true, TR: true, BL: true, BR: true },
    })
    assert.deepEqual(out, [])
  })

  it('returns 4 ornaments by default for star4', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'star4', sizeSvg: 20, corners: {},
    })
    assert.equal(out.length, 4)
    assert.deepEqual(out.map(o => o.key).sort(), ['BL', 'BR', 'TL', 'TR'])
    assert.equal(out.find(o => o.key === 'TL').cx, 10)
    assert.equal(out.find(o => o.key === 'TL').cy, 10)
    assert.equal(out.find(o => o.key === 'BR').cx, 490)
    assert.equal(out.find(o => o.key === 'BR').cy, 170)
  })

  it('honors per-corner visibility', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'circle', sizeSvg: 20,
      corners: { TL: true, TR: false, BL: false, BR: true },
    })
    assert.deepEqual(out.map(o => o.key).sort(), ['BR', 'TL'])
  })

  it('sets outward triangle rotations', () => {
    const out = buildCornerOrnaments({
      svgW: 500, svgH: 180, pad: 10, shape: 'triangle', sizeSvg: 20, corners: {},
    })
    const rot = Object.fromEntries(out.map(o => [o.key, o.rotationDeg]))
    assert.equal(rot.TL, -45)
    assert.equal(rot.TR, 45)
    assert.equal(rot.BR, 135)
    assert.equal(rot.BL, -135)
  })
})
```

- [ ] **Step 2: Lancer les tests — doit échouer**

Run: `node --test frontend/src/utils/cornerOrnaments.test.js`  
Expected: FAIL (module manquant)

- [ ] **Step 3: Implémenter le helper**

```js
// frontend/src/utils/cornerOrnaments.js
export const CORNER_SHAPES = ['none', 'star4', 'star5', 'circle', 'square', 'triangle']

const CORNER_KEYS = ['TL', 'TR', 'BL', 'BR']

const TRI_ROT = { TL: -45, TR: 45, BR: 135, BL: -135 }

function cornerCenter(key, svgW, svgH, pad) {
  const right = key === 'TR' || key === 'BR'
  const bottom = key === 'BL' || key === 'BR'
  return {
    cx: right ? svgW - pad : pad,
    cy: bottom ? svgH - pad : pad,
  }
}

/** Regular star path centered at (cx,cy). points=4 → 4-pointed; points=5 → classic. */
export function starPathD(cx, cy, outerR, points, innerRatio = 0.4) {
  const verts = points * 2
  const parts = []
  for (let i = 0; i < verts; i++) {
    const r = i % 2 === 0 ? outerR : outerR * innerRatio
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    parts.push(`${i === 0 ? 'M' : 'L'}${x},${y}`)
  }
  return parts.join(' ') + ' Z'
}

/**
 * @returns {Array<{ key: string, kind: string, cx: number, cy: number, r: number, rotationDeg?: number, d?: string }>}
 */
export function buildCornerOrnaments({ svgW, svgH, pad, shape, sizeSvg, corners = {} }) {
  if (!shape || shape === 'none' || !(sizeSvg > 0)) return []
  const r = sizeSvg / 2
  const out = []
  for (const key of CORNER_KEYS) {
    if (corners[key] === false) continue
    const { cx, cy } = cornerCenter(key, svgW, svgH, pad)
    const base = { key, kind: shape, cx, cy, r }
    if (shape === 'star4') {
      out.push({ ...base, d: starPathD(cx, cy, r, 4, 0.38) })
    } else if (shape === 'star5') {
      out.push({ ...base, d: starPathD(cx, cy, r, 5, 0.4) })
    } else if (shape === 'triangle') {
      out.push({ ...base, rotationDeg: TRI_ROT[key] })
    } else {
      out.push(base) // circle | square
    }
  }
  return out
}
```

- [ ] **Step 4: Lancer les tests — doit passer**

Run: `node --test frontend/src/utils/cornerOrnaments.test.js`  
Expected: PASS (tous les `it`)

- [ ] **Step 5: Commit** (skip sauf demande user)

```bash
git add frontend/src/utils/cornerOrnaments.js frontend/src/utils/cornerOrnaments.test.js
git commit -m "$(cat <<'EOF'
feat(cadre): helper géométrie ornements de coins

EOF
)"
```

---

### Task 2: Params, help, ENUM_MAPS

**Files:**
- Modify: `frontend/src/atoms/index.js` (bloc `cadre.defaultParams`)
- Modify: `frontend/src/atoms/paramHelp.js` (section AtomSeparator / AtomCadre)
- Modify: `frontend/src/components/editor/PropertiesPanel.vue` (`ENUM_MAPS`, `paramStep`)

**Interfaces:**
- Consumes: noms de params du TSD-024
- Produces: défauts runtime + UI select/number/checkbox

- [ ] **Step 1: Étendre `cadre.defaultParams`**

Dans `frontend/src/atoms/index.js`, bloc `cadre.defaultParams`, ajouter :

```js
cornerShape: 'star4', // none | star4 | star5 | circle | square | triangle
cornerSize:  2,       // mm
cornerTL:    true,
cornerTR:    true,
cornerBL:    true,
cornerBR:    true,
```

- [ ] **Step 2: Ajouter les tooltips**

Dans `frontend/src/atoms/paramHelp.js`, après `bgOpacity` :

```js
cornerShape: 'Forme décorative aux coins : aucune, étoile 4/5 branches, rond, carré, triangle',
cornerSize:  'Taille des ornements de coin en millimètres',
cornerTL:    'Afficher l\'ornement en haut à gauche',
cornerTR:    'Afficher l\'ornement en haut à droite',
cornerBL:    'Afficher l\'ornement en bas à gauche',
cornerBR:    'Afficher l\'ornement en bas à droite',
```

- [ ] **Step 3: ENUM + step**

Dans `PropertiesPanel.vue` :

```js
// dans ENUM_MAPS :
cornerShape: ['none', 'star4', 'star5', 'circle', 'square', 'triangle'],

// dans paramStep :
if (key === 'fontSize' || key === 'maxFontSize' || key === 'cornerSize') return 0.1
```

- [ ] **Step 4: Vérifier rapidement dans l’éditeur**

Ouvrir un layout, sélectionner un Cadre → le panneau doit lister `cornerShape` (select), `cornerSize` (number step 0.1), et 4 checkboxes. (Le rendu canvas peut encore être vide jusqu’à Task 3.)

- [ ] **Step 5: Commit** (skip sauf demande user)

```bash
git add frontend/src/atoms/index.js frontend/src/atoms/paramHelp.js frontend/src/components/editor/PropertiesPanel.vue
git commit -m "$(cat <<'EOF'
feat(cadre): params ornements de coins dans l’UI

EOF
)"
```

---

### Task 3: Rendu dans `AtomCadre.vue`

**Files:**
- Modify: `frontend/src/atoms/components/AtomCadre.vue`

**Interfaces:**
- Consumes: `buildCornerOrnaments` depuis `@/utils/cornerOrnaments.js`
- Produces: ornements SVG fill = `strokeColor`, au-dessus des traits

- [ ] **Step 1: Import + computed**

```js
import { buildCornerOrnaments } from '@/utils/cornerOrnaments.js'

const cornerOrnaments = computed(() => {
  const shape = props.params.cornerShape ?? 'star4'
  const sizeMm = props.params.cornerSize ?? 2
  return buildCornerOrnaments({
    svgW: svgW.value,
    svgH: svgH.value,
    pad: pad.value,
    shape,
    sizeSvg: sizeMm * SCALE,
    corners: {
      TL: props.params.cornerTL !== false,
      TR: props.params.cornerTR !== false,
      BL: props.params.cornerBL !== false,
      BR: props.params.cornerBR !== false,
    },
  })
})
```

- [ ] **Step 2: Template SVG — après le `v-for` des strokes, avant `</svg>`**

```vue
      <g
        v-for="orn in cornerOrnaments"
        :key="orn.key"
        class="cadre-corner"
      >
        <path
          v-if="orn.kind === 'star4' || orn.kind === 'star5'"
          :d="orn.d"
          :fill="strokeColor"
        />
        <circle
          v-else-if="orn.kind === 'circle'"
          :cx="orn.cx"
          :cy="orn.cy"
          :r="orn.r"
          :fill="strokeColor"
        />
        <rect
          v-else-if="orn.kind === 'square'"
          :x="orn.cx - orn.r"
          :y="orn.cy - orn.r"
          :width="orn.r * 2"
          :height="orn.r * 2"
          :fill="strokeColor"
        />
        <polygon
          v-else-if="orn.kind === 'triangle'"
          :points="`${orn.cx},${orn.cy - orn.r} ${orn.cx - orn.r * 0.866},${orn.cy + orn.r * 0.5} ${orn.cx + orn.r * 0.866},${orn.cy + orn.r * 0.5}`"
          :fill="strokeColor"
          :transform="`rotate(${orn.rotationDeg} ${orn.cx} ${orn.cy})`"
        />
      </g>
```

- [ ] **Step 3: Vérification manuelle (acceptance TSD)**

Dans l’éditeur (dev déjà lancé) :
1. Nouveau Cadre → 4 étoiles 4 branches visibles
2. `cornerShape` → star5 / circle / square / triangle → formes changent
3. `cornerSize` → taille change
4. Couleur `color` du cadre → ornements suivent
5. Décocher `cornerTR` → coin haut-droit disparaît
6. `cornerShape = none` → plus d’ornements
7. Cadre ancien (sans params) → défauts star4 + 4 coins

- [ ] **Step 4: Commit** (skip sauf demande user)

```bash
git add frontend/src/atoms/components/AtomCadre.vue
git commit -m "$(cat <<'EOF'
feat(cadre): rendu SVG des ornements de coins

EOF
)"
```

---

### Task 4: Clôture docs

**Files:**
- Modify: `specs/TSD-024-cadre-ornements-coins.md` (Status → Done, cocher acceptance)
- Modify: `specs/WORKPLAN.md` (journal + tâches)

- [ ] **Step 1: Marquer TSD Done** — Status `Done`, cocher les critères §7

- [ ] **Step 2: Mettre à jour WORKPLAN** — cocher / ajouter la tâche ornements cadre ; ligne journal du jour

- [ ] **Step 3: Commit** (skip sauf demande user)

```bash
git add specs/TSD-024-cadre-ornements-coins.md specs/WORKPLAN.md
git commit -m "$(cat <<'EOF'
docs: TSD-024 ornements coins cadre terminé

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Formes star4/5, circle, square, triangle, none | Task 1 + 3 |
| Forme commune + masquage par coin | Task 1 + 2 + 3 |
| `cornerSize` mm, couleur = trait | Task 2 + 3 |
| Défaut star4 + 4 coins | Task 2 + 3 (`??` / `!== false`) |
| PropertiesPanel + paramHelp + config atomes | Task 2 (`defaultParams`) |
| Rendu au-dessus des traits | Task 3 (ordre template) |
| Rétrocompat sans migration DB | Task 3 defaults |
| Acceptance manuelle | Task 3 Step 3 |
| WORKPLAN fin de session | Task 4 |

Pas de placeholders. Noms de params cohérents partout (`cornerShape`, `cornerSize`, `cornerTL`…).
