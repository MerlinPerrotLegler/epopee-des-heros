# TSD-026 — Enrichissement RichText (markdown blocs, slash menu, doc)

| Field       | Value                                      |
|-------------|------------------------------|
| Status      | Review                       |
| Author      | @merlinperrot                |
| Created     | 2026-07-18                   |
| Last update | 2026-07-18                   |
| Depends on  | TSD-020 (RichText), TSD-021 (Pictorgame) |

---

## 1. Purpose

Le designer a besoin d’un langage RichText plus expressif (titres, listes, cases à cocher, flèches), d’une découverte assistée des shortcodes via `/`, et d’une documentation utilisateur complète (statique + dynamique selon le catalogue pictos/caracs). La syntaxe shortcode est unifiée et **stricte** (plus de `\ref`, `/D8`, `/R`, …).

---

## 2. Scope & boundaries

### In scope
- Blocs markdown : `#`–`######`, `-` puces, `1.` numéroté, `[ ]`/`[x]`, `>` citation, `=>` flèche
- Shortcodes de bloc : `/align{left|right|center|justify}`, `/separator{tier,hauteur_mm}` (**remplace** `------`)
- Inline existant conservé : `**` `*` `__` `~~` `` `code` ``, FML `$$` / `$$$`
- Shortcodes stricts avec `()` **ou** `{}` interchangeables
- `/d8{v}` `/d12{v}` → atomes Dice8 / Dice12
- Params atome : `bulletIcon`, `checkboxIcon`, `checkboxIconChecked`, `align` (+ `justify`)
- `/FOR{+1}` / stats nues ; `/svg{file}` `/svg{file,#color}`
- `/data{nom}` ≡ `$<nom>` (alias, même résolution données carte)
- Pictos : `/ref` ou `/ref{icon|label|both}` ; **et** `/picto{tag, ref, display}` (3 args **obligatoires**)
- Slash autocomplete `/` (filtre, ↑↓, Enter) + sous-options
- Popup doc RichText (statique + dynamique)
- Paramètre atome `bulletIcon` (config RichText + PropertiesPanel)
- Renommage ressource **`or` → `pieces`** (RESOURCE_TYPES + enums/help)
- Guide utilisateur `specs/GUIDE-richtext.md` (visible dans Docs)

### Out of scope
- Éditeur WYSIWYG / TipTap
- Migration automatique des contenus RichText legacy (`/D8`, `\ref`, `/R{or,3}`, …)
- Migration auto des clés JSON `price.resources.or` en DB (manuel / import)
- Quantité inline sur pictos
- Checkboxes interactives (rendu print uniquement)

---

## 3. UX & interaction design

### Primary — édition
1. Textarea `content` dans PropertiesPanel (RichText sélectionné).
2. Canvas = preview live.
3. Bouton **Doc** ouvre `RichTextDocModal`.
4. Param `bulletIcon` : MediaPicker / caractère pour l’icône des puces `-`.

### Primary — slash menu
1. Saisie `/` → menu : builtins (`d8`, `d12`, `svg`, `data`, `picto`, stats…) + tous les `picto_ref` + inserts markdown (`h1`, `bullet`, `checkbox`…).
2. Filtre au fur et à mesure.
3. ↑↓ sélection, Enter insert au curseur, Esc ferme.
4. Après choix :
   - picto simple → proposer `icon|label|both` (défaut insert `/ref` ou `/ref{icon}`)
   - `/picto` → assistant tag → ref → display
   - `/d8`/`/d12` → valeur
   - `/svg` → fichier + couleur optionnelle
   - `/data` → nom de champ

### Visual states
| État | Description |
|------|-------------|
| Menu fermé | Textarea normal |
| Menu ouvert | Liste filtrée sous/près du curseur |
| Doc ouverte | Modal scrollable, sections ancrées |
| Picto inconnu | Placeholder `?{ref}` (comportement actuel) |
| `/picto` tag/ref invalide | Placeholder d’erreur discret |

---

## 4. Data model

### Atom `richText` — nouveaux / modifiés `defaultParams`
```js
{
  content: '',
  bulletIcon: null, // media id | URL | caractère Unicode ; null = puce CSS par défaut
  // … fontSize, color, align, lineHeight, diceScale, padding inchangés
}
```

### Tokens (parser)
```js
{ type: 'html', html }
{ type: 'heading', level: 1..6, html }      // ou html déjà wrap <hN>
{ type: 'list', ordered: boolean, items: Token[][] }
{ type: 'checkbox', checked: boolean, html }
{ type: 'hr' }   // ligne seule matching /^------+$/ (≥6 tirets)
{ type: 'blockquote', html }
{ type: 'arrow' }
{ type: 'die', sides: 8|12, value: string }
{ type: 'stat', stat: string, modifier: string }
{ type: 'svg', name: string, color: string|null }
{ type: 'data', name: string }
{ type: 'picto', ref: string, view: 'icon'|'label'|'both' }
{ type: 'pictoByTag', tag: string, ref: string, view: 'icon'|'label'|'both' }
{ type: 'math', expr: string, block: boolean }
```

### RESOURCE_TYPES
```js
pieces: { label: 'Pièces', color: '#fbbf24', icon: '●' }
// clé `or` retirée
```

### Registre slash / doc
`richTextRegistry.js` expose `getRichTextCatalog({ pictos, stats, resources })` → items `{ id, kind, insert, label, hint, args? }`.

---

## 5. API changes

N/A — frontend + catalogue pictos existant. Doc utilisateur = fichier markdown dans `specs/`.

---

## 6. Implementation steps

- [x] Step 1 — Rename `or` → `pieces` (index, enums, paramHelp, README hints)
- [x] Step 2 — Parser : blocs markdown + shortcodes stricts + `()`/`{}` + tests Node
- [x] Step 3 — `richTextRegistry.js` + catalogue slash/doc
- [x] Step 4 — `AtomRichText.vue` rendu (titres, listes, checkbox, HR, arrow, svg color, bulletIcon, `/picto`)
- [x] Step 5 — `RichTextSlashMenu.vue` branché sur textarea PropertiesPanel
- [x] Step 6 — `RichTextDocModal.vue` (contenu GUIDE + sections dynamiques)
- [x] Step 7 — `bulletIcon` dans atoms + PropertiesPanel
- [x] Step 8 — `GUIDE-richtext.md` + notes TSD-020
- [x] Step 9 — WORKPLAN

---

## 7. Edge cases

| Scenario | Expected |
|----------|----------|
| Contenu legacy `/D8` `\ref` `/R{…}` | Non parsés comme shortcodes (texte brut ou partiel) |
| `/picto` avec 1 ou 2 args | Invalide → placeholder |
| Tag sans le ref | Placeholder |
| `$<nom>` hors previewData | Affiche vide ou `{{nom}}` selon convention binding existante |
| `bulletIcon` null | Puce CSS `•` / list-style |
| Couleur SVG invalide | Ignorée, SVG sans tint |
| Conflit ref picto = nom builtin (`d8`) | Builtin gagne |

### Syntaxe shortcodes (référence)

Arguments : `(…)` ou `{…}` équivalents ; séparateur `,` ; espaces trim.

```
/d8{3}  /d12()
/FOR{+1}  /INI
/svg{icon.svg}  /svg{icon.svg,#c00}
/data{price.gold}  $<price.gold>
/epee-longue
/epee-longue{both}
/picto{armes, epee-longue, icon}
=>
```

---

## 8. Acceptance criteria

- [ ] Titres H1–H6, puces, listes numérotées, checkbox, séparateur `------`, `>`, `=>` rendus
- [ ] `/d8` `/d12` `/svg`+couleur `/data`≡`$<>` /stats /pictos /`/picto{tag,ref,view}`
- [ ] Anciennes syntaxes non reconnues
- [ ] `()` et `{}` acceptés
- [ ] Slash menu filtre + flèches + insert
- [ ] Doc popup : guide + liste dynamique pictos/caracs
- [ ] `bulletIcon` configurable et appliqué aux puces
- [ ] `RESOURCE_TYPES.pieces` (plus de clé `or` dans le code)
- [ ] `GUIDE-richtext.md` listé dans Docs de l’app
- [ ] Tests parser verts

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| — | — | — | — |

---

## 10. Open questions

Aucune — décisions brainstorming 2026-07-18 :
- Affichage picto RichText : `icon` \| `label` \| `both` uniquement
- `/picto` : 3 args obligatoires ; value = `picto_ref`
- Strict B (pas de legacy)
- `/data` ≡ `$<>`
- Extras A (`[x]`, `1.`, `------` séparateur, `>`)
- Dés : `/d8` `/d12`
- `or` → `pieces`

---

## 11. Notes & references

- Related : TSD-020 (base), TSD-021 (pictos), `GUIDE-richtext.md` (doc utilisateur)
- Architecture : approche 1 (pipeline tokenize + overlay UX)
- Rendu SVG coloré : prefer `currentColor` / CSS filter / inline fill selon faisabilité fichier
)
