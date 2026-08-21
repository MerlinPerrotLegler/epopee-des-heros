# Design — Administration des types de layout

| Field       | Value |
|-------------|--------|
| Status      | Review |
| Date        | 2026-08-21 |
| Canonical   | `specs/TSD-029-types-de-layout.md` |
| Depends on  | TSD-017 (`card_types`) |

---

## 1. Goal

Pouvoir **ajouter / renommer (libellé) / supprimer** les types associés aux layouts (`card_type`), depuis Configuration et depuis la modale de création/édition de layout.

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Où | **C** — Config + raccourci modale |
| CRUD Config | **C** — ajout + rename label + delete (`code` immuable) |
| Saisie code | **C** — label obligatoire ; code optionnel, auto-slug si vide |
| Pattern | **1** — Config liste + création **inline** dans le select (pas combobox libre) |
| `dos` | pas de delete (409 + UI) ; label renommable |
| Delete utilisé | confirm ; layouts gardent le code orphelin ; badge = code |
| Couleur / icône par type | hors scope |

---

## 3. Architecture

- Table `card_types` inchangée.
- API : GET + `usage_count` ; POST slug + 409 (plus d’`INSERT OR IGNORE`) ; PATCH label ; DELETE.
- UI : `CardTypesPanel` (onglet Config) ; `CardTypeSelect` (modale layout + verso).
- `slugifyTypeCode` : NFD, minuscules, non `[a-z0-9]` → `_`. Serveur = source de vérité.

Détail UX / API / edge cases / tests : **TSD-029**.
