# RichText — checkbox icons, `/separator`, `/align`

Date: 2026-07-18  
Status: Approved (conversation)

## Decisions

1. **Checkbox icons** (atome) : `checkboxIcon` + `checkboxIconChecked` (MediaPicker, même résolution que `bulletIcon`). Défauts ☐ / ☑.
2. **Séparateur** : shortcode bloc `/separator{tier,hauteur}` uniquement. `------` retiré. Défauts `basic`, `2` mm. Largeur = largeur de l’atome. Rendu `buildSeparatorPaths`.
3. **Alignement** : `/align{left|right|center|justify}` sur une ligne seule ; s’applique aux blocs suivants jusqu’au prochain `/align`. Param atome `align` = défaut (+ `justify` ajouté).

## Hors scope

- Alignement collé aux shortcodes inline (`/d8{5}::center`)
- `direction` verticale pour `/separator`
