# Design — RichText : marges titres, size dés, menu `/` focus textarea

| Field        | Value                                                                 |
|--------------|-----------------------------------------------------------------------|
| Status       | Draft                                                                 |
| Date         | 2026-07-20                                                            |
| Scope        | `AtomRichText`, `richTextParser`, `RichTextSlashMenu`, `PropertiesPanel`, `GUIDE-richtext`, registry hints |
| Out of scope | Nouveaux types de dés, params atome `headingMargins`, refonte WYSIWYG |
| Depends on   | TSD-026 / RichText actuel (`/d8`, `/d12`, headings markdown)          |

---

## 1. Goal

1. **Titres** : `margin-bottom` proportionnel au niveau (h1 > h6), en `em`.
2. **Dés** : argument optionnel `size` = multiplicateur de la taille d’icône (`/d8{3, 1.5}`).
3. **Menu `/`** : après `/`, l’utilisateur **continue d’écrire dans le textarea** ; le menu filtre sans voler le focus.

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Unité `size` dés | **A** — multiplicateur (défaut `1`) |
| Marges titres | **A** — `em` décroissants par niveau |
| Approche globale | **1 — Minimal** : style inline + parse arg + fix focus (pas de CSS classes dédiées ni params atome) |
| Menu `/` | Focus **textarea** ; filtre depuis `parseSlashContext` ; retirer le champ recherche séparé |

---

## 3. Titres — margin-bottom

### 3.1 Comportement

Dans `AtomRichText.vue`, le style heading devient :

- `marginTop: 0.15em` (inchangé)
- `marginBottom` selon le niveau :

| Niveau | margin-bottom |
|--------|---------------|
| 1 | `0.55em` |
| 2 | `0.45em` |
| 3 | `0.35em` |
| 4 | `0.28em` |
| 5 | `0.22em` |
| 6 | `0.18em` |

Helper `headingMargin(level)` parallèle à `headingSize(level)`.

### 3.2 CSS

- Remplacer `.rt-heading { margin: 0.15em 0; … }` par des marges gérées en inline (ou `margin: 0` + inline), pour éviter le conflit CSS / style.

---

## 4. Dés — argument `size`

### 4.1 Syntaxe

```
/d8{3}        → value 3, scale 1
/d8{3, 1.5}   → value 3, scale 1.5
/d12{7, 2}    → value 7, scale 2
/d8           → value D8, scale 1
/d8{, 1.5}    → value ?, scale 1.5
```

Rétrocompat : un seul arg = valeur uniquement (comportement actuel).

### 4.2 Parser (`richTextParser.js`)

Token die :

```js
{ type: 'die', sides, value, scale }
```

- `scale` = `Number(args[1])` si fini et `> 0`, sinon `1`
- `value` : logique actuelle sur `args[0]` / `rawInner`

### 4.3 Rendu (`AtomRichText.vue`)

- Taille affichée = `dieSize * (token.scale || 1)` pour `width_mm` / `height_mm`
- Param atome `diceScale` inchangé (base globale)

### 4.4 Docs / catalogue

- `GUIDE-richtext.md` : table dés + exemple `size`
- `richTextRegistry.js` : hints `/d8{valeur[, size]}` ; 2ᵉ arg optionnel `size` (free, placeholder `1.5`)

---

## 5. Menu `/` — continuer à taper dans le textarea

### 5.1 Problème actuel

À l’ouverture, `focusSearch()` vole le focus vers un `<input>` dédié.  
`onKey` fait `preventDefault` sur les caractères / Backspace et les redirige vers `searchQuery` — le contenu du textarea ne reçoit plus la frappe.

### 5.2 Comportement cible

1. Taper `/` → menu ouvert, **focus reste dans le textarea**
2. Continuer à écrire → texte dans le contenu ; filtre menu = `ctx.name` (phase commande) ou `ctx.partial` (phase args)
3. ↑↓ / Entrée / Tab / ArrowRight / Échap → navigation / accept / close uniquement
4. Autres touches → comportement textarea normal (pas d’interception)

### 5.3 Changements UI / code

| Fichier | Changement |
|---------|------------|
| `RichTextSlashMenu.vue` | Retirer le champ recherche ; filtre via `context` uniquement ; `onKey` n’intercepte plus la frappe libre ; retirer `focusSearch` / `searchQuery` (ou no-op) |
| `PropertiesPanel.vue` | Ne plus appeler `focusSearch()` à l’open / après `replace` ; garder focus textarea + caret |

### 5.4 Args libres (valeur dé, fichier SVG, etc.)

- Saisie dans le **textarea** (`/d8{3}`)
- Entrée : accepte l’item surligné si présent ; sinon valide le partial libre déjà dans le texte (comportement `acceptFreePartial` adapté à `ctx.partial` plutôt que `searchQuery`)

---

## 6. Fichiers touchés

- `frontend/src/atoms/components/AtomRichText.vue`
- `frontend/src/utils/richTextParser.js` (+ tests existants)
- `frontend/src/utils/richTextRegistry.js`
- `frontend/src/components/editor/RichTextSlashMenu.vue`
- `frontend/src/components/editor/PropertiesPanel.vue`
- `specs/GUIDE-richtext.md`

---

## 7. Acceptance

- [ ] `#` … `######` ont des `margin-bottom` distincts (échelle em ci-dessus)
- [ ] `/d8{3}` inchangé visuellement ; `/d8{3, 2}` affiche un dé ~2× plus grand
- [ ] `/d12{…, size}` idem
- [ ] Après `/`, on peut taper `d8` dans le textarea et le menu filtre ; le texte apparaît dans le contenu
- [ ] ↑↓ Entrée Échap fonctionnent ; Escape ferme et laisse le focus dans le textarea
- [ ] Guide + hints slash mis à jour

---

## 8. Non-goals

- Pas de `size` sur pictos / SVG dans cette itération
- Pas d’éditeur WYSIWYG
- Pas de config atome pour les marges de titres
