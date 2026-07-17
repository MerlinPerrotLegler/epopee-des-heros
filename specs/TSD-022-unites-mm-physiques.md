# TSD-022 — Unités mm physiques (tailles atomes / composants)

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Done (QA zoom/1:1 manuelle partielle — migration vérifiée API) |
| Author      | @merlinperrot                              |
| Created     | 2026-07-17                                 |
| Last update | 2026-07-17                                 |
| Depends on  | TSD-001 (canvas), TSD-003 (atomes)         |

---

## 1. Purpose

Les tailles visuelles des atomes doivent dépendre **uniquement de la carte physique** (millimètres), pas de l’écran ni d’un pourcentage de hauteur de layout. Un passage récent de `fontSize` en « % de `layout.height_mm` » a introduit un second système d’unités, incohérent avec le reste (padding, bordures, gaps encore en mm ou parfois en `px` CSS). Ce TSD unifie **toutes les longueurs** sur le mm physique, corrige les fuites `px`, migre les définitions existantes, et met à jour les guidelines pour que tout nouvel atome / composant suive la même règle.

---

## 2. Scope & boundaries

### In scope
- Convention unique : longueurs linéaires = **mm physiques** → affichage via `mmToPx()` uniquement
- Retrait du système `fontSize` / `maxFontSize` en % de hauteur layout (`useLayoutRelativeFontMm`)
- Audit et correction de tous les atomes (bordures, padding, gap, `borderRadius`, épaisseurs, etc.)
- Migration one-shot des définitions layout/composant (`sizing: "mm"`)
- Mise à jour des labels UI (`(mm)`, step `0.1` pour `fontSize`)
- Mise à jour des guidelines : `.cursorrules`, `CLAUDE.md`, checklist « Quand tu modifies un atome »
- Commentaires / defaults dans `atoms/index.js` et `paramHelp.js` alignés mm

### Out of scope
- Changer le positionnement canvas (`x_mm`, `y_mm`, `width_mm`, `height_mm`) — déjà en mm
- Export PDF / pipeline impression (bénéficie du rendu mm existant)
- Pictorgame (TSD-021) — l’atome `picto` devra respecter cette convention à l’implémentation
- Conversion des ratios unitless (`lineHeight`, `opacity`, `diceScale`, `scale`) ou des `%` CSS de positionnement (`posX`/`posY` background)
- Outil UI de re-migration manuelle / dialogue utilisateur

---

## 3. UX & interaction design

### Primary flow
1. Le designer édite une taille (`fontSize`, `padding`, `borderWidth`…) en **mm** dans le panneau propriétés.
2. Le canvas convertit mm → px avec le zoom courant ; les valeurs numériques affichées restent stables si on change le zoom / 1:1 / fit.
3. Preview carte et impression utilisent la même base mm.

### Migration (invisible)
1. À l’ouverture d’un layout ou composant :
   - si `definition.sizing === 'mm'` → no-op
   - si `definition.sizing === 'pct'` → convertir `fontSize` / `maxFontSize` / `rows[].fontSize` avec `mm = (valeur / 100) × height_mm`, puis stamp `sizing: 'mm'`
   - sinon (stamp absent) → **stamp seulement** `sizing: 'mm'` sans convertir (valeurs déjà en mm physiques)
2. Rechargement ultérieur : no-op (idempotent).

> Les layouts en base stockent déjà des mm ; une conversion systématique fausserait les cartes 210/297 mm.

### Visual states
- Aucun toast / modal de migration en V1
- Labels champs : suffixe ou hint **mm** (plus de « % hauteur layout »)

---

## 4. Data model

### Stamp sur la définition
```json
{
  "sizing": "mm",
  "elements": [ /* ... */ ],
  "layers": [ /* ... */ ]
}
```

| Valeur `sizing` | Comportement au load |
|-----------------|----------------------|
| `"mm"` | Aucune conversion |
| `"pct"` | Convertir params listés → mm, puis `sizing = "mm"` |
| absent / autre | Stamp `sizing = "mm"` **sans** convertir les valeurs |

### Params concernés par la migration `% → mm`
Uniquement ceux qui ont pu être interprétés comme % hauteur pendant la période récente :
- `fontSize`
- `maxFontSize`
- éventuellement `fontSize` dans les lignes `params.rows[]` (badge / iconMap)

Les autres params (`padding`, `gap`, `borderWidth`…) sont déjà en mm et **ne doivent pas** être multipliés.

Formule :
```
mm = (storedValue / 100) * layoutHeightMm
```
avec `layoutHeightMm = layout.height_mm` (éditeur) ou hauteur du composant / fallback `88`.

### Defaults registre (`atoms/index.js`)
- Commentaires : `// mm` (jamais `% hauteur layout`)
- Valeurs numériques = mm physiques (ex. titre `fontSize: 4.5`)

### Unités autorisées (référence)

| Catégorie | Unité | Exemples |
|-----------|--------|----------|
| Boîte élément | mm | `x_mm`, `y_mm`, `width_mm`, `height_mm` |
| Params de taille | mm | `fontSize`, `maxFontSize`, `padding`, `gap`, `borderWidth`, `thickness`, `borderRadius`, `letterSpacing`, `iconSize`, `cellSize_mm`, `thicknessH_mm`, `thicknessV_mm` |
| Ratios | unitless | `lineHeight`, `opacity`, `scale`, `diceScale`, `fontWeight` |
| Position CSS relative | % | `posX`, `posY` (backgrounds) |
| Relatif au glyphe | `em` | gaps typo internes (`0.1em`) quand déjà proportionnels au `fontSize` mm |

**Interdit :** taille visuelle en `px` CSS brut ; `fontSize` / longueurs en % de `layout.height_mm`.

---

## 5. API changes

N/A — pas de nouvel endpoint. Le champ `sizing` vit dans le JSON `definition` déjà persisté via les routes layouts / components existantes.

---

## 6. Implementation steps

- [x] Step 1 — Créer `migrateDefinitionSizing(definition, heightMm)` + liste `PCT_MIGRATED_PARAMS` ; tests unitaires (idempotence, stamp, rows badge)
- [x] Step 2 — Brancher la migration au load layout (editor store) et composant ; dirty si conversion
- [x] Step 3 — Retirer `useLayoutRelativeFontMm` des atomes ; `fontSize` lu comme mm → `mmToPx`
- [x] Step 4 — Simplifier / supprimer `useLayoutRelativeFont.js` (ou le réduire à helpers migration + `LAYOUT_HEIGHT` si encore utile ailleurs) ; retirer `provide(LAYOUT_HEIGHT_MM_KEY)` si plus nécessaire
- [x] Step 5 — Audit atomes : corriger `px` en dur (`AtomRectangle`, `AtomCardType`, `AtomCardPlaceholder`, `AtomPrice`/`AtomResource` gaps, `AtomImage`/`AtomRectangle` `borderRadius`, etc.)
- [x] Step 6 — `atoms/index.js` + `paramHelp.js` + labels PropertiesPanel / AtomConfigPanel / config globale
- [x] Step 7 — Guidelines : `.cursorrules`, `CLAUDE.md` (règle + checklist nouvel atome)
- [ ] Step 8 — Vérif manuelle : zoom, 1:1, reload layout (stamp), titre/texte/padding/bordure

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Définition déjà `sizing: "mm"` | Aucune conversion |
| Layout sans `height_mm` | Fallback `88` pour la formule de migration |
| `fontSize` absent / null | Ignorer |
| `rows[].fontSize` null (badge) | Ignorer la ligne |
| Valeur `0` | Laisser `0` |
| Composant ouvert hors layout | Migrer avec hauteur composant ou `88` |
| `borderRadius` historiquement en px | Traiter comme mm désormais + corriger le rendu (`mmToPx`) ; pas de migration numérique (déjà stocké comme petit nombre) |
| Gaps en `em` dans RichText | Conserver (proportionnels au fontSize mm) |

---

## 8. Acceptance criteria

- [x] Aucun atome n’interprète `fontSize` / `maxFontSize` comme % de hauteur layout
- [x] Aucune taille visuelle en `px` bruts dans les composants d’atomes (hors sortie de `mmToPx` / SCALE)
- [x] Ouverture d’un ancien layout : stamp `sizing: "mm"` sans altérer les mm existants ; second load inchangé ; conversion uniquement si `sizing: "pct"`
- [x] Labels / help / defaults parlent de **mm**
- [x] `.cursorrules` et `CLAUDE.md` imposent la convention pour les prochains atomes/composants
- [x] Migration vérifiée sur layouts réels (API) : valeurs `fontSize` inchangées, stamp posé ; tests unitaires 5/5
- [x] Zoom / 1:1 : valeurs mm stables ; rendu cohérent preview vs éditeur (vérifié UI : Armes, fontSize 2.5 stable à 1:1 / 100%) (vérif manuelle Step 8)

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | `AtomRectangle` : `borderWidth` / `borderRadius` appliqués en `px` CSS | fixed | 2026-07-17 |
| 2 | Paddings / gaps en `px` durs (`AtomCardType`, `AtomCardPlaceholder`, `AtomPrice`, `AtomResource`) | fixed | 2026-07-17 |
| 3 | `fontSize` traité en % hauteur layout (incohérent avec le reste) | fixed | 2026-07-17 |

---

## 10. Open questions

- [x] Unité cible : mm physiques (pas %) — décidé
- [x] Texte inclus en mm — décidé
- [x] Migration auto `%→mm` à l’ouverture — décidé
- [x] Approche helper + audit + guidelines — décidé

---

## 11. Notes & references

- Scale : `3.7795 px/mm` (`useMmScale.js` / `useAtomScale.js`)
- TSD-003 mentionnait déjà `fontSize` en mm ; le détour % est à annuler
- TSD-020 (richText) : `fontSize` et `padding` en mm — à réaligner après retrait du helper %
- Related : TSD-001 (canvas mm), TSD-021 (picto devra naître en mm)
