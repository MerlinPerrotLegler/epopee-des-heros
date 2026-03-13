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
- [x] Layout hexagonal (TSD-013) : shape = 'hexagon', clip canvas + overlay SVG evenodd
- [x] Atomes `trak`, `trakCorner`, `cardTrack` (TSD-018) ✓
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
- [x] Auth HTTP Basic en place
- [x] Migrations SQLite idempotentes (try/catch sur ALTER TABLE)
- [ ] Aucune route backend expose de données sans auth
- [ ] Pas de valeur px codée en dur dans les composants Vue (toujours via SCALE)
- [ ] Tous les atomes ont des `defaultParams` complets dans `atoms/index.js`
- [x] Chaque feature critique a un TSD dans `specs/` (TSD-014 à TSD-018 rédigés)
- [ ] Les TSDs existants ont leur section "Bugs connus" à jour

---

## d) Progression globale

```
Phase 1 — Éditeur          ████████████████████  95%
Phase 2 — Médias           ████████████████████  100%
Phase 3 — Instances cartes ████████████████░░░░  80%
Phase 4 — Export           ░░░░░░░░░░░░░░░░░░░░   0%
Phase 5 — Règles / valid.  ░░░░░░░░░░░░░░░░░░░░   0%

GLOBAL                     █████████████░░░░░░░  ~49%
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
