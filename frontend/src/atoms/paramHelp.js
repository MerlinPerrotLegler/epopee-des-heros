/**
 * paramHelp.js
 * ────────────
 * Textes d'aide en français pour tous les paramètres de tous les atomes.
 * Destiné aux utilisateurs non-développeurs.
 *
 * Clé = nom du paramètre (identique à atoms/index.js → defaultParams).
 * Valeur = description courte en français.
 */
export const PARAM_HELP = {

  // ── AtomBackground ────────────────────────────────────────────────────────
  baseColor:        'Couleur de fond unie (en dessous de tout le reste)',
  grad1:            'Activer le premier dégradé',
  grad1Type:        'Type de dégradé : linéaire ou radial (ellipse depuis le centre)',
  grad1Angle:       'Angle du dégradé linéaire en degrés (0 = vers le bas, 90 = vers la droite)',
  grad1Color1:      'Couleur de départ du dégradé 1',
  grad1Stop1:       'Position de départ du dégradé 1 en % (0 = bord)',
  grad1Color2:      'Couleur d\'arrivée du dégradé 1',
  grad1Stop2:       'Position d\'arrivée du dégradé 1 en % (100 = bord opposé)',
  grad1Opacity:     'Opacité du calque dégradé 1 (0 = invisible, 1 = opaque)',
  grad2:            'Activer le second dégradé (superposé au premier)',
  grad2Type:        'Type de dégradé : linéaire ou radial',
  grad2Angle:       'Angle du second dégradé linéaire en degrés',
  grad2Color1:      'Couleur de départ du dégradé 2',
  grad2Stop1:       'Position de départ du dégradé 2 en %',
  grad2Color2:      'Couleur d\'arrivée du dégradé 2',
  grad2Stop2:       'Position d\'arrivée du dégradé 2 en %',
  grad2Opacity:     'Opacité du calque dégradé 2',
  textureMediaId:   'ID du fichier image ou SVG utilisé comme texture de fond',
  textureOpacity:   'Opacité de la texture (0 = invisible, 1 = opaque)',
  textureFit:       'Redimensionnement de la texture : remplir, contenir, ou étirer',
  textureBlendMode: 'Mode de fusion de la texture avec les calques inférieurs',
  overlayMediaId:   'ID d\'une image décorative placée librement sur le fond',
  overlayOpacity:   'Opacité de l\'image décorative',
  overlayFit:       'Redimensionnement de l\'image décorative',
  overlayX:         'Position horizontale de l\'image décorative en % depuis la gauche',
  overlayY:         'Position verticale de l\'image décorative en % depuis le haut',
  overlayW:         'Largeur de l\'image décorative en % de la carte',
  overlayH:         'Hauteur de l\'image décorative en % de la carte',

  // ── AtomCardPlaceholder ───────────────────────────────────────────────────
  borderWidth:      'Épaisseur du contour en millimètres',
  iconMediaId:      'ID d\'une icône SVG ou image affichée au-dessus du label',
  iconSize:         'Taille de l\'icône en millimètres',

  // ── Communs à plusieurs atomes ─────────────────────────────────────────────
  text:          'Texte affiché. Peut contenir une référence de données, ex : {nom.texte}',
  fontSize:      'Taille du texte en millimètres (ex. 3 → 3 mm sur la carte imprimée)',
  fontWeight:    'Graisse du texte : 400 = normal, 700 = gras, 900 = très gras',
  fontFamily:    'Police de caractères utilisée',
  color:         'Couleur du texte ou du tracé',
  textColor:     'Couleur des chiffres ou des lettres',
  bgColor:       'Couleur de fond de l\'élément',
  textAlign:     'Alignement horizontal du texte : gauche, centré, droite, justifié',
  textTransform: 'Transformation du texte : aucune, tout en majuscules, première lettre en majuscule',
  letterSpacing: 'Espace supplémentaire entre les lettres (mm)',
  lineHeight:    'Interligne : 1.0 = serré, 1.5 = aéré',
  overflow:      'Comportement si le texte dépasse la zone : caché, visible, ou tronqué avec …',
  opacity:       'Transparence : 0 = invisible, 1 = totalement opaque',
  borderRadius:  'Arrondi des coins en millimètres (0 = angles droits)',
  borderWidth:   'Épaisseur de la bordure en millimètres (0 = pas de bordure)',
  borderColor:   'Couleur de la bordure',
  borderStyle:   'Style de la bordure : plein, tirets, pointillés',
  mediaId:       'Identifiant du fichier SVG ou image dans la médiathèque',
  svgContent:    'Code SVG brut à afficher (alternatif à la médiathèque)',
  svgMediaId:    'Identifiant d\'un SVG dans la médiathèque (décoratif)',
  svgPosition:   'Afficher le SVG devant ou derrière le contenu principal',

  // ── AtomTitle ──────────────────────────────────────────────────────────────
  // (text, fontSize, fontWeight, fontFamily, color, textAlign, letterSpacing,
  //  textTransform déjà définis ci-dessus)

  // ── AtomText ───────────────────────────────────────────────────────────────
  // (text, fontSize, fontWeight, fontFamily, color, textAlign, lineHeight,
  //  overflow déjà définis)

  // ── AtomIcon ───────────────────────────────────────────────────────────────
  // (mediaId, svgContent, color, opacity déjà définis)

  // ── AtomPicto ──────────────────────────────────────────────────────────────
  tag:             'Tag Pictorgame pour filtrer la liste des refs dans le panneau propriétés',
  ref:             'Référence stable du picto dans le catalogue (ex. pieces, une-main)',
  view:            'Mode d\'affichage : icône seule, horizontal, vertical, inversé, ou texte seul',

  // ── AtomIconMap / AtomBadge ────────────────────────────────────────────────
  rows:            'Table de correspondance : une ligne par valeur (clé checklist → média ± label)',
  fallbackMediaId: 'Image affichée si aucune ligne ne correspond à la valeur',
  fallbackLabel:   'Texte affiché si aucune ligne ne correspond (atome Badge)',
  showIcon:        'Afficher l\'image / icône associée à la valeur',

  // ── AtomPastille ───────────────────────────────────────────────────────────
  // (text, bgColor, textColor, fontSize, borderRadius, borderWidth, borderColor)

  // ── AtomDice8 / AtomDice12 / iconMap / badge ───────────────────────────────
  value:         'Valeur (dé, ou clé de checklist pour iconMap/badge — souvent bindée)',
  penColor:      'Couleur des traits de plume sur le dé (vide = couleur du texte)',
  penWidth:      'Épaisseur max du fuseau de plume en mm',
  penSeed:       'Graine des variantes de plume (change le motif)',
  penPoolSize:   'Nombre de variantes de trait dans le pool',

  // ── AtomCaracteristique ────────────────────────────────────────────────────
  stat:          'Statistique affichée (FOR, DEX, INI, CHA, MAG, DEV, VIE)',
  modifier:      'Modificateur précédant la stat, ex : +2 ou -1 (laisser vide pour aucun)',
  threshold:     'Seuil après un chevron >, ex : 5 pour afficher "FOR > 5" (laisser vide pour aucun)',

  // ── AtomCardPlaceholder ────────────────────────────────────────────────────
  cardType:      'Type de carte associé à cet emplacement',
  label:         'Texte d\'étiquette affiché dans la zone de réservation',

  // ── AtomResourcePlaceholder ────────────────────────────────────────────────
  resourceType:  'Type de ressource : pieces, essence, pierre, mithril, cristaux, fragment',

  // ── AtomResource ───────────────────────────────────────────────────────────
  iconSize:      'Taille de l\'icône de ressource en millimètres',
  showLabel:     'Afficher ou non le nom de la ressource à côté de l\'icône',

  // ── AtomPrice ──────────────────────────────────────────────────────────────
  resources:     'Coût en ressources, ex : {"pieces":3,"essence":1}',
  layout:        'Disposition des ressources : horizontale, verticale, ou grille',
  gap:           'Espace entre les icônes de ressources (mm)',

  // ── AtomCardType ───────────────────────────────────────────────────────────
  type:          'Type de carte à afficher (equipement, quete, etc.)',
  // showIcon déjà défini plus haut (iconMap/badge/cardType)

  // ── AtomCounter ────────────────────────────────────────────────────────────
  prefix:        'Caractère ou texte affiché avant la valeur, ex : #',

  // ── AtomHexTile ────────────────────────────────────────────────────────────
  // (bgColor, borderColor, borderWidth, text, fontSize, textColor)

  // ── AtomText (auto-size) ──────────────────────────────────────────────────
  autoSize:      'Agrandit automatiquement le texte pour occuper tout l\'espace disponible',
  maxFontSize:   'Taille max en millimètres (avec autoSize)',

  // ── AtomImage ─────────────────────────────────────────────────────────────
  fit:           'Ajustement de l\'image dans son cadre : remplir, contenir, ou étirer',
  fadeTop_mm:    'Fondu transparent depuis le haut (mm). 0 = désactivé',
  fadeBottom_mm: 'Fondu transparent depuis le bas (mm). 0 = désactivé',
  fadeLeft_mm:   'Fondu transparent depuis la gauche (mm). 0 = désactivé',
  fadeRight_mm:  'Fondu transparent depuis la droite (mm). 0 = désactivé',
  aiPrompt:      'Description pour générer l\'image par IA (fonctionnalité future)',
  aiGenerated:   'Indique si l\'image a été générée par IA',

  // ── AtomRectangle ─────────────────────────────────────────────────────────
  // (bgColor, borderColor, borderWidth, borderRadius, opacity)

  // ── AtomLine ──────────────────────────────────────────────────────────────
  thickness:     'Épaisseur de la ligne en millimètres',
  style:         'Style du tracé : plein, tirets, pointillés',

  // ── AtomSeparator / AtomCadre ─────────────────────────────────────────────
  tier:          'Niveau d\'ornementation : fin (à la main), basic, rare, epic, mythique, legendaire',
  seed:          'Graine de variation du tracé (même seed = même rendu)',
  showTitle:     'Afficher le titre sur le bord haut du cadre',
  titleAlign:    'Alignement du titre du cadre : gauche, centre, droite',
  titleColor:    'Couleur du titre du cadre',
  titleBgColor:  'Fond derrière le titre (souvent la couleur de la carte pour masquer le trait)',
  bgOpacity:     'Opacité du fond intérieur du cadre (0–1)',
  cornerShape: 'Forme décorative aux coins : aucune, étoile 4/5 branches, rond, carré, triangle',
  cornerSize:  'Taille des ornements de coin en millimètres',
  cornerTL:    'Afficher l\'ornement en haut à gauche',
  cornerTR:    'Afficher l\'ornement en haut à droite',
  cornerBL:    'Afficher l\'ornement en bas à gauche',
  cornerBR:    'Afficher l\'ornement en bas à droite',

  // ── AtomTrakCorner ────────────────────────────────────────────────────────
  n:             'Numéro affiché dans cette case de coin',
  textRotation:  'Angle de rotation du numéro en degrés (45 = diagonal)',

  // ── AtomTrak / AtomTrakPath / AtomCardTrack ───────────────────────────────
  n_start:       'Premier numéro de la piste (inclus)',
  n_end:         'Dernier numéro de la piste (inclus)',
  reverse:       'Inverser le sens : afficher de n_end vers n_start (début ↔ fin)',
  direction:     'Orientation de la piste : horizontale ou verticale',
  cellSize:      'Taille de base d\'une case en ratio (0–1] de la dimension le long de la piste',
  caps:          'Ajouter des triangles en pointe aux deux extrémités de la piste',
  segments:      'Enchaînement de segments du trakPath : direction (haut/bas/gauche/droite) et nombre de cases',
  textureId:     'Identifiant logique de la texture Track assignée à la case',
  coin:          'Rotation de la texture sur la case : 0, 90, 180 ou 270 degrés',
  textureSource: 'Origine de la texture : choix manuel (user), tirage Mélanger (system), ou aucune (null)',

  // ── AtomCardTrack ─────────────────────────────────────────────────────────
  // n_start et n_end définis ci-dessus avec sens adapté au CardTrack :
  cells_top:     'Nombre de cases sur chaque côté horizontal (haut et bas). Remplace le calcul automatique depuis n_end.',
  cells_left:    'Nombre de cases sur chaque côté vertical (gauche et droite). Remplace le calcul automatique.',
  roundMode:     'Arrondi du nombre de cases : vers le plus proche, vers le bas, ou vers le haut',
  startCorner:   'Coin où commence la numérotation et la piste continue en sens horaire',
  textOrientation: 'Orientation du texte dans les cases : parallèle au bord (défaut) ou perpendiculaire',
  cornerTextMode:  'Angle du texte dans les cases de coin : bisectrice à 45°, parallèle, perpendiculaire, ou personnalisé',
  cornerTextAngle: 'Angle personnalisé pour le texte des coins (en degrés)',
  cellOverrides:   'Surcharges par case : textureId, coin (0/90/180/270), textureSource (user/system/null)',
  thicknessH_mm:   'Épaisseur des pistes haut et bas (en mm depuis le bord vers le centre). Vide = calculé automatiquement.',
  thicknessV_mm:   'Épaisseur des pistes gauche et droite (en mm depuis le bord vers le centre). Vide = calculé automatiquement.',

  // ── AtomRichText ──────────────────────────────────────────────────────────
  bulletIcon:    'Icône des puces (-) : média du catalogue, ou laisser vide pour •',
  checkboxIcon:  'Icône case vide [ ] : média, ou laisser vide pour ☐',
  checkboxIconChecked: 'Icône case cochée [x] : média, ou laisser vide pour ☑',
  diceScale:     'Taille des dés / pictos inline par rapport à la police (multiplicateur)',
  align:         'Alignement par défaut (left/center/right/justify). Surchargeable via /align{…}',
}
