# Questions ouvertes — session 2026-08-20

Décisions à trancher. Chaque item a une **proposition** déjà suivie dans le code de cette session, sauf mention « pas encore codé ».

---

## Q1 — Option « supprimer les cartes absentes du CSV »

TSD-007 §14 : risqué, off par défaut.

**Proposition (codée) :** checkbox dans l’étape Options, **décochée par défaut**. Ne touche que les instances du **même ImportJob** (pas les cartes créées à la main). La sync URL n’élague pas, sauf si on relance un import avec l’option.

---

## Q2 — Écraser les cartes existantes (`overwrite`)

La case existait dans le wizard mais n’était pas envoyée au backend (toujours upsert).

**Proposition (codée) :** `overwrite=true` par défaut (comportement actuel). Si décoché : les lignes dont l’identifiant existe déjà pour ce job sont **ignorées** (skipped), pas mises à jour.

---

## Q3 — URLs d’images dans le CSV (`mediaId`)

TSD-007 §14 : uploader automatiquement une URL externe, ou n’accepter que des IDs média existants ?

**Proposition (pas encore codé) :** **IDs seulement** pour v1. Une URL dans `*.mediaId` reste une valeur inconnue → ligne `missing_media` (file IA TSD-012). Un auto-download d’URL externes est un risque sécurité (SSRF) et un autre TSD.

---

## Q4 — Persister les mappings hors ImportJob

TSD-007 §14 : réutiliser un mapping d’un import à l’autre.

**Proposition (pas encore codé) :** la table `import_mappings` existe déjà. Plus tard : bouton « Sauver ce mapping » dans le wizard. En attendant, re-importer recrée le mapping (auto-déduction + manuel).

---

## Q5 — Moteur d’export PDF (TSD-009)

TSD-009 recommande **html2canvas + jsPDF côté client** (pas Puppeteer : déjà retiré du backend Hostinger).

**Proposition :**
1. **PNG instance unique** — html2canvas (déjà dans le projet) — **codé cette session**.
2. **PDF batch** — ajouter `jspdf` plus tard, même DOM mm que l’impression navigateur. Pas de moteur serveur.

---

## Q6 — Routes publiques (`/uploads`, `/status`)

WORKPLAN : « Aucune route backend n’expose de données sans auth ».

**Proposition (pas de changement) :**
- `/api/*` reste derrière `requireAuth`.
- `/uploads/:filename` reste public : les `<img>` du canvas n’envoient pas le cookie de session. Alternative (signed URLs) = gros chantier.
- `/status` et `/api/health` restent publics pour le diagnostic Hostinger.

---

## Q7 — hexTile

WORKPLAN : « finaliser le rendu SVG hexagonal ».

**Proposition (codée) :** même géométrie `HEX_POINTS_PCT` que les layouts hex, viewBox en mm, `borderWidth` / `fontSize` en mm physiques (plus de `× 8` / `× 6`).
