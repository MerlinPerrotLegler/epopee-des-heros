# Plan de travail — Card Designer
> Mis à jour automatiquement par Claude à la fin de chaque session de travail.
> Ne pas modifier manuellement la section "Progression" ni les checkboxes — elles sont gérées par Claude.

---

## a) Plan général

Le projet est divisé en 5 grandes phases :

| Phase | Titre | État |
|-------|-------|------|
| 1 | Éditeur de layouts & composants (canvas, atomes, calques) | ✅ En cours / avancé |
| 2 | Gestion des médias et assets | 🟡 Partiel |
| 3 | Instances de cartes & data binding | 🔴 Non commencé |
| 4 | Export & impression | 🔴 Non commencé |
| 5 | Intégration règles du jeu & validation | 🔴 Non commencé |

---

## b) Mise en œuvre par étapes

### Phase 1 — Éditeur (layouts & composants)

- [x] Scaffold complet (routes, store, vues, SQLite)
- [x] Canvas drag & drop, resize, snap mm
- [x] Atomes de base : title, text, icon, pastille, die8, die12, price, resource, counter, hexTile, image, rectangle, line, cardPlaceholder, resourcePlaceholder, cardType
- [x] D8/D12 : remplacement CSS par traits SVG calligraphiques (pen strokes)
- [x] Fonts personnalisées (gestion dans la vue Médias)
- [x] Zoom canvas : sans limite, bouton 1:1, bouton ⊡ fit
- [x] Auto-fit à l'ouverture d'un layout/composant
- [x] LayoutsView redesign : grille de tuiles, miniatures, filtre, tri, renommage inline
- [x] ComponentsView redesign : idem
- [x] Miniature auto-générée (html2canvas) à chaque sauvegarde
- [x] Gestion des calques : chaque atome/composant = calque propre
- [x] Groupes de calques : nommage, lock, opacité, drag & drop dans l'arbre
- [x] Calques — persistance de l'état ouvert/fermé (localStorage)
- [x] Calques — icône cadenas monochrome SVG (accent ouvert, rouge si lock)
- [x] Calques — correction bug de réordonnancement (inversion visuelle)
- [x] Calques — déplacement global d'un groupe (Δx / Δy dans le panneau propriétés)
- [x] Recto / Verso : is_back flag + tabs Recto/Verso dans LayoutsView + liaison verso inline
- [x] Atome `image` : upload, recadrage, aperçu dans le canvas
- [ ] Atome `hexTile` : finaliser le rendu SVG hexagonal
- [x] Mode dessin à la plume (TSD-019) : atome `drawing`, 5 plumes configurables, algo calligraphique
- [x] Atome `richText` (TSD-020) : texte enrichi, dés D8/D12 inline, markdown, formules FML → KaTeX, ressources `/R{or,3}`, stats `/FOR{+1}`, SVG `/SVG{name}`
- [x] Layout hexagonal (TSD-013) : shape = 'hexagon', clip canvas + overlay SVG evenodd
- [x] Atomes `trak`, `trakCorner`, `cardTrack` (TSD-018) ✓
- [x] Atome `separator` : 5 tiers calligraphiques (basic → légendaire), fuseaux + vrilles + sparkles
- [x] Atome `caracteristique` (TSD-018) ✓
- [x] Snapshots & Restauration DB (TSD-014) ✓
- [x] Polices personnalisées / FontManager (TSD-015) ✓
- [x] Configuration globale & tokens de design (TSD-016) ✓
- [x] Types de cartes CRUD (TSD-017) ✓

### Phase 2 — Médias & assets

- [x] Upload de médias (images, fonts)
- [x] Renommage inline des médias (double-clic)
- [x] Bouton rename explicite dans les actions
- [x] Icônes d'action alignées en bas à droite
- [x] Images affichées sans crop (object-fit: contain)
- [x] Fond damier Photoshop pour transparence (tuiles, preview)
- [x] Suppression de médias avec confirmation
- [x] Suppression du fond d'une image (TSD-011 — @imgly/background-removal v1.7.0)
- [x] Gestion des doublons (même fichier uploadé deux fois)

### Phase 3 — Instances de cartes & data binding

- [x] TSD rédigé (TSD-007) ✓ (import CSV/Google Sheets, ImportJob, missing_media, wizard 5 étapes)
- [x] Modèle de données : `card_instances` + `import_jobs` + `missing_media` (migrations DB)
- [x] Backend CRUD `/api/cards` + `/api/import-jobs`
- [x] Backend `POST /api/cards/import-url` (pipeline upsert complet avec ImportJob)
- [x] Backend `POST /api/cards/preview-url` (dry-run aperçu CSV)
- [x] Backend `POST /api/import-jobs/:id/sync` (re-sync source)
- [x] Backend `GET /api/cards/export` (export CSV)
- [x] Frontend `binding.js` : papaparse, `normalizeGoogleSheetsUrl`, `extractBindingPaths`, `prefixOverride`
- [x] Frontend `ImportWizard.vue` : wizard 5 étapes (source → config → mapping → options → résultat)
- [x] Frontend `CardsView.vue` : table, jobs-bar sync, delete modal, export CSV
- [x] Table `missing_media` : détection non-bloquante lors de l'import
- [x] Aperçu live d'une instance rendu dans le canvas (lecture seule)
- [x] Duplication d'une instance
- [x] TSD rédigé (TSD-012) ✓ — Génération médias manquants par IA
- [x] TSD-012 implémenté : config IA, 4 types built-in, file de génération, pipeline OpenAI DALL-E 3

### Phase 4 — Export & impression

- [ ] TSD rédigé (TSD-009) ✓
- [ ] Export PDF d'un layout (qualité impression)
- [ ] Export PNG d'une instance unique
- [ ] Export batch : toutes les instances d'un layout en un PDF
- [ ] Gabarit de coupe (marge, fond perdu)

### Phase 5 — Intégration règles & validation

- [ ] TSD rédigé (TSD-010) ✓
- [ ] Valider les types de cartes et ressources contre les règles du jeu
- [ ] Contraintes métier : vérifier qu'un layout utilise bien les champs requis
- [ ] Outil de relecture : afficher toutes les instances d'un type côte à côte

---

## c) Liste de contrôle — qualité & cohérence

- [x] Toutes les mesures en mm dans le store et le canvas
- [x] Snap magnétisme 1mm (configurable)
- [x] Auth : page `/login` + session cookie (`ADMIN_USER` / `ADMIN_PASSWORD`, `SESSION_SECRET`)
- [x] Migrations SQLite idempotentes (try/catch sur ALTER TABLE)
- [ ] Aucune route backend expose de données sans auth
- [ ] Pas de valeur px codée en dur dans les composants Vue (toujours via SCALE)
- [ ] Tous les atomes ont des `defaultParams` complets dans `atoms/index.js`
- [x] Chaque feature critique a un TSD dans `specs/` (TSD-014 à TSD-018 rédigés)
- [ ] Les TSDs existants ont leur section "Bugs connus" à jour

---

## d) Progression globale

```
Phase 1 — Éditeur          ████████████████████  99%
Phase 2 — Médias           ████████████████████  100%
Phase 3 — Instances cartes ████████████████░░░░  80%
Phase 4 — Export           ░░░░░░░░░░░░░░░░░░░░   0%
Phase 5 — Règles / valid.  ░░░░░░░░░░░░░░░░░░░░   0%

GLOBAL                     █████████████░░░░░░░  ~50%
```

> Le pourcentage global pondère : Phase 1 = 40 %, Phase 2 = 15 %, Phase 3 = 25 %, Phase 4 = 15 %, Phase 5 = 5 %.

---

## e) Prochaines actions

> Classées par priorité décroissante. À réviser à chaque session.

1. **[Phase 1]** Tester le réordonnancement des calques après correction du bug d'inversion — valider drag-and-drop dans tous les cas (top-level, dans un groupe, entre groupes)
2. **[Phase 1]** ~~Déplacement global d'un groupe Δx/Δy~~ ✅ — touches directionnelles implémentées
3. **[Phase 1]** ~~Recto/Verso~~ ✅ — is_back flag + tabs Recto/Verso + liaison verso inline implémentés
4. **[Phase 3]** ~~Aperçu live d'une instance~~ ✅ — CardPreview.vue, modal dans CardsView
5. **[Phase 3]** ~~Duplication d'une instance~~ ✅ — bouton ⧉ dans CardsView
6. **[Phase 3]** ~~TSD-012~~ ✅ — Config IA Provider (onglet Config), 4 types built-in, MissingMediaList, pipeline OpenAI
7. **[Phase 1]** ~~Atome `image`~~ ✅ — upload, recadrage (posX/posY), preview canvas, params IA

---

## f) Journal des sessions

> Claude : ajouter une entrée à chaque fin de session avec la date et un résumé des changements effectués.

| Date | Résumé |
|------|--------|
| 2026-03-17 (16) | Multi-utilisateurs : table `users` (bcrypt), login DB, rôle admin/user ; API `/api/admin/users` (CRUD) ; verrous `layout_locks` + `/api/locks/layouts/*` (acquire, heartbeat 60s, release) ; `PUT /layouts/:id/definition` réservé au détenteur du verrou ; vue **Comptes** (`/users`) ; éditeur layout en lecture seule + bannière si verrou pris par un autre. Seed admin depuis `ADMIN_*` si table vide. |
| 2026-03-17 (15) | Déploiement Hostinger : correction fallback SPA Express (pas d’`index.html` sur `/assets/*` manquants), cache `index.html` no-cache + assets immutable, `.htaccess` dans `frontend/public` pour Apache (évite MIME HTML sur chunks). |
| 2026-03-17 (14) | Auth session : correctif « déconnexion immédiate » après login — `req.session.save()` avant JSON login, `trust proxy` + `proxy: true` sur express-session, proxy Vite explicite (`changeOrigin`), fusion `fetch` dans `api.js` pour ne jamais perdre `credentials`, revalidation `fetchMe()` après POST login. |
| 2026-03-17 (13) | Auth : suppression HTTP Basic ; session Express (`express-session`), routes `POST/GET /api/auth/login|logout|me`, middleware `sessionAuth.js` ; frontend `LoginView`, store `auth.js`, garde routeur + `credentials: 'include'` dans `api.js`, déconnexion dans `App.vue`. Variables `.env` : `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET` (fallback `AUTH_*`). Mise à jour README, `.cursorrules`, `.env.example`. |
| 2026-03-17 (12) | Cohérence paramètre `fontWeight` de `AtomCaracteristique` : ajout dans `defaultParams` de `atoms/index.js` pour exposition automatique dans la config atomes. Règle projet renforcée dans `.cursorrules` : tout paramètre utilisé par un atome doit exister dans `defaultParams`. |
| 2026-03-17 (11) | UX éditeur : drag & drop depuis l’onglet Ajouter vers le canvas (atomes + composants). Les boutons sont `draggable`, payload custom `application/x-card-designer-add`, drop géré sur la carte avec positionnement proche du point de lâcher (centrage + snap mm). |
| 2026-03-17 (10) | Gouvernance + navigation : règle projet ajoutée dans `.cursorrules` pour imposer la répercussion de toute modif d’atome dans la config atomes. L’écran config atomes est déplacé hors de `Config` vers une vue dédiée `/atoms-config` (nouvelle entrée nav au même niveau que Layouts/Composants/Média), et l’onglet Atomes est retiré de `ConfigView`. |
| 2026-03-17 (9) | `AtomCaracteristique` : ajout de `fontWeight` dans le style calculé (`params.fontWeight` avec fallback 700) pour que l’épaisseur de police soit configurable et cohérente avec la config atomes. |
| 2026-03-17 (8) | Vérification/correction des atomes liés à la police pour respecter la config : `AtomCaracteristique`, `AtomDice8`, `AtomDice12`, `AtomResource` utilisent désormais `params.fontFamily` en priorité (fallback `FONT_FAMILY`), et le décalage optique de `AtomDice12` ne s’applique plus que si la police active est Jim Nightshade. |
| 2026-03-17 (7) | Correction propagation config dans `AtomRichText` : les inline atoms utilisent maintenant les valeurs fixes de config si définies (`die8`, `die12`, `resource`, `caracteristique`) via `atomParamRules` + `fixedEnabled/fixedValue`. Les styles stat/resource et params des dés (font/color/pen) sont alignés avec la config atomes. |
| 2026-03-17 (6) | Ajustement UI Config Atomes : retour du toggle `Fixer` en colonne dédiée, colonne dédiée pour l’icône oeil, grille des lignes clarifiée (Paramètre/Fixer/Valeur/Oeil), largeur de page Config augmentée et suppression des scrolls internes gênants dans le panneau atomes. |
| 2026-03-17 (5) | Simplification Config Atomes selon retour UX : suppression du mode binding, suppression de la checkbox d’activation et du sélecteur de mode ; conservation exclusive des valeurs fixes typées (select police/enum, color picker, number, bool, text). Application runtime et verrouillage des champs ajustés sur `fixedValue` uniquement. |
| 2026-03-17 (4) | Config Atomes améliorée avec sélecteurs adaptés par type de paramètre : mode "Fixer" + choix "Valeur/Binding", rendu typed controls (color picker, select enums/polices, checkbox booléen, number input, text), application runtime dans AtomRenderer et verrouillage/masquage cohérent dans PropertiesPanel. |
| 2026-03-17 | Renommage AtomDie8/AtomDie12 → AtomDice8/AtomDice12 (fichiers + imports AtomRenderer, AtomRichText, paramHelp). Constante FONT_FAMILY = 'Jim Nightshade' dans atoms/index.js ; imposée pour AtomDice8, AtomDice12, Caractéristique, Ressource (defaultParams + rendu dans les 4 composants Vue). |
| 2026-03-15 | TSD-020 implémenté : `richTextParser.js` (tokenizer + `parseFML` FML→KaTeX + `markdownToHtml`), `AtomRichText.vue` (tokens inline : html, die, resource, stat, svg, math), KaTeX chargé dynamiquement. Types inline ajoutés : `/R{or,3}`, `/FOR{+1}`, `/INI`, `/SVG{name}`, `DEF` dans STAT_TYPES. `PropertiesPanel.vue` : section dédiée richText (textarea + hint syntaxe). Enregistré dans `AtomRenderer.vue`, `atoms/index.js`. Fix dessin : taper N≤2 = 0.5. |
| 2026-03-14 | TSD-020 rédigé : atome `richText` — texte enrichi avec markdown, dés D8/D12 inline (`/D8{N}`), formules FML converties en KaTeX (`frac`, `pow`, `sqrt`, `sum`, `floor`…). Décisions : KaTeX vs MathJax (KaTeX retenu), rendu HTML `<div>` (pas foreignObject SVG), extraction paths dés dans `dieShapes.js`. |
| 2026-03-13 (9) | Fix dessin calligraphique : taper de 0.08 rendait les traits quasi-invisibles (sous-pixel) pour les traits courts (N=2 après Douglas-Peucker). Correction : taper=0.5 pour N≤2, epsilon DP réduit de `smoothing*2` → `smoothing` pour conserver plus de points. `toAtomSvg` rendu défensif (accepte ref Vue ou élément DOM). `.drawing-overlay` : ajout `pointer-events: all` explicite. |
| 2026-03-13 (8) | TSD-019 implémenté : `calligraphyStroke.js` (Douglas-Peucker + Catmull-Rom + algo nibAngle), `AtomDrawing.vue`, `useDrawingMode.js` (Pointer Events + pointer capture), `DrawingToolbar.vue` (5 plumes + effacer + terminer), enregistré dans `atoms/index.js` + `AtomRenderer.vue`. `EditorCanvas.vue` : double-clic → mode dessin, overlay transparent, Ctrl+Z / Échap, curseur crosshair. `PropertiesPanel.vue` : section plumes avec éditeur inline (nom, couleur, opacité, largeur, angle, pression, lissage) + bouton "Tout effacer". |
| 2026-03-13 (7) | TSD-019 rédigé : mode dessin à la plume calligraphique. Atome `drawing`, 5 plumes configurables (nibWidth, nibAngle, pressureScale, smoothing), algo w(φ)=nibWidth×|sin(φ−θ)| + Douglas-Peucker + Catmull-Rom, toolbar flottante, Pointer Events API. |
| 2026-03-13 (6) | Atome `separator` : séparateur calligraphique à la plume, 5 tiers (basic/rare/epic/mythique/légendaire). `separatorStrokes.js` : fuseaux fH/fV + diamants + vrilles-teardrop + star4 sparkles + halo légendaire. `AtomSeparator.vue` : horizontal + vertical via transform SVG. Enregistré dans index.js, AtomRenderer, PropertiesPanel (enum tier). |
| 2026-03-13 (5) | Fix PropertiesPanel vide : `el` computed tombe maintenant en fallback sur `selectedItem` (layers panel) si `selectedElement` est null, couvrant les cas click canvas-background et post-loadLayout. Fix erreur Vue `{{card_name.text}}` dans le span du prompt template → ajout `v-pre`. |
| 2026-03-13 (4) | Fix TSD-011 : fetch image en blob dans le thread principal avant passage au Web Worker @imgly/background-removal — les URLs relatives /uploads/… ne se résolvent pas depuis un worker. |
| 2026-03-13 (3) | 5 TSDs manquants rédigés : TSD-014 (Snapshots), TSD-015 (Polices), TSD-016 (Config globale), TSD-017 (Types de cartes), TSD-018 (Atomes trak/trakCorner/cardTrack/caracteristique). WORKPLAN mis à jour : Phase 1 → 95%, Phase 2 → 100%, global → ~49%. |
| 2026-03-13 (2) | TSD-013 implémenté : migration DB shape + 'rectangle'/'hexagon', backend layouts.js (SELECT/INSERT/PATCH/duplicate), hexGeometry.js (HEX_RATIO, hexClipPathCss, hexHeightFromWidth, hexMaskSvg), LayoutsView (checkbox "Forme hexagonale", auto-height watch, badge ⬡ sur tile, dim readonly), EditorToolbar (badge "⬡ Hexagonal"), EditorCanvas (clipPath CSS sur card-boundary + overlay SVG evenodd pour zone inactive). |
| 2026-03-13 | TSD-013 rédigé (layout hexagonal) : shape field DB, clip-path canvas, export PNG masked, modale création. |
| 2026-03-12 (8) | Gestion des doublons upload : backend retourne `duplicate: true` quand SHA1 déjà en DB. Frontend filtre les doublons avant push dans `media.value` et affiche un toast amber avec le nom du fichier concerné. Phase 2 → 100% (toutes tâches cochées). |
| 2026-03-12 (7) | TSD-012 implémenté : DB migration ai_generation_config + 4 types built-in (illustration, icon, fond, texte_graphique) + reset generating au démarrage. Backend: config.js GET/PUT /api/config/ai, services/aiGeneration.js (buildPrompt, callOpenAI, saveGeneratedImage, generateOne), routes/missingMedia.js (CRUD, preview-prompt, generate, generate-all), server.js wired. Frontend: api.js (getAIConfig/putAIConfig/getMissingMedia…), ConfigView tabs (Tokens/Polices/IA Provider), AIProviderPanel.vue (provider, api_key masquée, global_prompt, presets table par type), MediaView onglet Manquants, MissingMediaList.vue (liste filtrée, statuts colorés, polling 3s, aperçu prompt modal + copier, génération, ignorer), PropertiesPanel ai_media_type dynamique depuis config + warnings. Phase 3 → 80%, global → 41%. |
| 2026-03-12 (6) | Phase 3 — Aperçu live instance : CardPreview.vue (lecture seule, zoom auto-fit, AtomRenderer + InlineComponentRenderer sans dépendance au store éditeur, data binding résolu). Duplication d'instance (bouton ⧉, POST avec copie data + "(copie)"). Modal preview dans CardsView avec chargement layout à la demande. Phase 3 → 70%, global → 38%. |
| 2026-03-12 (5) | AtomImage complété : posX/posY (objectPosition CSS, sliders dans PropertiesPanel), params IA (ai_media_type, ai_prompt_template) dans defaultParams et PropertiesPanel (section "Cadrage" + section "IA — Génération"), placeholder 🤖 IA si prompt défini. TSD-003 coché (AtomImage done). WORKPLAN Phase 1 → 83%. |
| 2026-03-12 (4) | Implémentation TSD-007 complète : migrations DB (import_jobs, missing_media, import_job_id, sheets_url), backend cards.js refactorisé (import-url pipeline, preview-url, export CSV, upsert transactionnel, detectMissingMedia), importJobs.js (CRUD + sync), server.js mis à jour. Frontend: binding.js (papaparse, normalizeGoogleSheetsUrl, extractBindingPaths, prefixOverride), api.js (importCardsFromUrl, previewCsvUrl, importJobs CRUD, exportCardsUrl), ImportWizard.vue (5 étapes: source→config→mapping→options→résultat, auto-déduction mappings), CardsView.vue (table, jobs-bar sync/delete, delete modal, export CSV). |
| 2026-03-12 (3) | Suppression des Molécules (backend/routes/molecules.js, MoleculesView, TSD-008, nav, router, EditorPanel, EditorCanvas, LayerPanel, api.js). Confirmation modale suppression médias (MediaView). Refonte TSD-007 : import CSV/Google Sheets, ImportJob entity, wizard 5 étapes, extractBindingPaths() récursif, autoDeduceMappings(), normalizeGoogleSheetsUrl(), table missing_media + detectMissingMedia(). Création TSD-012 : génération médias manquants par IA (missing_media table, ai_generation_config, pipeline DALL-E/Stability/fal.ai, UI file de génération). |
| 2026-03-12 (2) | Recto/Verso : ajout colonne `is_back` en DB (migration idempotente), flag auto-migré depuis `card_type='dos'`. Backend routes/layouts.js mis à jour (SELECT/POST/PATCH). LayoutsView refonte : tabs Recto/Verso avec compteurs, filtrage par onglet, inline config "Verso lié" sur chaque tile recto (select → PATCH immédiat), badge DOS sur tiles verso, modale création avec checkbox "Dos de carte". |
| 2026-03-12 | Initialisation du plan. Features complétées : correction bug réordonnancement calques (inversion visuelle/array), persistance état expanded localStorage, icône cadenas SVG monochrome, zone dépôt bas de liste. Création `specs/README.md`, `specs/WORKPLAN.md`, `CLAUDE.md`. Création des 10 TSDs complets : TSD-001 à TSD-010. MediaView refonte : bouton upload (`<button @click="fileInput.click()">` vs label cassée), bouton ✎ rename dans actions, icônes alignées en bas à droite (`justify-content: flex-end`), images sans crop (`object-fit: contain`), fond damier Photoshop pour transparence (tuiles + preview). TSD-011 rédigé (suppression fond image via @imgly/background-removal). |
