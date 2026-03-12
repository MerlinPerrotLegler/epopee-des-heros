# TSD-010 — Validation des règles du jeu

| Field       | Value                       |
|-------------|-----------------------------|
| Status      | Draft                       |
| Author      | @merlinperrot               |
| Created     | 2026-03-12                  |
| Last update | 2026-03-12                  |
| Depends on  | TSD-007                     |

---

## 1. Purpose

Le jeu a des règles précises sur la structure des cartes (champs requis, valeurs autorisées, cohérence entre type de carte et ressources). Une fois les instances saisies, le designer doit pouvoir détecter les incohérences sans avoir à relire manuellement chaque carte. Ce TSD décrit un système de validation léger exécuté à la demande.

---

## 2. Scope & boundaries

### In scope
- Validation des instances de cartes contre les règles du jeu
- Règles configurables dans un fichier JSON (pas de code)
- Rapport de validation avec liste des erreurs par carte
- Indicateur visuel dans la liste des instances (badge vert/rouge)
- Types de règles : champ requis, valeur dans une liste, plage numérique, cohérence inter-champs

### Out of scope
- Validation en temps réel à chaque frappe (trop intrusif)
- Règles d'équilibre (game balance) — trop complexe et subjectif
- Validation de la mise en page (dimensions, chevauchements) — non prévu

---

## 3. UX & interaction design

### Déclenchement
- Bouton "Valider toutes les cartes" dans `CardInstancesView`
- Ou icône de validation par instance dans la liste

### Rapport de validation
```
┌──────────────────────────────────────────┐
│ Validation — 24 cartes                   │
│                                          │
│ ✅ 20 cartes valides                     │
│ ❌  4 cartes avec erreurs                │
│                                          │
│  ❌ Épée de feu                          │
│     • price.resources : valeur manquante │
│     • card_type.type  : valeur invalide  │
│                                          │
│  ❌ Potion mystère                       │
│     • description.text : texte trop long │
│       (max 200 caractères, actuel : 237) │
│                                          │
│        [ Fermer ]  [ Exporter rapport ]  │
└──────────────────────────────────────────┘
```

### Badge dans la liste
- `✅` = validée sans erreur
- `❌` = erreurs détectées
- `?` = non encore validée

---

## 4. Data model

### Fichier de règles `game-rules/validation.json`
```json
{
  "version": "1.0",
  "rules": [
    {
      "id"      : "card_name_required",
      "field"   : "card_name.text",
      "type"    : "required",
      "message" : "Le nom de la carte est obligatoire"
    },
    {
      "id"      : "card_type_valid",
      "field"   : "card_type.type",
      "type"    : "enum",
      "values"  : ["equipement", "classe", "quete", "bricabrac", "cestpasjuste",
                   "buff", "faveur", "epopee", "enchantement", "rune", "dos"],
      "message" : "Type de carte invalide"
    },
    {
      "id"      : "description_length",
      "field"   : "description.text",
      "type"    : "maxLength",
      "max"     : 200,
      "message" : "La description ne doit pas dépasser 200 caractères"
    },
    {
      "id"      : "price_resources_valid",
      "field"   : "price.resources",
      "type"    : "array",
      "itemType": "resource",
      "validResources": ["or", "essence", "pierre", "mithril", "cristaux", "fragment"],
      "message" : "Ressource invalide dans le coût"
    },
    {
      "id"         : "quest_requires_reward",
      "type"       : "conditional",
      "condition"  : { "field": "card_type.type", "equals": "quete" },
      "field"      : "reward.text",
      "check"      : "required",
      "message"    : "Les cartes Quête doivent avoir une récompense"
    }
  ]
}
```

### Résultat de validation (en mémoire, non persisté)
```js
{
  instanceId: 42,
  valid: false,
  errors: [
    { ruleId: "card_name_required", field: "card_name.text", message: "…" },
    { ruleId: "card_type_valid",    field: "card_type.type", message: "…" }
  ]
}
```

---

## 5. API changes

### `POST /validate`
- **Request:** `{ instanceIds: [1, 2, 3] }` ou `{ layout_id: X }` pour toutes les instances d'un layout
- **Response:**
```json
[
  { "instanceId": 1, "valid": true,  "errors": [] },
  { "instanceId": 2, "valid": false, "errors": [{ "ruleId": "…", "field": "…", "message": "…" }] }
]
```

La validation est exécutée côté serveur (les règles sont dans un fichier JSON lu par Express). Cela permet de partager les règles entre plusieurs clients.

---

## 6. Implementation steps

- [ ] Définir `game-rules/validation.json` avec toutes les règles du jeu
- [ ] `backend/utils/validator.js` : moteur de validation (parcourt les règles, évalue chaque type)
- [ ] Route `POST /validate`
- [ ] `api.js` : `validateInstances(ids)`
- [ ] Store : `validationResults` map (instanceId → résultat)
- [ ] `CardInstancesView` : badge ✅/❌/? par instance
- [ ] `ValidationReport.vue` : modal avec rapport détaillé
- [ ] Bouton "Valider toutes" dans la vue
- [ ] Export du rapport en CSV/TXT

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Règle avec `field` inexistant dans le layout | Règle ignorée (champ optionnel pour ce layout) |
| Instance sans aucun binding | Toutes les règles "required" échouent |
| `validation.json` malformé | Log d'erreur serveur, réponse 500, pas de crash silencieux |
| 200 instances à valider | Validation batch en une requête, résultat complet |
| Règle conditionnelle : condition non remplie | Règle non évaluée (skip) |

---

## 8. Acceptance criteria

- [ ] Toutes les règles du jeu définies dans `validation.json`
- [ ] Validation d'un batch d'instances en moins de 2 secondes
- [ ] Rapport visuel clair avec erreurs par carte
- [ ] Badge par instance dans la liste
- [ ] Les règles sont modifiables sans toucher au code

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [ ] Les règles doivent-elles être éditables depuis l'interface (non-développeur) ?
- [ ] Faut-il des niveaux de sévérité (erreur bloquante vs avertissement) ?
- [ ] La validation doit-elle bloquer l'export (TSD-009) si des erreurs existent ?

---

## 11. Notes

- Les règles du jeu sont dans `game-rules/` (Cartes.xlsx, etc.) — à analyser pour extraire les contraintes
- Le moteur de validation est intentionnellement simple (pas de JSONSchema complet) pour rester maintenable sans développeur
- Types de règles prévus : `required`, `enum`, `minLength`, `maxLength`, `min`, `max`, `array`, `conditional`
