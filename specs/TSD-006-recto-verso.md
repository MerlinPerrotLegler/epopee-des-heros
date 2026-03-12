# TSD-006 — Recto / Verso (layouts double face)

| Field       | Value                  |
|-------------|------------------------|
| Status      | Draft                  |
| Author      | @merlinperrot          |
| Created     | 2026-03-12             |
| Last update | 2026-03-12             |
| Depends on  | TSD-001, TSD-002       |

---

## 1. Purpose

La majorité des cartes du jeu ont un dos commun (type "dos") et une face recto spécifique au type de carte. Certains types pourraient avoir deux faces actives (ex : carte réversible). L'éditeur doit permettre de créer et visualiser les deux faces dans le même layout, de basculer entre elles, et de les exporter ensemble.

---

## 2. Scope & boundaries

### In scope
- Chaque layout a deux faces : `recto` et `verso`
- Basculement recto/verso dans la toolbar de l'éditeur
- Les deux faces partagent les mêmes dimensions (mm)
- Chaque face a sa propre pile de calques (`layers`)
- Les placeholders (data binding) sont partagés entre les deux faces (même namespace)
- Le verso peut être un layout "référencé" (ex : dos commun partagé par tous les layouts)

### Out of scope
- Prévisualisation 3D flip — non prévu
- Plus de 2 faces par carte — non prévu
- Faces de dimensions différentes — non autorisé

---

## 3. UX & interaction design

### Toolbar
```
[ Recto ▾ ] [ Verso ▾]   ← onglets ou toggle dans EditorToolbar
```
Le face active est mise en évidence. Basculer change le canvas affiché.

### Primary flow
1. L'utilisateur clique sur "Verso" dans la toolbar
2. Le canvas bascule sur la face verso (calques verso)
3. Il place et édite les atomes du verso indépendamment
4. Il revient sur "Recto" pour continuer la face principale
5. La sauvegarde enregistre les deux faces

### Verso partagé (dos commun)
1. En mode "Verso", l'utilisateur peut choisir "Utiliser le dos commun"
2. Un selector de layout s'affiche
3. Il choisit un layout de type "dos"
4. Le verso de ce layout est rendu tel quel (lecture seule)
5. À l'export, le dos commun est automatiquement utilisé

### Visual states
| État | Description |
|------|-------------|
| Recto actif | Canvas = layers.recto, onglet Recto surligné |
| Verso actif | Canvas = layers.verso, onglet Verso surligné |
| Verso partagé | Canvas verso grisé avec overlay "Dos commun : [nom]" |

---

## 4. Data model

### Structure actuelle
```js
// layout.definition
{
  layers: [ /* tous les calques de la face unique */ ]
}
```

### Nouvelle structure proposée
```js
// layout.definition
{
  activeFace: "recto",         // face affichée par défaut
  recto: {
    layers: [ /* calques recto */ ]
  },
  verso: {
    sharedLayoutId: null,      // si non null : verso = layout référencé (lecture seule)
    layers: [ /* calques verso propres, vide si sharedLayoutId */ ]
  }
}
```

### Migration
Les layouts existants (qui ont `layers` à la racine) sont migrés à la lecture :
```js
if (def.layers && !def.recto) {
  def = { activeFace: 'recto', recto: { layers: def.layers }, verso: { layers: [] } }
}
```

---

## 5. API changes

Aucun nouvel endpoint. La structure `definition` est étendue (voir §4).
La lecture du `GET /layouts/:id` retourne la nouvelle structure.

---

## 6. Implementation steps

- [ ] Définir et documenter la structure finale de `definition` (recto/verso)
- [ ] Migration à la lecture dans le store (`loadLayout`)
- [ ] Store : `activeFace` ref, action `setActiveFace(face)`
- [ ] Store : `layers` computed qui retourne `definition[activeFace].layers`
- [ ] EditorToolbar : toggle Recto/Verso
- [ ] EditorCanvas : watch `activeFace`, re-render sans recharger
- [ ] PropertiesPanel : indiquer la face active dans le header
- [ ] LayerPanel : affiche les calques de la face active uniquement
- [ ] Selector "Dos commun" dans le panneau Verso
- [ ] Sauvegarde : envoie les deux faces dans `definition`
- [ ] Thumbnail : capturer la face recto par défaut

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Layout de type "dos" assigné comme sharedLayoutId | Verso = contenu du dos, non éditable |
| sharedLayoutId pointe sur un layout supprimé | Verso affiche placeholder "Dos introuvable" |
| Migration d'un layout sans verso | `verso.layers = []` — canvas verso vide |
| Binding dans les deux faces avec le même nom | Résolu par la même instance de données (partagée) |
| Exporter sans verso défini | Exporter recto seulement, avertissement |

---

## 8. Acceptance criteria

- [ ] Basculement recto/verso sans rechargement
- [ ] Calques indépendants par face
- [ ] Migration transparente des layouts existants
- [ ] Possibilité de référencer un "dos commun"
- [ ] Sauvegarde des deux faces dans la même définition
- [ ] Thumbnail = face recto

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [ ] Le type "dos" est-il un type de layout spécial ou une propriété (`isBack: true`) ?
- [ ] Les calques verso peuvent-ils référencer des atomes du recto (clonage) ?
- [ ] Faut-il un aperçu miniature séparé pour le verso dans la vue listing ?

---

## 11. Notes

- Type de carte "dos" déjà dans l'enum : `dos`
- Le verso partagé évite de dupliquer le travail de design du dos sur chaque layout
