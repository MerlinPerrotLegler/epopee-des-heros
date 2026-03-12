# TSD-009 — Export & impression

| Field       | Value                       |
|-------------|-----------------------------|
| Status      | Draft                       |
| Author      | @merlinperrot               |
| Created     | 2026-03-12                  |
| Last update | 2026-03-12                  |
| Depends on  | TSD-007, TSD-006            |

---

## 1. Purpose

Une fois les cartes conçues et les instances remplies, le designer doit pouvoir exporter un fichier prêt à imprimer. L'export doit respecter les dimensions exactes en mm, inclure le fond perdu si nécessaire, et regrouper plusieurs cartes sur une feuille A4/A3 pour optimiser le papier.

---

## 2. Scope & boundaries

### In scope
- Export PNG d'une seule instance (aperçu ou partage)
- Export PDF d'une instance unique (recto, ou recto + verso)
- Export PDF batch : toutes les instances d'un layout sur feuilles A4/A3
- Options d'export : résolution DPI, fond perdu (bleed), traits de coupe
- Intégration des fonts personnalisées dans le PDF
- Gabarit de placement (N cartes par feuille, espacement configurable)

### Out of scope
- Export vers des services d'impression tiers (Printify, etc.)
- Export SVG vectoriel (non prévu en v1)
- Pré-presse avancée (séparation des couleurs, ICC profiles)

---

## 3. UX & interaction design

### Modal d'export
```
┌─────────────────────────────────────┐
│ Export                              │
│                                     │
│  Format :  ○ PNG   ● PDF            │
│  Contenu : ○ Instance seule         │
│            ○ Toutes les instances   │
│                                     │
│  ── Options avancées ─────────────  │
│  Résolution : [ 300 ] dpi           │
│  Fond perdu : [ 3   ] mm            │
│  Traits de coupe : ☑                │
│  Faces :    ☑ Recto  ☑ Verso        │
│                                     │
│  Mise en page (batch) :             │
│    Feuille : ○ A4  ○ A3             │
│    Marge :   [ 5 ] mm               │
│    Espacement entre cartes : [ 2 ] mm│
│                                     │
│        [ Annuler ]  [ Exporter ]    │
└─────────────────────────────────────┘
```

### Primary flow — export PNG unique
1. Sur l'aperçu d'une instance (ou depuis la liste), clic "Exporter"
2. Modal → format PNG, résolution 300dpi
3. Clic "Exporter" → téléchargement `nom-instance.png`

### Primary flow — export PDF batch
1. Depuis `CardInstancesView`, sélectionner un layout → bouton "Exporter tout"
2. Modal → PDF, toutes les instances, A4, fond perdu 3mm
3. Clic "Exporter" → le serveur génère le PDF → téléchargement

### Gabarit de coupe
- Lignes grises fines à l'extérieur de chaque carte (longueur 5mm, offset 2mm)
- N'impriment pas dans la zone de fond perdu

---

## 4. Data model

Pas de nouvelle table. L'export est une opération stateless côté serveur : il reçoit une liste d'instances + options et retourne un fichier.

### Payload de la requête d'export
```json
{
  "instanceIds"  : [1, 2, 3],
  "format"       : "pdf",
  "dpi"          : 300,
  "bleedMm"      : 3,
  "cutMarks"     : true,
  "faces"        : ["recto", "verso"],
  "sheet"        : "A4",
  "marginMm"     : 5,
  "gutterMm"     : 2
}
```

---

## 5. API changes

### `POST /export`
- **Auth:** required
- **Request:** voir payload §4
- **Response:** fichier PDF ou PNG en streaming (`Content-Disposition: attachment`)
- **Durée:** potentiellement longue (secondes à dizaines de secondes pour un batch)

### Considérations techniques
- Le rendu côté serveur nécessite un moteur headless (Puppeteer ou Playwright) **ou** un rendu côté client (html2canvas / jsPDF)
- Recommandation : rendu côté client avec `html2canvas` + `jsPDF` pour éviter la dépendance Puppeteer côté serveur
- Pour le PDF batch : canvas de chaque carte → JPEG intégré dans jsPDF, placement automatique sur les feuilles

---

## 6. Implementation steps

- [ ] Définir le moteur de rendu : client (html2canvas + jsPDF) ou serveur (Puppeteer)
- [ ] `utils/export.js` : fonctions `renderCardToCanvas(instance)`, `buildPDF(options)`
- [ ] Route `POST /export` si rendu serveur, ou action store si rendu client
- [ ] Modal `ExportModal.vue` avec toutes les options
- [ ] Fonction de placement sur feuille : calcul N×M cartes avec marges et gouttières
- [ ] Rendu fond perdu : agrandir la zone de carte de `bleedMm` avant capture
- [ ] Traits de coupe : dessiner en dehors de la zone de carte
- [ ] Intégration fonts custom dans le rendu (injection `@font-face` avant capture)
- [ ] Export PNG : `canvas.toBlob()` → téléchargement
- [ ] Export PDF : jsPDF + `addImage` pour chaque carte
- [ ] Test avec un batch de 50+ cartes (performance)

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| Instance sans données (bindings vides) | Exportée avec les valeurs par défaut des atomes |
| Font custom non chargée au moment de l'export | Attendre le chargement avant capture |
| Batch de 100 cartes | Progression visible (progress bar), pas de timeout |
| Carte sans verso défini | Exporter recto uniquement si verso non coché |
| Dimensions de carte non standard | Gabarit calculé dynamiquement selon les mm |
| Fond perdu + traits de coupe combinés | Traits à l'extérieur du fond perdu |

---

## 8. Acceptance criteria

- [ ] Export PNG d'une instance à 300 dpi
- [ ] Export PDF d'une instance (recto seul ou recto+verso)
- [ ] Export PDF batch avec placement automatique sur A4
- [ ] Fond perdu configurable
- [ ] Traits de coupe visibles sur le PDF
- [ ] Fonts custom incluses dans le rendu

---

## 9. Known bugs

| # | Description | Status | Found on |
|---|-------------|--------|----------|
| 1 | — | — | — |

---

## 10. Open questions

- [ ] Rendu client ou serveur ? (client = plus simple à déployer, serveur = plus fiable pour les fonts)
- [ ] jsPDF ou pdfmake ? (jsPDF plus simple pour intégrer des images)
- [ ] Faut-il un historique des exports (timestamp, options) ?
- [ ] Résolution minimale acceptable ? 150 dpi pour la prévisualisation, 300 pour l'impression ?

---

## 11. Notes

- Dimensions standard carte à jouer : 63 × 88 mm (format poker)
- Fond perdu standard impression : 3 mm
- DPI recommandé pour l'impression offset : 300 dpi
- 1 mm à 300 dpi = 11.81 px → une carte 63×88 mm = ~744×1039 px
- Placement sur A4 (210×297 mm avec marges 5mm et gouttière 2mm) : 3 colonnes × 3 rangées = 9 cartes par feuille
