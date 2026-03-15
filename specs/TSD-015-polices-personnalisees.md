# TSD-015 — Gestion des polices personnalisées

| Field       | Value                        |
|-------------|------------------------------|
| Status      | Done                         |
| Author      | @merlinperrot                |
| Created     | 2026-03-13                   |
| Last update | 2026-03-13                   |
| Depends on  | TSD-004 (médias & assets)    |

---

## 1. Purpose

Les atomes texte (`title`, `text`, `caracteristique`, `trak`, etc.) permettent de choisir une police via `fontFamily`. Sans mécanisme dédié, l'utilisateur est limité aux polices système. Ce TSD permet d'enregistrer des polices supplémentaires (Google Fonts ou URL custom) qui sont injectées dans `<head>` et disponibles dans tous les sélecteurs de polices de l'éditeur.

---

## 2. Scope & boundaries

### In scope
- Enregistrement d'une police par son nom de famille + URL CSS (@font-face ou Google Fonts)
- Génération automatique d'une URL Google Fonts si aucune URL custom n'est fournie
- Listing et suppression des polices enregistrées
- Injection automatique des polices dans le DOM (balise `<link>` dynamique au chargement)
- Disponibles dans `PropertiesPanel` pour les atomes ayant un param `fontFamily`

### Out of scope
- Upload de fichier de police (.woff2, .ttf) — uniquement URL
- Prévisualisation de la police avant ajout
- Polices embarquées dans l'export PDF (TSD-009)

---

## 3. UX & interaction design

### Primary flow
1. L'utilisateur ouvre **ConfigView → onglet Polices**.
2. Il saisit le nom de la famille (ex : `Cinzel`) et optionnellement une URL CSS custom.
3. S'il laisse l'URL vide, une URL Google Fonts est auto-générée.
4. Il clique « Ajouter » → la police apparaît dans la liste et est injectée immédiatement dans le DOM.
5. Dans l'éditeur, le sélecteur `fontFamily` propose désormais cette police.
6. Pour supprimer : bouton ✕ dans la liste, sans confirmation (facile à re-ajouter).

### Visual states
- **Liste** : nom de famille + URL tronquée + bouton ✕
- **Erreur 409** : « Cette police est déjà ajoutée »

---

## 4. Data model

```sql
CREATE TABLE IF NOT EXISTS fonts (
  id        TEXT    PRIMARY KEY,
  family    TEXT    NOT NULL UNIQUE,
  url       TEXT    NOT NULL
);
```

---

## 5. API changes

### `GET /api/fonts`
- **Response :** `[{ id, family, url }]`

### `POST /api/fonts`
- **Request body :** `{ "family": "Cinzel", "url": "" }` (url optionnel)
- **Response :** `{ id, family, url }`
- **Error cases :** 400 si `family` absent, 409 si `family` déjà enregistrée

### `DELETE /api/fonts/:id`
- **Response :** 204 No Content

---

## 6. Implementation steps

- [x] Table `fonts` dans `schema.sql`
- [x] `routes/fonts.js` : GET, POST, DELETE
- [x] `FontManager.vue` (composant dans ConfigView) : listing + ajout + suppression
- [x] Injection des polices dans le DOM au chargement (boucle `<link>` dans `main.js` ou `App.vue`)
- [x] `PropertiesPanel` : sélecteur `fontFamily` enrichi des polices enregistrées

---

## 7. Edge cases

| Scenario | Expected behaviour |
|----------|--------------------|
| URL Google Fonts invalide ou inaccessible | La police n'est pas rendue, pas d'erreur bloquante |
| Police avec espace dans le nom (ex: "Noto Sans") | Encodage URL correct dans la génération auto |
| Suppression d'une police utilisée dans un atome | Autorisée — l'atome conserve le `fontFamily` mais la police ne s'affiche plus |

---

## 8. Acceptance criteria

- [x] Police ajoutée via POST est injectée dans `<head>` et visible dans les textes
- [x] Après suppression, la police disparaît de la liste (reste en cache navigateur jusqu'au reload)
- [x] 409 si famille déjà enregistrée
- [x] Sélecteur `fontFamily` dans PropertiesPanel liste les polices disponibles

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

- URL auto-générée : `https://fonts.googleapis.com/css2?family={EncodedFamily}:ital,wght@0,400;0,600;0,700;1,400&display=swap`
- Polices systèmes toujours disponibles même sans enregistrement (Outfit, JetBrains Mono…).
