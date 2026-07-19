# Guide utilisateur — Texte riche (RichText)

> Comment écrire du contenu dans l’atome **Texte riche** : mise en forme, shortcodes, pictogrammes et données de carte.

Ce guide est aussi accessible depuis l’éditeur via le bouton **Doc** du panneau propriétés (quand un atome RichText est sélectionné).

---

## 1. Principes

- Vous éditez le **source** (textarea), la carte sur le canvas montre le **rendu**.
- Tapez `/` pour ouvrir le menu d’insertion (filtre + flèches ↑↓ + Entrée).
- Les arguments des shortcodes acceptent `( )` **ou** `{ }` indifféremment.
- L’ancienne syntaxe (`/D8`, `\ref`, `/R{or,3}`, `/SVG…`) n’est **plus** reconnue.

---



## 2. Mise en forme (markdown)



### Titres

```
# Titre 1
## Titre 2
### Titre 3
#### Titre 4
##### Titre 5
###### Titre 6
```



### Listes

```
- Puce (icône configurable : paramètre « Icône de puce » de l’atome)
1. Élément numéroté
2. Suite
```



### Cases à cocher (visuelles)

```
[ ] À faire
[x] Fait
```

Icônes configurables sur l’atome : **Case vide** / **Case cochée** (média), sinon ☐ / ☑.



### Alignement

Paramètre atome **align** = défaut (`left` | `center` | `right` | `justify`).

Dans le contenu, une ligne seule change l’alignement des blocs **suivants** :

```
/align{center}
# Titre centré
/align{justify}
Paragraphe justifié…
/align{left}
```



### Séparateur calligraphique

```
/separator{basic,2}
/separator{rare,3}
/separator
```

- `tier` : `fin` | `basic` | `rare` | `epic` | `mythique` | `legendaire` (défaut `basic`)
- `hauteur` : mm (défaut `2`) ; largeur = largeur de l’atome
- L’ancienne ligne `------` n’est plus reconnue



### Cadre calligraphique

```
/cadre{basic,12}
/cadre{rare,16,star5}
/cadre
```

- `tier` : mêmes valeurs que le séparateur (défaut `basic`)
- `hauteur` : mm (défaut `12`) ; largeur = largeur de l’atome
- `coin` (optionnel) : `none` | `star4` | `star5` | `circle` | `square` | `triangle` (défaut `star4`)



### Autres blocs

```
> Citation

Texte avec une => flèche jolie
```



### Inline

```
**gras**  *italique*  __souligné__  ~~barré~~  `code`
```



### Formules (FML → KaTeX)

Les expressions entre `$$` / `$$$` sont converties (FML) puis rendues avec [KaTeX](https://katex.org/) ([documentation](https://katex.org/docs/supported.html)).

```
$$frac(a,b)$$          inline
$$$pow(x,2)$$$         bloc centré
```

---



## 3. Shortcodes `/`



### Dés


| Syntaxe   | Effet                          |
| --------- | ------------------------------ |
| `/d8{3}`  | Dé 8 (atome Dice8), text `3`   |
| `/d12{7}` | Dé 12 (atome Dice12), text `7` |
| `/d8`     | Text `D8`                      |
| `/d12`    | Text `D12`                     |




### Caractéristiques


| Syntaxe    | Effet              |
| ---------- | ------------------ |
| `/FOR{+1}` | Modificateur + nom |
| `/INI`     | Nom seul           |


Codes : `FOR`, `DEX`, `INI`, `CHA`, `MAG`, `DEV`, `VIE`, `DEF`.

### SVG


| Syntaxe                    | Effet                  |
| -------------------------- | ---------------------- |
| `/svg{mon-icone.svg}`      | Image dans `/uploads/` |
| `/svg{mon-icone.svg,#c00}` | Idem + teinte couleur  |




### Données de carte (aliases)


| Syntaxe             | Effet                      |
| ------------------- | -------------------------- |
| `/data{price.gold}` | Injecte la valeur liée     |
| `$<price.gold>`     | **Identique** à `/data{…}` |




### Pictogrammes (catalogue Pictorgame)

**Par référence directe** (défaut affichage = `icon`) :

```
/epee-longue
/epee-longue{icon}
/epee-longue{label}
/epee-longue{both}
```

**Par tag + ref + affichage** (3 arguments **obligatoires**) :

```
/picto{armes, epee-longue, icon}
/picto(armes, epee-longue, both)
```

Vues RichText : uniquement `icon` | `label` | `both`  
(les 6 vues de l’atome Picto standalone ne s’appliquent pas ici).

La liste des `picto_ref` disponibles est **dynamique** (catalogue Pictorgame) : elle apparaît dans le menu `/` et dans la section dynamique de la Doc.

### Ressources / prix

Utilisez les pictos du catalogue (ex. `/pieces{both}`) plutôt que l’ancien `/R{…}`.  
Le type de ressource atome **Pièces** s’appelle désormais `pieces` (anciennement `or`).

---



## 4. Menu `/` (aide à la saisie)

1. Placez le curseur et tapez `/`.
2. Continuez à écrire pour filtrer.
3. ↑ / ↓ pour surligner une entrée, Entrée pour insérer, Échap pour fermer.
4. Selon l’entrée, un second pas propose les options (vue, valeur du dé, couleur SVG, etc.).

---



## 5. Documentation dans l’app

- **Docs** (menu principal) → ce fichier `GUIDE-richtext`.
- **Éditeur** → atome RichText → bouton **Doc** : même contenu + liste à jour des pictos et caracs.

---



## 6. Exemple complet

```
## Quête du dragon

/align{center}
# Mission

/align{left}
- Apporter /pieces{both} au forgeron
- [ ] Trouver /picto{armes, epee-longue, icon}
- [x] Parler au PNJ

/separator{basic,2}

Jet : /d8{4} + /FOR{+1}

Récompense => $<reward.text>

> « Seul le brave réussira. »

/svg{sceau.svg,#8b5a2b}
```

---



## 7. Dépannage


| Problème                   | Piste                                             |
| -------------------------- | ------------------------------------------------- |
| Shortcode affiché en clair | Syntaxe legacy ou typo ; utiliser `/d8` pas `/D8` |
| `?{ref}`                   | Picto absent du catalogue                         |
| `/picto` ne rend rien      | Il faut **3** arguments : tag, ref, vue           |
| Puce trop générique        | Régler `bulletIcon` sur l’atome                   |
| Cases trop génériques      | Régler `checkboxIcon` / `checkboxIconChecked`     |
| Séparateur absent          | Utiliser `/separator{tier,hauteur}` (plus `------`) |
| Donnée vide                | Vérifier le binding / preview data du layout      |
| )                          |                                                   |


