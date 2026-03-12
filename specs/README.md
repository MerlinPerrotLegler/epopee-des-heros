# Specs — Épopée, Guiles et Avanturiers · Card Designer

This folder contains all Technical Specification Documents (TSD) for the Card Designer tool.

---

## Project overview

The Card Designer is a web application for designing and managing cards for the board game *Épopée, Guiles et Avanturiers*. It allows the game designer to compose card layouts visually using atoms, molecules and components, bind data, and export print-ready content.

**Stack:**
- Frontend: Vue 3 + Pinia + Vite (port 5173)
- Backend: Express.js + better-sqlite3 (port 3001)
- Database: SQLite (`backend/data/card-designer.db`)

**Core concepts:**
- **Atom** — a single visual primitive (text, icon, die, resource price, etc.)
- **Molecule** — a reusable group of atoms with fixed structure
- **Component** — an assembly with named placeholders, no data
- **Layout** — a full card template with layers, recto/verso, and data bindings
- **Card instance** — a layout + a flat JSON object filling the bindings

---

## File naming convention

```
TSD-<NNN>-<short-slug>.md
```

Examples:
```
TSD-001-layer-management.md
TSD-002-thumbnail-auto-generation.md
TSD-003-card-instance-editor.md
```

NNN is a zero-padded sequential number. Keep one TSD per feature.

---

## TSD template

Copy the block below into a new file and fill every section.
Delete sections that are explicitly not applicable, but never silently skip them — write "N/A — [reason]" instead.

---

```markdown
# TSD-NNN — Feature Name

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Draft / Review / Done        |
| Author      | @name                        |
| Created     | YYYY-MM-DD                   |
| Last update | YYYY-MM-DD                   |
| Depends on  | TSD-XXX, TSD-YYY (or "none") |

---

## 1. Purpose

One paragraph. What problem does this feature solve, and why now?
Avoid describing the implementation — describe the user need.

---

## 2. Scope & boundaries

### In scope
- Bullet list of exactly what this TSD covers.

### Out of scope
- Bullet list of related things explicitly NOT part of this feature.
  Be precise — vague boundaries create scope creep.

---

## 3. UX & interaction design

Describe what the user sees and does, step by step.
Use numbered flows for primary paths, bullet lists for secondary interactions.

### Primary flow
1. User does X
2. System responds with Y
3. …

### Secondary interactions
- Hovering over Z shows tooltip "…"
- Keyboard shortcut: `Ctrl+S` triggers save
- …

### Visual states
List all distinct UI states: empty, loading, error, success, partial, disabled, etc.
Include layout sketches as ASCII art or link to a Figma frame if one exists.

---

## 4. Data model

Describe new or modified data structures.

```json
// Example: new field added to layout definition
{
  "layers": [
    {
      "id": "uuid",
      "kind": "group | element",
      "name": "string",
      "locked": false,
      "visible": true,
      "opacity": 1.0
    }
  ]
}
```

List every new column, table, API field, or store key.
State the migration strategy when an existing schema changes.

---

## 5. API changes

For each new or modified endpoint:

### `METHOD /path`
- **Purpose:** What it does
- **Auth:** required / none
- **Request body:**
  ```json
  { "field": "type — description" }
  ```
- **Response:**
  ```json
  { "field": "type — description" }
  ```
- **Error cases:** 400 if X, 404 if Y, 409 if Z

---

## 6. Implementation steps

Ordered checklist. Each step must be independently testable.

- [ ] Step 1 — backend: add column `foo` to `layouts` table
- [ ] Step 2 — backend: implement `PUT /layouts/:id/foo`
- [ ] Step 3 — store: add action `updateFoo()`
- [ ] Step 4 — component: wire UI to store action
- [ ] Step 5 — test: verify edge cases listed in §7

Group steps by layer (DB → backend → store → component → integration).

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| User saves with empty name | Block save, show inline error |
| Network drops during save | Show error toast, keep dirty state |
| Two tabs open same layout | Last write wins; no silent data loss |
| … | … |

---

## 8. Acceptance criteria

The feature is done when ALL of these are true:

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] …

---

## 9. Known bugs

> Update this section whenever a bug related to this feature is found,
> whether during development or after release.

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

**Bug status values:** `open` · `in progress` · `fixed in commit abc1234` · `wont fix — reason`

---

## 10. Open questions

Questions that need an answer before or during implementation.
Remove entries once resolved; record the decision in the relevant section above.

- [ ] Q1 — Should X persist across sessions?
- [ ] Q2 — …

---

## 11. Notes & references

- Link to related game rules: `game-rules/Cartes.xlsx`
- Related TSD: TSD-XXX
- Any other context, research, or decisions that don't fit above.
```

---

## Writing guidelines

**Be specific.** "The button saves the layout" is vague. "Clicking Save calls `PUT /layouts/:id/definition`, disables the button while in-flight, and shows a 2-second success toast on completion" is a spec.

**Define boundaries first.** If you cannot write the "out of scope" section, the feature is not ready to spec.

**One feature, one TSD.** If a spec covers two independent features, split it. If two features are inseparable, say why in the Purpose section.

**Update, don't rewrite.** When a decision changes, add a dated note explaining the change rather than silently overwriting the original text. This preserves the design reasoning.

**Bugs belong in the TSD, not only in commit messages.** If a bug is found post-release, open the relevant TSD and log it in §9. This keeps the spec accurate and gives future developers full context.

**Keep status up to date.** A TSD is `Draft` while being written, `Review` when shared for feedback, and `Done` when all acceptance criteria are met.
