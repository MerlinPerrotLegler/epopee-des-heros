# TSD-016 — Configuration globale & tokens de design

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Done                         |
| Author      | @merlinperrot                |
| Created     | 2026-03-13                   |
| Last update | 2026-03-13                   |
| Depends on  | TSD-001 (canvas éditeur)     |

---

## 1. Purpose

Plutôt que de modifier chaque atome individuellement, l'utilisateur doit pouvoir définir des valeurs par défaut globales (couleurs, polices, tailles) qui s'appliquent à tous les nouveaux atomes et servent de référence visuelle cohérente. Ce TSD couvre la table `settings` + l'onglet "Design" de `ConfigView` + la configuration IA déjà présente dans `config.js`.

---

## 2. Scope & boundaries

### In scope
- Stockage d'un objet JSON plat dans `settings.design_config` (table singleton)
- **Tokens de design** : couleurs primaire/secondaire, police par défaut, taille de texte de base
- **Configuration IA** (déjà implémentée, voir TSD-012) : `api_key`, `provider`, `global_prompt`, `media_type_presets` — dans `ai_generation_config`
- Interface `ConfigView` avec onglets : Tokens | Polices | IA Provider

### Out of scope
- Thèmes multiples (un seul design_config actif)
- Application rétroactive des tokens aux atomes existants (les atomes gardent leurs valeurs)
- Variables CSS dynamiques générées depuis les tokens

---

## 3. UX & interaction design

### Primary flow
1. L'utilisateur ouvre **ConfigView → onglet Tokens**.
2. Il voit les champs de configuration : couleur accent, couleur texte, police par défaut, etc.
3. Il modifie une valeur et clique « Sauvegarder ».
4. Un toast confirme la sauvegarde.
5. Les nouveaux atomes ajoutés après la sauvegarde utilisent ces valeurs comme `defaultParams` de fallback.

### Visual states
- **Chargement** : spinner ou skeleton
- **Sauvegardé** : toast vert « Configuration sauvegardée »
- **Erreur** : toast rouge

---

## 4. Data model

```sql
CREATE TABLE IF NOT EXISTS settings (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  design_config TEXT    NOT NULL DEFAULT '{}'
);
```

Format de `design_config` (exemple) :
```json
{
  "accentColor":   "#6c7aff",
  "textColor":     "#ffffff",
  "bgColor":       "#1a1c2e",
  "fontFamily":    "Outfit",
  "baseFontSize":  3.0,
  "borderColor":   "#6c7aff",
  "borderWidth":   0.3
}
```

---

## 5. API changes

### `GET /api/config`
- **Response :** objet JSON plat (`design_config`)

### `PUT /api/config`
- **Request body :** objet JSON plat (remplace intégralement `design_config`)
- **Response :** l'objet sauvegardé

### `GET /api/config/ai` et `PUT /api/config/ai`
- Voir TSD-012 (déjà implémenté)

---

## 6. Implementation steps

- [x] Table `settings` dans `schema.sql`
- [x] `routes/config.js` : GET `/api/config`, PUT `/api/config`, GET/PUT `/api/config/ai`
- [x] `ConfigView.vue` : onglets Tokens | Polices | IA Provider
- [x] `api.js` : `getConfig()`, `updateConfig()`, `getAIConfig()`, `putAIConfig()`

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| `design_config` inexistant en DB | GET retourne `{}` ; PUT insère avec `INSERT OR REPLACE` |
| Champ inconnu dans le JSON | Stocké tel quel, ignoré par le frontend s'il ne le connaît pas |

---

## 8. Acceptance criteria

- [x] `PUT /api/config` persiste les tokens en DB
- [x] `GET /api/config` retourne les tokens sauvegardés
- [x] `ConfigView` affiche et sauvegarde les tokens
- [x] L'onglet IA Provider est fonctionnel (voir TSD-012)

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

*(aucune)*

---

## 11. Notes & références

- `settings.id = 1` est toujours la seule ligne (singleton via `INSERT OR REPLACE`).
- Les tokens ne remplacent pas les `defaultParams` des atomes — ils pourraient être utilisés comme fallback dans une future évolution.
