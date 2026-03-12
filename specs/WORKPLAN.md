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
- [ ] Molécules : définition, réutilisation, édition
- [ ] Atome `image` : upload, recadrage, aperçu dans le canvas
- [ ] Atome `hexTile` : finaliser le rendu SVG hexagonal

### Phase 2 — Médias & assets

- [x] Upload de médias (images, fonts)
- [x] Renommage inline des médias (double-clic)
- [x] Bouton rename explicite dans les actions
- [x] Icônes d'action alignées en bas à droite
- [x] Images affichées sans crop (object-fit: contain)
- [x] Fond damier Photoshop pour transparence (tuiles, preview)
- [x] Suppression de médias avec confirmation
- [x] Suppression du fond d'une image (TSD-011 — @imgly/background-removal v1.7.0)
- [ ] Prévisualisation d'une font avant utilisation
- [ ] Gestion des doublons (même fichier uploadé deux fois)

### Phase 3 — Instances de cartes & data binding

- [ ] TSD rédigé (TSD-007) ✓
- [ ] Modèle de données : `card_instances` (layout_id + JSON plat de bindings)
- [ ] Vue liste des instances (`CardInstancesView`)
- [ ] Formulaire d'édition d'une instance (champs générés depuis les placeholders du layout)
- [ ] Aperçu live de l'instance rendu dans le canvas (lecture seule)
- [ ] Duplication d'une instance
- [ ] Import/export CSV d'instances

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
- [ ] Chaque feature critique a un TSD dans `specs/`
- [ ] Les TSDs existants ont leur section "Bugs connus" à jour

---

## d) Progression globale

```
Phase 1 — Éditeur          ████████████████░░░░  78%
Phase 2 — Médias           ████████░░░░░░░░░░░░  40%
Phase 3 — Instances cartes ░░░░░░░░░░░░░░░░░░░░   0%
Phase 4 — Export           ░░░░░░░░░░░░░░░░░░░░   0%
Phase 5 — Règles / valid.  ░░░░░░░░░░░░░░░░░░░░   0%

GLOBAL                     ████████░░░░░░░░░░░░  ~24%
```

> Le pourcentage global pondère : Phase 1 = 40 %, Phase 2 = 15 %, Phase 3 = 25 %, Phase 4 = 15 %, Phase 5 = 5 %.

---

## e) Prochaines actions

> Classées par priorité décroissante. À réviser à chaque session.

1. **[Phase 1]** Tester le réordonnancement des calques après correction du bug d'inversion — valider drag-and-drop dans tous les cas (top-level, dans un groupe, entre groupes)
2. **[Phase 1]** ~~Déplacement global d'un groupe Δx/Δy~~ ✅ — touches directionnelles implémentées
3. **[Phase 1]** ~~Recto/Verso~~ ✅ — is_back flag + tabs Recto/Verso + liaison verso inline implémentés
4. **[Phase 2]** Suppression de médias avec confirmation modale
5. **[Phase 3]** Rédiger TSD-003 (instances de cartes) avant de commencer le dev

---

## f) Journal des sessions

> Claude : ajouter une entrée à chaque fin de session avec la date et un résumé des changements effectués.

| Date | Résumé |
|------|--------|
| 2026-03-12 (2) | Recto/Verso : ajout colonne `is_back` en DB (migration idempotente), flag auto-migré depuis `card_type='dos'`. Backend routes/layouts.js mis à jour (SELECT/POST/PATCH). LayoutsView refonte : tabs Recto/Verso avec compteurs, filtrage par onglet, inline config "Verso lié" sur chaque tile recto (select → PATCH immédiat), badge DOS sur tiles verso, modale création avec checkbox "Dos de carte". |
| 2026-03-12 | Initialisation du plan. Features complétées : correction bug réordonnancement calques (inversion visuelle/array), persistance état expanded localStorage, icône cadenas SVG monochrome, zone dépôt bas de liste. Création `specs/README.md`, `specs/WORKPLAN.md`, `CLAUDE.md`. Création des 10 TSDs complets : TSD-001 à TSD-010. MediaView refonte : bouton upload (`<button @click="fileInput.click()">` vs label cassée), bouton ✎ rename dans actions, icônes alignées en bas à droite (`justify-content: flex-end`), images sans crop (`object-fit: contain`), fond damier Photoshop pour transparence (tuiles + preview). TSD-011 rédigé (suppression fond image via @imgly/background-removal). |
