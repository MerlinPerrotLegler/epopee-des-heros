# TSD-002 — Gestion des calques & groupes

| Field       | Value                  |
|-------------|------------------------|
| Status      | Done                   |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | TSD-001                |

---

## 1. Purpose

Chaque atome / composant / molécule placé dans un layout est son propre calque. L'utilisateur peut les réordonner, les regrouper, les nommer, les verrouiller ou ajuster leur opacité depuis un panneau dédié — comme dans un outil de design professionnel (Figma, Affinity).

---

## 2. Scope & boundaries

### In scope
- Panneau `LayerPanel` : arbre des calques (flat + groupes imbriqués)
- Chaque élément = entrée dans l'arbre
- Groupes : créer, nommer, ouvrir/fermer, lock, opacité
- Drag & drop pour réordonner et mettre dans un groupe
- Sélection d'un élément depuis le panneau
- Renommage inline (double-clic)
- Visibilité (toggle œil)
- Persistance de l'état ouvert/fermé par layout (localStorage)
- Icône cadenas SVG monochrome (accent = ouvert, rouge = verrouillé)
- Déplacement Δx/Δy d'un groupe depuis le panneau propriétés

### Out of scope
- Clipping / masque d'un groupe sur ses enfants (non prévu)
- Blend modes (non prévu)
- Fusion de calques
- Groupes imbriqués dans des groupes (limité à 1 niveau pour l'instant)

---

## 3. UX & interaction design

### Structure de l'arbre
```
▤ Groupe "En-tête"          ← groupe, fermable
  ◉ [icon] titre_carte
  ◉ [T] sous_titre
▤ Groupe "Coût"
  ◉ [💎] price_1
▸ [◧] illustration           ← composant, top-level
▸ [⬡] hexTile_fond
```
Ordre visuel = ordre de rendu inversé (le calque en haut du panneau est rendu au-dessus des autres).

### Primary flow — réordonner
1. Glisser un calque → zone de dépôt bleue apparaît entre les items
2. Relâcher dans la zone → item inséré à cette position
3. Glisser sur un groupe → l'item passe à l'intérieur du groupe (drop-inside)

### Primary flow — créer un groupe
1. Cliquer `⊞` (bouton dans le header du panneau) → nouveau groupe "Groupe" ajouté en haut
2. Double-clic sur le nom → renommage inline
3. Glisser des items dans le groupe

### Contrôles par calque
| Contrôle | Comportement |
|----------|--------------|
| Clic | Sélectionne le calque (et l'élément sur le canvas) |
| Double-clic nom | Renommage inline |
| Icône `○`/`◉` | Toggle visibilité |
| Icône cadenas SVG | Toggle lock (accent = déverrouillé, rouge = verrouillé) |
| Badge `%` | Drag gauche/droite pour ajuster l'opacité |
| Icône `✕` | Suppression avec confirmation implicite |

### Opacité par drag
- Mousedown sur le badge `XX%`
- Glisser gauche → diminue, droite → augmente
- Range : 0–100%, pas de 1%
- Le badge est masqué si opacity = 100% jusqu'au hover

### Persistance expanded
- Clé localStorage : `layer-expanded-{layoutId}`
- Valeur : JSON array des IDs de groupes ouverts
- Chargé à `onMounted` et au changement de layout ID

---

## 4. Data model

### Ancienne structure (avant ce TSD)
```js
layers: [
  {
    id: "uuid",
    name: "Calque 1",
    elements: [ /* atomes/composants */ ]
  }
]
```

### Nouvelle structure
```js
// store.layers est l'arbre (flat ou nested)
// Chaque item est soit un element, soit un group
layers: [
  {
    id: "uuid",
    kind: "element",       // 'element' | 'group'
    type: "atom",          // 'atom' | 'component' | 'molecule'
    atomType: "text",
    name: "titre_carte",
    nameInLayout: "card_name",
    x: 12, y: 8, width: 40, height: 6,  // mm
    params: { … },
    locked: false,
    visible: true,
    opacity: 1.0,
  },
  {
    id: "uuid",
    kind: "group",
    name: "En-tête",
    locked: false,
    visible: true,
    opacity: 1.0,
    children: [
      { /* element */ },
      { /* element */ },
    ]
  }
]
```

### Actions store
| Action | Signature |
|--------|-----------|
| `addGroup()` | Crée un groupe vide en début de liste (top visuel) |
| `removeItem(id)` | Supprime un item (et ses enfants si groupe) |
| `updateItem(id, patch)` | Merge patch dans l'item trouvé récursivement |
| `reorderItemAroundTarget(srcId, tgtId, 'before'\|'after')` | Déplace srcId dans le même parent que tgtId |
| `moveItemToGroup(srcId, groupId\|null)` | Déplace srcId dans groupId (ou top-level si null) |
| `moveGroupBy(groupId, dx, dy)` | Décale tous les enfants du groupe de Δx/Δy mm |

---

## 5. API changes

La structure des layers est persistée dans `definition` (JSON dans SQLite). Pas de nouvel endpoint — la sauvegarde passe par `PUT /layouts/:id/definition`.

Migration : l'ancienne structure `layers[].elements[]` est convertie à la lecture si `kind` absent → chaque élément devient un `kind: 'element'` top-level.

---

## 6. Implementation steps

- [x] Refactoriser le store pour que `layers` soit un arbre flat/nested (plus de `layers[].elements[]`)
- [x] `LayerPanel.vue` : rendu de l'arbre avec `flatTree` computed (reverse pour ordre visuel)
- [x] Drag & drop dans LayerPanel (dragstart, dragover, drop zones)
- [x] Correction bug inversion : 'above' visuel = 'after' dans l'array (display est reversed)
- [x] Drop zone en bas de liste (pour insérer au niveau le plus bas visuellement)
- [x] Persistance expanded dans localStorage
- [x] Icône cadenas SVG monochrome avec CSS color
- [x] Opacité par drag horizontal (mousedown + mousemove sur badge)
- [ ] `moveGroupBy(groupId, dx, dy)` : champs Δx/Δy dans le panneau propriétés du groupe
- [ ] Migration automatique de l'ancienne structure à la lecture

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Drag d'un groupe dans lui-même | Ignoré (`srcId === targetId` check) |
| Drag d'un item dans un groupe verrouillé | Autorisé (le lock concerne l'édition canvas, pas la structure) |
| Suppression d'un groupe non vide | Supprime le groupe ET tous ses enfants |
| Opacité d'un groupe | Appliquée en plus de l'opacité individuelle de chaque enfant (multiplication CSS) |
| Expanded state pour un layout inexistant | Set vide par défaut |
| Item visible=false dans un groupe visible=false | Doublement masqué (union des visibilités) |
| Réordonnancement dans l'arbre inversé | Position 'above' visuelle = 'after' dans array — corrigé avec inversion dans `commitZoneDrop` |

---

## 8. Acceptance criteria

- [x] Chaque atome/composant apparaît comme calque propre dans le panneau
- [x] Création de groupe via bouton `⊞`
- [x] Drag & drop réordonne sans bug d'inversion
- [x] Mise dans un groupe par drag sur le groupe
- [x] Lock/unlock avec couleurs distinctes (accent / rouge)
- [x] Visibilité toggle fonctionnel
- [x] Opacité ajustable par drag horizontal
- [x] État ouvert/fermé des groupes persisté par layout
- [ ] Déplacement Δx/Δy d'un groupe via le panneau propriétés

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | Réordonnancement incorrect : les groupes restaient toujours premiers | fixed — inversion 'above'/'after' dans `commitZoneDrop` | 2026-03-12 |
| 2 | Expanded state perdu à chaque navigation | fixed — localStorage keyed par layoutId | 2026-03-12 |
| 3 | Icône cadenas emoji non colorable en CSS | fixed — remplacement par SVG inline avec `currentColor` | 2026-03-12 |

---

## 10. Open questions

- [ ] Faut-il autoriser les groupes imbriqués (groupe dans groupe) ? Actuellement limité à 1 niveau.
- [ ] Le lock d'un groupe doit-il bloquer aussi la sélection de ses enfants sur le canvas ?

---

## 11. Notes

- L'arbre est rendu à l'envers (`for i = length-1 downto 0`) car en design, le calque "le plus haut" dans la liste est rendu au-dessus — et dans l'array, l'index le plus élevé est rendu en dernier (au-dessus)
- Le composable `useDragAndDrop.js` sur le canvas et le drag dans `LayerPanel` sont deux systèmes distincts ; le LayerPanel gère son propre drag via les events HTML5 natifs
