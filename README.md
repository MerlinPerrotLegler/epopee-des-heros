# Card Designer

Outil de design de cartes pour jeu de société. Permet de créer des templates de cartes (layouts), les hydrater avec des données (data binding), et exporter en PDF pour impression.

## Installation

```bash
# Cloner et installer
git clone <repo>
cd card-designer
npm install

# Copier et configurer l'env
cp .env.example .env
# Éditer .env avec vos identifiants

# Lancer en développement
npm run dev
# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001

# Build production
npm run build
npm start
# → Tout sur http://localhost:3001
```

## Architecture

```
card-designer/
├── backend/
│   ├── server.js              # Express entry point
│   ├── db/
│   │   ├── schema.sql         # SQLite schema
│   │   └── database.js        # DB connection + snapshot utils
│   ├── routes/
│   │   ├── layouts.js         # CRUD layouts
│   │   ├── components.js      # CRUD composants réutilisables
│   │   ├── molecules.js       # CRUD molécules (groupes d'atomes)
│   │   ├── cards.js           # Instances de cartes + import CSV
│   │   ├── media.js           # Bibliothèque média + upload
│   │   ├── snapshots.js       # Versioning (snapshot/restore DB)
│   │   ├── cardTypes.js       # Types de cartes (enum)
│   │   └── export.js          # Préparation export PDF
│   ├── middleware/sessionAuth.js  # Session (cookie) pour /api
│   └── routes/auth.js         # POST /login, /logout, GET /me
│
├── frontend/
│   └── src/
│       ├── atoms/index.js     # Registre des types d'atomes
│       ├── composables/
│       │   ├── useMmScale.js  # Conversion mm ↔ px
│       │   └── useDragAndDrop.js  # Drag, resize, snap
│       ├── components/editor/
│       │   ├── EditorCanvas.vue   # Canvas principal (carte + grille)
│       │   ├── EditorPanel.vue    # Panneau gauche (tabs)
│       │   ├── EditorToolbar.vue  # Barre d'outils (zoom, save)
│       │   ├── LayerPanel.vue     # Gestion des calques
│       │   ├── PropertiesPanel.vue # Propriétés de l'élément sélectionné
│       │   ├── DataPanel.vue      # Bindings + import CSV
│       │   └── AtomRenderer.vue   # Rendu visuel de chaque atome
│       ├── views/
│       │   ├── LayoutsView.vue    # Liste des layouts
│       │   ├── EditorView.vue     # Éditeur principal
│       │   ├── ComponentsView.vue # CRUD composants
│       │   ├── MoleculesView.vue  # CRUD molécules
│       │   ├── MediaView.vue      # Bibliothèque média
│       │   ├── CardsView.vue      # Instances de cartes
│       │   ├── ExportView.vue     # Export PDF
│       │   └── SnapshotsView.vue  # Versioning
│       ├── stores/editor.js   # Pinia store de l'éditeur
│       ├── utils/
│       │   ├── api.js         # Wrapper fetch pour l'API
│       │   └── binding.js     # Data binding {{path}} resolution
│       └── styles/main.css    # Styles globaux
```

## Concepts clés

### Atomic Design
- **Atomes** : éléments de base (texte, titre, icône, dé, pastille, etc.) définis dans le code
- **Molécules** : groupes d'atomes réutilisables (ex: bloc compétence = titre + texte + prix)
- **Composants** : assemblages plus complexes avec placeholders, sans données
- **Layouts** : templates complets d'une carte, avec calques et data binding

### Data Binding
Chaque élément dans un layout peut avoir un `nameInLayout` (identifiant).
Les paramètres de l'élément deviennent alors bindables via le chemin :
`{nameInLayout}.{paramName}` → ex: `card_name.text`, `stats.force.value`

Les instances de cartes fournissent les valeurs réelles :
```json
{
  "card_name.text": "Épée en fer",
  "price.resources": {"or": 6},
  "level.value": "1"
}
```

### Calques (Layers)
Chaque layout a des calques empilables, verrouillables et masquables.
Les éléments sont positionnés en mm par rapport à l'origine du layout.

### Recto/Verso
Chaque layout peut référencer un `back_layout_id` pour le verso.
Les layouts de type "dos" sont disponibles dans la bibliothèque de dos.

## Types d'atomes disponibles

| Type | Description |
|------|------------|
| `title` | Titre avec police, taille, alignement |
| `text` | Texte multi-ligne |
| `icon` | Icône SVG (depuis bibliothèque média) |
| `pastille` | Badge rond coloré |
| `die8` | Dé 8 faces (octaèdre) |
| `die12` | Dé 12 faces (dodécaèdre) |
| `cardPlaceholder` | Placeholder de carte par type |
| `resourcePlaceholder` | Placeholder de ressource |
| `resource` | Ressource avec icône (or, essence, etc.) |
| `price` | Prix multi-ressources |
| `cardType` | Badge type de carte |
| `counter` | Compteur/numéro de carte |
| `hexTile` | Tuile hexagonale |
| `image` | Image (+ placeholder IA pour V2) |
| `rectangle` | Rectangle de fond |
| `line` | Séparateur |

## Raccourcis clavier (éditeur)

- `Ctrl+S` : Sauvegarder
- `Delete` : Supprimer l'élément sélectionné
- `Scroll` : Pan
- `Ctrl+Scroll` : Zoom
- `Clic milieu + drag` : Pan

## API

Toutes les routes sous `/api/` (sauf `/api/auth/login`) sont protégées par **session** (cookie httpOnly après connexion sur la page `/login`). Variables serveur : `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`.

| Méthode | Route | Description |
|---------|-------|------------|
| GET | `/api/layouts` | Liste des layouts |
| POST | `/api/layouts` | Créer un layout |
| GET | `/api/layouts/:id` | Détail d'un layout |
| PATCH | `/api/layouts/:id` | Modifier métadonnées |
| PUT | `/api/layouts/:id/definition` | Sauvegarder la définition visuelle |
| POST | `/api/layouts/:id/duplicate` | Dupliquer |
| DELETE | `/api/layouts/:id` | Supprimer |
| GET/POST/PUT/DELETE | `/api/components` | CRUD composants |
| GET/POST/PUT/DELETE | `/api/molecules` | CRUD molécules |
| GET/POST/PUT/DELETE | `/api/cards` | CRUD instances de cartes |
| POST | `/api/cards/import` | Import CSV |
| GET/POST/DELETE | `/api/media` | Fichiers média |
| POST | `/api/media/upload` | Upload fichiers |
| GET/POST/DELETE | `/api/media/folders` | Dossiers média |
| GET/POST | `/api/snapshots` | Snapshots |
| POST | `/api/snapshots/:id/restore` | Restaurer |
| GET | `/api/card-types` | Types de cartes |
| POST | `/api/export/prepare` | Préparer export PDF |

## V2 (prévu)

- Génération d'images IA via API (placeholders avec prompts bindés)
- Rendu PDF côté serveur avec Puppeteer
- Preview live des cartes avec données
- Éditeur visuel de composants et molécules (canvas dédié)
- Drag & drop depuis la palette vers le canvas
- Copier/coller entre layouts
