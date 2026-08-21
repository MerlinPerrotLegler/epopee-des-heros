# Design — Taille du layout d’un composant

| Field       | Value |
|-------------|--------|
| Status      | Done |
| Date        | 2026-08-21 |
| Canonical   | `specs/TSD-031-component-layout-size.md` |
| Depends on  | TSD-005, TSD-001 |

---

## 1. Goal

Pouvoir **changer la taille native** (`width_mm` × `height_mm`) d’un composant **après création**, depuis l’éditeur et la liste — comme le ⚙ des layouts.

---

## 2. Decisions (from brainstorming)

| Question | Choice |
|----------|--------|
| Intent | Canvas natif du composant, pas la boîte d’une instance sur une carte |
| Instances posées | **C** — ne pas les mettre à jour ; pas de re-scale des atomes (mm absolus) |
| UI | **A** — ⚙ + modal allégée (nom + dims + ⇄), éditeur et liste |
| Molécules | hors scope |
| Miniature | pas recapturée au seul changement de taille |
| Overflow | autorisé, pas d’alerte |

---

## 3. Architecture

- Colonnes `components.width_mm` / `height_mm` déjà là : **pas de migration**.
- `PATCH /api/components/:id` étendu (aujourd’hui name-only) ; helper `normalizeComponentMeta` testable.
- UI : `ComponentSettingsModal` dédiée (pas `LayoutSettingsModal`).
- Store : `applyLayoutMeta` + `requestFit = 'fit'` ; `saveDefinition` PUT déjà envoie les dims.

Détail UX / API / edge cases / tests : **TSD-031**.
