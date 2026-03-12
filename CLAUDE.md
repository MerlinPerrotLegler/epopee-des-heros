# Instructions permanentes — Claude Code

Ce fichier est lu automatiquement par Claude à chaque session.
Ne pas supprimer ni déplacer.

---

## Règle obligatoire : mise à jour du plan de travail

**À la fin de chaque session de travail, Claude DOIT mettre à jour `specs/WORKPLAN.md` :**

1. Cocher les tâches terminées dans les sections a) et b)
2. Ajouter les nouvelles tâches découvertes
3. Recalculer les pourcentages de progression (section d)
4. Mettre à jour la liste des prochaines actions (section e) en retirant ce qui est fait et en ajoutant ce qui émerge
5. Ajouter une ligne dans le journal des sessions (section f) avec la date du jour et un résumé concis des changements effectués

Cette mise à jour est **non négociable** — même si la session était courte ou n'a produit qu'une seule modification.

---

## Conventions techniques

- Mesures toujours en **mm** dans le store, les composants, et les props. Jamais de valeurs px codées en dur.
- Scale : `3.7795 px/mm` (constante dans `useMmScale.js`)
- Snap par défaut : 1 mm
- Framework : **Vue 3** Composition API + Pinia. Ne pas utiliser React, Options API, ou vue-class-component.
- Backend : Express.js + better-sqlite3. Pas d'ORM.
- Migrations DB : toujours idempotentes (`try { db.exec('ALTER TABLE...') } catch {}`)

## Conventions de code

- Pas de `px` codé en dur dans les composants Vue (passer par SCALE)
- Toujours lire un fichier avant de le modifier
- Préférer `Edit` sur `Write` pour les fichiers existants
- Ne pas créer de fichiers de documentation (.md) sauf si explicitement demandé

## Spécifications

- Toute nouvelle feature doit avoir un TSD dans `specs/` avant d'être implémentée si elle est non triviale
- Nommage : `TSD-NNN-slug.md`
- Template et guide : `specs/README.md`
- Plan général : `specs/WORKPLAN.md`
