# TSD-020 — Atome Texte Riche (`richText`)

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Draft                        |
| Author      | @merlinperrot                |
| Created     | 2026-03-14                   |
| Last update | 2026-03-14                   |
| Depends on  | TSD-003 (atomes), TSD-019 (dessin — pour la cohérence SVG) |

---

## 1. Purpose

L'atome `text` existant ne supporte qu'un texte brut monochrome. Pour les descriptions de cartes (effets, règles spéciales), il faut pouvoir mêler texte mis en forme, icônes de dés intégrées dans le flux, et expressions mathématiques (modificateurs, formules de dégâts). Ce TSD définit l'atome `richText`, un bloc de texte enrichi multi-rendu, conçu pour ne nécessiter aucun éditeur visuel complexe : la source reste un string éditable à la main ou via textarea.

---

## 2. Scope & boundaries

### In scope
- Nouvel atome `richText` avec params `content` (string source) + options visuelles (font, size, color, align, lineHeight)
- **Markdown léger** : `**gras**`, `*italique*`, `__souligné__`, `~~barré~~`, `` `code` ``
- **Dés inline** : `/D8{N}` et `/D12{N}` — rendu du dé correspondant (AtomDie8 / AtomDie12) avec la valeur N, taille proportionnelle à la taille de texte courante
- **Formules mathématiques** : délimitées par `$$…$$`, syntaxe FML (Formula Markup Language — voir §3.3), convertie en KaTeX au rendu
- Rendu HTML dans une `<div>` (pas SVG pur — le text-wrapping SVG est trop limité)
- Édition du `content` dans PropertiesPanel via un `<textarea>` live-preview
- Le rendu HTML est encapsulé dans un `<foreignObject>` SVG **ou** dans un `<div>` overlay positionné par-dessus le canvas-element (décision §10)

### Out of scope
- Éditeur WYSIWYG (type Quill, TipTap, etc.)
- Images inline (utiliser l'atome `image`)
- Animations ou effets de survol
- Autres atomes que D8 et D12 en mode inline (extensible plus tard)
- Export PDF/print (géré par TSD-009, compatible si rendu HTML)
- Colorisation inline par span (futur, si besoin)

---

## 3. UX & interaction design

### 3.1 — Syntaxe source complète

```
Inflige **2d8** dégâts + $$pow(FOR, 2) / 2$$ au joueur ciblé.
Chaque /D8{3} compte comme un succès __critique__.
Coût : /D12{1} ~~si malédiction~~ sinon /D12{0}.
```

Rendu visuel attendu :
> Inflige **2d8** dégâts + FOR²/2 au joueur ciblé.
> Chaque [D8 avec 3] compte comme un succès <u>critique</u>.
> Coût : [D12 avec 1] ~~si malédiction~~ sinon [D12 avec 0].

---

### 3.2 — Markdown supporté

| Syntaxe source       | Rendu HTML       |
|----------------------|------------------|
| `**texte**`          | `<strong>`       |
| `*texte*`            | `<em>`           |
| `__texte__`          | `<u>`            |
| `~~texte~~`          | `<s>`            |
| `` `texte` ``        | `<code>`         |
| `\n` ou ligne vide   | saut de ligne / paragraphe |

Pas de titres (`#`), listes (`-`), tableaux — hors scope pour un atome inline de carte.

---

### 3.3 — Dés inline : syntaxe `/D8{N}` et `/D12{N}`

- **`/D8{N}`** — rend un AtomDie8 SVG avec la valeur N (entier 1–8 ou `?`)
- **`/D12{N}`** — rend un AtomDie12 SVG avec la valeur N (entier 1–12 ou `?`)
- La taille du dé s'adapte à `font-size` courant × `diceScale` (param, défaut 1.4 em)
- `N` peut être : un entier littéral (`6`), `?` (point d'interrogation affiché), ou une variable de binding (`{nb_des}`) — voir §4 data binding
- La valeur N est affichée à l'intérieur du dé avec la même taille de texte que le texte environnant (grâce au scaling SVG)

Exemples : `/D8{6}`, `/D12{?}`, `/D8{{nb_attaque}}`

---

### 3.4 — Formules mathématiques : syntaxe FML

Délimiteurs : `$$…$$` (inline) ou `$$$…$$$` (bloc centré, plus grand).

**FML — Formula Markup Language** : notation fonctionnelle, toujours des parenthèses. Convertie en KaTeX au rendu.

| FML                         | KaTeX équivalent              | Rendu                    |
|-----------------------------|-------------------------------|--------------------------|
| `frac(a, b)`                | `\frac{a}{b}`                 | fraction                 |
| `sqrt(x)`                   | `\sqrt{x}`                    | racine carrée            |
| `pow(x, n)`                 | `x^{n}`                       | exposant                 |
| `sub(x, i)`                 | `x_{i}`                       | indice                   |
| `sum(i=0, n, f(i))`         | `\sum_{i=0}^{n} f(i)`         | somme                    |
| `floor(x)`                  | `\lfloor x \rfloor`           | partie entière            |
| `ceil(x)`                   | `\lceil x \rceil`             | plafond                  |
| `abs(x)`                    | `\left\|x\right\|`            | valeur absolue           |
| `max(a, b)`                 | `\max(a,\,b)`                 | maximum                  |
| `min(a, b)`                 | `\min(a,\,b)`                 | minimum                  |
| `times`                     | `\times`                      | ×                        |
| `div`                       | `\div`                        | ÷                        |
| `geq`                       | `\geq`                        | ≥                        |
| `leq`                       | `\leq`                        | ≤                        |
| `neq`                       | `\neq`                        | ≠                        |
| `inf`                       | `\infty`                      | ∞                        |
| Tout autre texte / nombre   | passé tel quel à KaTeX        | (identifieur, opérateur) |

Les expressions FML s'imbriquent librement : `frac(pow(FOR, 2), sqrt(DEF + 1))`.

Opérateurs classiques (`+`, `-`, `*`, `/`, `=`, `(`, `)`, chiffres, lettres) sont passés directement à KaTeX sans transformation — seuls les noms de fonctions FML sont traduits.

---

### 3.5 — Flux d'édition dans PropertiesPanel

1. L'utilisateur sélectionne un atome `richText` sur le canvas
2. Le panneau propriétés affiche :
   - Textarea `Contenu` (multi-lignes, largeur 100 %)
   - Live-preview du rendu (miniature sous la textarea, mis à jour en temps réel)
   - Champs : `font-family`, `font-size` (mm), `color`, `align`, `lineHeight`, `diceScale`
3. Toute modification met à jour `params.content` et re-rend l'atome sur le canvas

### 3.6 — États visuels

| État                       | Rendu                                          |
|----------------------------|------------------------------------------------|
| Contenu vide               | placeholder grisé « Texte riche… »             |
| FML invalide               | formule affichée en rouge avec message d'erreur KaTeX |
| Dé inline sans valeur      | `/D8{}` → valeur `?`                          |
| Variable binding non résolue | la variable est affichée telle quelle entre `{…}` |

---

## 4. Data model

### Params de l'atome `richText`

```json
{
  "content": "Inflige **2d8** dégâts + $$frac(pow(FOR,2), 2)$$ au joueur ciblé.\nCoût : /D8{3} énergie.",
  "fontFamily": null,
  "fontSize": 3.5,
  "color": "#1a1a2e",
  "align": "left",
  "lineHeight": 1.5,
  "diceScale": 1.4,
  "padding": 0
}
```

- `fontFamily` : `null` = héritage de la config globale
- `fontSize` : en mm (converti en px au rendu via `PX_PER_MM × zoom`)
- `diceScale` : multiplicateur de la taille du dé par rapport à `fontSize` (em)
- `padding` : marge intérieure en mm (0 par défaut)

### Pas de changement de schéma DB

L'atome est stocké comme tous les autres dans `definition.layers` → aucune migration.

---

## 5. API changes

N/A — Pas de nouvel endpoint backend. Le rendu est entièrement côté frontend. Si KaTeX est utilisé, c'est une dépendance npm, pas un service.

---

## 6. Implementation steps

### Dépendances npm

- [ ] **Step 0** — Installer KaTeX : `npm install katex` dans `frontend/`. Importer les CSS de KaTeX dans `main.js` ou via `<link>` dans `index.html`.

### Parsing & rendu

- [ ] **Step 1** — Créer `frontend/src/utils/richTextParser.js` :
  - `parseFML(fmlString)` → string KaTeX (traduction récursive des fonctions FML)
  - `parseRichText(content, params)` → tableau de tokens `[ {type: 'text'|'die'|'math', ...} ]`
  - Regex pour dés : `/\/D(8|12)\{([^}]*)\}/g`
  - Regex pour math inline : `/\$\$([^$]+)\$\$/g` et bloc : `/\$\$\$([^$]+)\$\$\$/g`
  - Markdown → HTML via remplacement regex ordonné (gras avant italique)

- [ ] **Step 2** — Créer `frontend/src/atoms/components/AtomRichText.vue` :
  - Props : `params`, `width_mm`, `height_mm`, `zoom`
  - Rendu via `<div class="rich-text-atom">` contenant du HTML injecté (v-html) avec les dés en SVG inline
  - Pour chaque token die : insérer un `<svg>` inline avec le path du dé correspondant (importer les paths de AtomDie8/AtomDie12)
  - Pour chaque token math : `katex.renderToString(parseFML(expr), { throwOnError: false })`
  - Style : `font-size: ${mmToPx(params.fontSize)}px`, etc.
  - La div est positionnée `width:100%; height:100%; overflow:hidden` — pas de foreignObject

- [ ] **Step 3** — Extraire les SVG paths de `AtomDie8.vue` et `AtomDie12.vue` dans des fonctions utilitaires réutilisables (`diePath(sides, value)`) pour pouvoir les injecter inline dans le HTML du richText.

- [ ] **Step 4** — Enregistrer dans `atoms/index.js` :
  ```js
  richText: {
    label: 'Texte riche',
    icon: '✦',
    defaultParams: { content: '', fontFamily: null, fontSize: 3.5, color: '#1a1a2e', align: 'left', lineHeight: 1.5, diceScale: 1.4, padding: 0 },
    defaultSize: { width_mm: 50, height_mm: 20 }
  }
  ```

- [ ] **Step 5** — Enregistrer dans `AtomRenderer.vue` : import + `richText: AtomRichText` dans `ATOM_COMPONENTS`.

- [ ] **Step 6** — PropertiesPanel : ajouter section `richText` avec textarea `content`, preview miniature (computed HTML), et sliders/champs pour `fontSize`, `color`, `align`, `lineHeight`, `diceScale`.

- [ ] **Step 7** — Data binding : dans `parseFML` / `parseRichText`, reconnaître les variables `{varName}` dans les tokens de type `die` (valeur N) et les résoudre via `resolveElementParams` existant. Le `content` lui-même peut aussi contenir `{varName}` dans le texte markdown (binding du texte brut).

- [ ] **Step 8** — Tests visuels manuels : vérifier rendu pour les cas décrits en §7.

---

## 7. Edge cases

| Scénario | Comportement attendu |
|----------|---------------------|
| FML invalide (`frac(a)` — 1 seul arg) | KaTeX affiche une erreur inline en rouge, le reste du texte s'affiche normalement |
| `/D8{99}` — valeur hors plage | Afficher `99` dans le dé sans erreur (l'atome D8 gère ça) |
| `/D8{}` — valeur manquante | Interpréter comme `?` |
| Markdown non fermé (`**texte sans fin`) | Afficher les astérisques tels quels (pas de rendu partiel) |
| `content` = string très long sans espace | `word-break: break-all` pour éviter le débordement |
| Dé inline au milieu d'une formule `$$…/D8{3}…$$` | Le parser gère d'abord les formules (prioritaire), le dé à l'intérieur d'une formule est ignoré |
| `zoom` change | Rerender automatique (props réactifs) |
| `content` vide | Placeholder grisé « Texte riche… » visible uniquement dans l'éditeur, invisible dans l'export |
| Variable binding non résolue en preview | Afficher `{varName}` en italique grisé |
| `font-size` très petit (< 2mm) | Le dé SVG pourrait dépasser — clipper avec `overflow:hidden` sur le conteneur |

---

## 8. Acceptance criteria

- [ ] Un atome `richText` peut être ajouté au canvas depuis le panneau d'atomes
- [ ] `**gras**`, `*italique*`, `__souligné__`, `~~barré~~` s'affichent correctement
- [ ] `/D8{6}` affiche un dé D8 avec un `6` lisible, de taille cohérente avec le texte environnant
- [ ] `/D12{3}` idem pour un D12
- [ ] `$$frac(2, 3)$$` affiche une fraction 2/3 rendue par KaTeX
- [ ] `$$pow(FOR, 2)$$` affiche FOR² (KaTeX, avec variable littérale)
- [ ] Le texte se wrap automatiquement dans les limites de l'atome
- [ ] La taille de police (`fontSize` en mm) est cohérente avec le reste de la carte au même zoom
- [ ] La propriété `content` est éditable en textarea dans PropertiesPanel avec live-preview
- [ ] L'atome s'intègre correctement dans le data binding (les `{varName}` dans content sont résolus)
- [ ] Pas d'erreur JS console pour les formules FML valides

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [ ] **Q1 — foreignObject ou div overlay ?**
  SVG `<foreignObject>` permet d'embarquer du HTML dans un SVG (cohérent avec les autres atomes). Mais le support de KaTeX dans `foreignObject` est excellent en 2025. Alternative : un `<div>` positionné en absolu par-dessus le canvas-element avec `pointer-events:none` (comme le drawing overlay). Recommandation : **utiliser `<div>` HTML pur dans AtomRichText.vue**, sans SVG wrapping. L'atome est rendu dans `.canvas-element` comme les autres ; AtomRenderer peut traiter `richText` comme un cas `overflow:visible` si besoin.

- [ ] **Q2 — Extraction des paths SVG des dés ?**
  AtomDie8/AtomDie12 sont des composants Vue avec templates SVG. Pour les insérer dans un rendu HTML (v-html ou innerHTML), il faut soit (a) extraire les paths dans un fichier utilitaire `dieShapes.js` qui exporte des strings SVG, soit (b) utiliser des composants Vue inline via `h()` (render functions). Option (a) est plus simple et cohérente avec le design existant.

- [ ] **Q3 — KaTeX vs MathJax ?**
  KaTeX est nettement plus rapide (~100× MathJax), supporte les mêmes formules courantes, et produit un HTML/CSS sans JS runtime après le rendu initial. Recommandation : **KaTeX** (`~280 kB` gzip). MathJax n'est nécessaire que pour les formules AMSTeX avancées non utilisées ici.

- [ ] **Q4 — Taille des dés en mode bloc vs inline ?**
  Si un dé est seul sur une ligne, doit-il s'afficher en taille d'un bloc (ex. 8mm) ou en taille inline (1.4em) ? Proposition : toujours inline (1.4em), quitte à laisser l'utilisateur créer un atome D8/D12 séparé pour les grandes icônes.

---

## 11. Notes & références

- KaTeX : `https://katex.org` — MIT license, compatible SSR/Vue
- Les styles KaTeX (`katex.min.css`) doivent être chargés globalement dans le projet
- AtomDie8 et AtomDie12 : `frontend/src/atoms/components/AtomDie8.vue` / `AtomDie12.vue` — les paths SVG seront extraits dans `frontend/src/utils/dieShapes.js`
- Le `diceScale` par défaut de 1.4 em donne un dé légèrement plus grand que le texte, ce qui est visuellement cohérent avec les cartes de jeu
- Pour les formules fréquentes dans le jeu : `frac(FOR, 2)`, `pow(DEF, 2)`, `floor(VIE / 3)` — s'assurer que ces fonctions sont toutes dans la table de traduction FML §3.4
