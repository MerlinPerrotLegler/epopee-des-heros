# TSD-025 — Rendu carte CSS mm + viewport transform

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Status      | Done                                       |
| Author      | @merlinperrot                              |
| Created     | 2026-07-18                                 |
| Last update | 2026-07-18                                 |
| Depends on  | TSD-001 (canvas), TSD-022 (mm physiques données) |

---

## 1. Purpose

Remplacer le pipeline d’affichage `mm × zoom → px` par :

1. Longueurs carte en **CSS `mm`** (`mmCss(n)` → `4.5mm`)
2. Zoom / pan uniquement via **`transform: translate(...) scale(...)`** sur le viewport
3. Pointeur → mm via **`getBoundingClientRect()`** (`clientPointToCardMm` / `clientDeltaToCardMm`)

Corrige la dérive texte/boîtes au zoom et unifie éditeur, preview et impression navigateur.

---

## 2. Spec source

Design détaillé + décisions :  
`docs/superpowers/specs/2026-07-18-mm-css-viewport-transform-design.md`

Plan d’implémentation (tasks 1–8) :  
`docs/superpowers/plans/2026-07-18-mm-css-viewport-transform.md`

Helpers : `frontend/src/utils/cssMm.js`  
`useMmScale.js` = helpers **écran / règles** seulement — interdit pour le rendu carte.

---

## 3. Acceptance (design §9)

- [x] Zoom : texte ne dérive plus vs boîtes
- [x] Valeurs mm panneau propriétés stables
- [x] Grille / snap / guides / poignées / flèches dans le monde mm
- [x] Drag / resize OK à plusieurs zooms
- [x] Preview = mêmes proportions que l’éditeur
- [x] Print : chrome masqué ; cartes non coupées (`break-inside: avoid`)
- [x] Aucun chemin rendu carte `mm * zoom` → px (règles / fit / html2canvas OK)

---

## 4. Out of scope

- Re-migration des données mm (TSD-022 inchangé côté store/JSON)
- Export PDF lib (print navigateur uniquement pour l’instant)
