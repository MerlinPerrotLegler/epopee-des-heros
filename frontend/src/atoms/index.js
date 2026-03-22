// ============================================
// Atom Type Registry
// Each atom type defines its default params and metadata
// ============================================

// Police imposée pour dés, caractéristiques et ressources (Jim Nightshade)
export const FONT_FAMILY = 'Jim Nightshade'

// ── Constante partagée : les 4 types "fond de carte" ──────────────────────
export const BACKGROUND_ATOM_TYPES = new Set([
  'backgroundTexture',
  'backgroundGradientLinear',
  'backgroundGradientRadial',
  'backgroundImage',
])

export const ATOM_TYPES = {
  // ── Fonds de carte (empilables, toujours sous le contenu) ─────────────────
  backgroundTexture: {
    label: 'Fond — Texture',
    icon: '▨',
    defaultParams: {
      mediaId:   null,
      repeatX:   true,      // CSS repeat horizontal
      repeatY:   true,      // CSS repeat vertical
      scale:     1,         // multiplicateur de taille (1 = 100% largeur)
      blendMode: 'normal',
      opacity:   1,
    },
    defaultSize: { width_mm: 63, height_mm: 88 },
    isBackground: true,
  },

  backgroundGradientLinear: {
    label: 'Fond — Dégradé linéaire',
    icon: '▤',
    defaultParams: {
      angle:   135,
      stops:   [
        { color: '#2a3050', pos: 0 },
        { color: '#6c7aff', pos: 100 },
      ],
      opacity: 1,
    },
    defaultSize: { width_mm: 63, height_mm: 88 },
    isBackground: true,
  },

  backgroundGradientRadial: {
    label: 'Fond — Dégradé radial',
    icon: '◉',
    defaultParams: {
      posX:  50,             // % centre horizontal
      posY:  50,             // % centre vertical
      shape: 'ellipse',      // 'ellipse' | 'circle'
      stops: [
        { color: '#6c7aff', pos: 0 },
        { color: '#2a3050', pos: 100 },
      ],
      opacity: 1,
    },
    defaultSize: { width_mm: 63, height_mm: 88 },
    isBackground: true,
  },

  backgroundImage: {
    label: 'Fond — Image',
    icon: '▧',
    defaultParams: {
      mediaId:   null,
      fit:       'cover',    // 'cover' | 'contain' | 'fill' | 'none'
      posX:      50,         // % position X (CSS background-position)
      posY:      50,         // % position Y
      blendMode: 'normal',
      opacity:   1,
    },
    defaultSize: { width_mm: 63, height_mm: 88 },
    isBackground: true,
  },

  title: {
    label: 'Titre',
    icon: 'T',
    defaultParams: {
      text: 'Titre',
      fontSize: 4, // mm
      fontWeight: 700,
      fontFamily: null,       // null → config globale
      color: null,            // null → config globale
      textAlign: 'center',
      letterSpacing: 0,
      textTransform: 'none', // none | uppercase | capitalize
    },
    defaultSize: { width_mm: 40, height_mm: 6 }
  },

  text: {
    label: 'Texte',
    icon: 'Aa',
    defaultParams: {
      text: 'Lorem ipsum',
      fontSize: 2.5,
      fontWeight: 400,
      fontFamily: null,       // null → config globale
      color: null,            // null → config globale
      textAlign: 'center',
      lineHeight: 1.3,
      overflow: 'hidden', // hidden | visible | ellipsis
      autoSize: true,     // agrandit le texte pour remplir la zone
      maxFontSize: 10,    // taille maximale en mm (autoSize seulement)
    },
    defaultSize: { width_mm: 40, height_mm: 10 }
  },

  icon: {
    label: 'Icône SVG',
    icon: '◆',
    defaultParams: {
      mediaId: null, // reference to media library
      svgContent: '', // inline SVG fallback
      color: null,            // null → config globale
      opacity: 1,
    },
    defaultSize: { width_mm: 6, height_mm: 6 }
  },

  pastille: {
    label: 'Pastille',
    icon: '●',
    defaultParams: {
      text: '',
      bgColor: null,          // null → config globale
      textColor: null,        // null → config globale
      fontSize: 2.5,
      borderRadius: 50, // percentage
      borderWidth: 0,
      borderColor: null,      // null → config globale
    },
    defaultSize: { width_mm: 8, height_mm: 8 }
  },

  die8: {
    label: 'Dé 8',
    icon: 'D8',
    defaultParams: {
      value:       '3',
      textColor:   null,      // null → config globale
      fontSize:    3.5,      // mm — taille du nombre (indépendant de la forme)
      fontFamily:  FONT_FAMILY,
      penColor:    null,     // null → reprend textColor dans le composant
      penWidth:    0.5,      // épaisseur max des fuseaux (mm)
      penSeed:     8,
      penPoolSize: 4,
    },
    defaultSize: { width_mm: 8, height_mm: 8 }
  },

  die12: {
    label: 'Dé 12',
    icon: 'D12',
    defaultParams: {
      value:       '8',
      textColor:   null,      // null → config globale
      fontSize:    3,        // mm — taille du nombre (indépendant de la forme)
      fontFamily:  FONT_FAMILY,
      penColor:    null,
      penWidth:    0.5,
      penSeed:     12,
      penPoolSize: 4,
    },
    defaultSize: { width_mm: 9, height_mm: 9 }
  },

  cardPlaceholder: {
    label: 'Carte placeholder',
    icon: '▭',
    defaultParams: {
      cardType:      'equipement',
      label:         'Carte',
      bgColor:       null,        // null → config globale
      borderColor:   null,        // null → config globale
      borderStyle:   'dashed',
      borderWidth:   0.4,         // mm
      borderRadius:  4,           // px
      textColor:     null,        // null → config globale
      fontSize:      2.5,         // mm
      iconMediaId:   null,        // SVG/image au-dessus du label
      iconSize:      6,           // mm
    },
    defaultSize: { width_mm: 20, height_mm: 28 }
  },

  resourcePlaceholder: {
    label: 'Ressource placeholder',
    icon: '◇',
    defaultParams: {
      resourceType: '', // will be bound
      label: 'Ressource',
      bgColor: null,          // null → config globale
      borderColor: null,      // null → config globale
      borderStyle: 'dashed',
    },
    defaultSize: { width_mm: 8, height_mm: 8 }
  },

  resource: {
    label: 'Ressource',
    icon: '◈',
    defaultParams: {
      resourceType: 'or', // or | essence | pierre | mithril | cristaux | fragment
      value: '',
      iconSize: 4,
      fontSize: 2.5,
      fontFamily: FONT_FAMILY,
      color: null,            // null → config globale
      showLabel: false,
    },
    defaultSize: { width_mm: 12, height_mm: 6 }
  },

  price: {
    label: 'Prix',
    icon: '$',
    defaultParams: {
      resources: {}, // { or: 5, essence: 1 } - will be bound
      layout: 'horizontal', // horizontal | vertical | grid
      iconSize: 4,
      fontSize: 2.5,
      gap: 1,
    },
    defaultSize: { width_mm: 30, height_mm: 6 }
  },

  cardType: {
    label: 'Type de carte',
    icon: '⚑',
    defaultParams: {
      type: '', // bound to card_type
      showIcon: true,
      showLabel: true,
      fontSize: 2,
      color: null,            // null → config globale
      bgColor: null,          // null → config globale
    },
    defaultSize: { width_mm: 20, height_mm: 5 }
  },

  counter: {
    label: 'Compteur',
    icon: '#',
    defaultParams: {
      prefix: '#',
      value: '',
      fontSize: 2,
      fontFamily: null,       // null → config globale
      color: null,            // null → config globale
    },
    defaultSize: { width_mm: 15, height_mm: 4 }
  },

  hexTile: {
    label: 'Tuile hexagonale',
    icon: '⬡',
    defaultParams: {
      bgColor: null,          // null → config globale
      borderColor: null,      // null → config globale
      borderWidth: 0.3,
      text: '',
      fontSize: 2.5,
      textColor: null,        // null → config globale
    },
    defaultSize: { width_mm: 10, height_mm: 11.5 }
  },

  image: {
    label: 'Image',
    icon: '🖼',
    defaultParams: {
      mediaId: null,   // media library reference
      fit: 'cover',    // cover | contain | fill | none
      posX: 50,        // % objectPosition X (recadrage horizontal, utilisé quand fit=cover)
      posY: 50,        // % objectPosition Y (recadrage vertical, utilisé quand fit=cover)
      opacity: 1,
      borderRadius: 0,
      // IA — génération (TSD-012)
      ai_media_type: 'illustration',  // illustration | icone | fond | autre
      ai_prompt_template: '',         // template avec variables {{binding_path}}
    },
    defaultSize: { width_mm: 30, height_mm: 30 }
  },

  rectangle: {
    label: 'Rectangle',
    icon: '▬',
    defaultParams: {
      bgColor: null,          // null → config globale
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      opacity: 1,
    },
    defaultSize: { width_mm: 20, height_mm: 10 }
  },

  line: {
    label: 'Ligne',
    icon: '─',
    defaultParams: {
      color: null,            // null → config globale
      thickness: 0.3,
      style: 'solid', // solid | dashed | dotted
    },
    defaultSize: { width_mm: 40, height_mm: 0.3 }
  },

  trakCorner: {
    label: 'Trak Corner',
    icon: '◇',
    defaultParams: {
      n:           0,
      bgColor:     null,      // null → config globale
      textColor:   null,      // null → config globale
      fontSize:    2.5,
      borderColor: null,      // null → config globale
      borderWidth: 0.2,
      svgMediaId:  null,     // SVG décoratif optionnel
      textRotation: 45,      // rotation du chiffre en degrés
    },
    defaultSize: { width_mm: 5, height_mm: 5 }
  },

  trak: {
    label: 'Trak',
    icon: '▤',
    defaultParams: {
      n_start:     0,
      n_end:       10,
      direction:   'horizontal', // 'horizontal' | 'vertical'
      cellSize_mm: 5,
      bgColor:     null,      // null → config globale
      textColor:   null,      // null → config globale
      fontSize:    2.5,
      fontFamily:  null,
      borderColor: null,      // null → config globale
      borderWidth: 0.2,
      caps:        false, // triangles rectangles aux extrémités
    },
    defaultSize: { width_mm: 55, height_mm: 5 }
  },

  cardTrack: {
    label: 'CardTrack (4 bords)',
    icon: '⊞',
    defaultParams: {
      // ── Distribution des cases ──────────────────────────────────────
      n_end:        50,           // dernier numéro affiché (ex-max)
      cells_top:    null,         // override : cases sur chaque côté horizontal
      cells_left:   null,         // override : cases sur chaque côté vertical
      roundMode:    'round',      // 'round'|'floor'|'ceil' (arrondi de la distribution)
      // ── Épaisseur explicite des pistes ────────────────────────────
      thicknessH_mm: null,        // épaisseur pistes haut/bas (null = auto)
      thicknessV_mm: null,        // épaisseur pistes gauche/droite (null = auto)
      // ── Numérotation ──────────────────────────────────────────────
      n_start:      0,
      startCorner:  'topLeft',    // 'topLeft'|'topRight'|'bottomRight'|'bottomLeft'
      // ── Orientation du texte ───────────────────────────────────────
      textOrientation:  'parallel',   // 'parallel'|'perpendicular'
      cornerTextMode:   'bisect',     // 'bisect'|'parallel'|'perpendicular'|'custom'
      cornerTextAngle:  45,           // utilisé quand cornerTextMode === 'custom'
      // ── Apparence globale ─────────────────────────────────────────
      bgColor:      'transparent',
      textColor:    null,         // null → config globale
      fontSize:     2.5,
      fontFamily:   null,
      borderColor:  null,         // null → config globale
      borderWidth:  0.2,
      svgMediaId:   null,         // SVG décoratif dans tous les coins
      // ── Surcharges par case ────────────────────────────────────────
      cellOverrides: {},          // { [idx]: { bgColor?, svgMediaId? } }
      // ── Traits de plume entre cases ───────────────────────────────
      penStyle:    true,          // true = fuseaux SVG à la plume (remplace les bordures rect)
      penSeedH:    1,             // seed des variantes — séparateurs bords haut/bas
      penSeedV:    2,             // seed des variantes — séparateurs bords gauche/droite
      penPoolSize: 4,             // nombre de variantes dans chaque pool (min 1)
      penColor:    null,          // null → utilise borderColor
      penWidth:    0.4,           // épaisseur max du fuseau en mm (half-width = penWidth/2)
    },
    defaultSize: { width_mm: 63, height_mm: 88 }
  },

  separator: {
    label: 'Séparateur',
    icon: '—',
    defaultParams: {
      tier:      'basic',       // 'basic' | 'rare' | 'epic' | 'mythique' | 'legendaire'
      color:     null,          // null → config globale
      seed:      42,            // seed pour la variation déterministe
      direction: 'horizontal',  // 'horizontal' | 'vertical'
    },
    defaultSize: { width_mm: 40, height_mm: 2 }
  },

  richText: {
    label: 'Texte riche',
    icon: '✦',
    defaultParams: {
      content:    '',         // source — markdown + /D8{N} /D12{N} /R{type,amt} /FOR{mod} /SVG{name} $$fml$$
      fontFamily: null,
      fontSize:   3.5,        // mm
      color:      null,       // null → config globale
      align:      'left',     // left | center | right
      lineHeight: 1.5,
      diceScale:  1.4,        // multiplicateur taille dé vs fontSize (em)
      padding:    0,          // mm
    },
    defaultSize: { width_mm: 50, height_mm: 20 }
  },

  drawing: {
    label: 'Dessin calligraphique',
    icon: '✒',
    defaultParams: {
      strokes: [],        // [{d, color, opacity, penIdx}]
      activePenIdx: 0,
      moveLocked: false,  // true = déplacement désactivé (icône cadenas en haut à droite)
      pens: [
        { name: 'Sergent-major', color: '#2a1a0a', opacity: 1.0,  nibWidth: 1.5, nibAngle: 45, pressureScale: 0.6, smoothing: 0.5 },
        { name: 'Plume fine',    color: '#2a1a0a', opacity: 0.85, nibWidth: 0.5, nibAngle: 0,  pressureScale: 0.3, smoothing: 0.7 },
        { name: 'Pinceau large', color: '#2a1a0a', opacity: 0.75, nibWidth: 3.0, nibAngle: 30, pressureScale: 0.8, smoothing: 0.4 },
        { name: 'Plume 4',       color: '#2a1a0a', opacity: 0.9,  nibWidth: 1.0, nibAngle: 20, pressureScale: 0.5, smoothing: 0.6 },
        { name: 'Plume 5',       color: '#2a1a0a', opacity: 0.8,  nibWidth: 2.0, nibAngle: 60, pressureScale: 0.7, smoothing: 0.45 },
      ],
    },
    defaultSize: { width_mm: 40, height_mm: 30 }
  },

  caracteristique: {
    label: 'Caractéristique',
    icon: '△',
    defaultParams: {
      stat: 'FOR',          // FOR | DEX | INI | CHA | MAG | DEV | VIE
      modifier: '',         // optional prefix: '+2' | '-1' | ''
      threshold: '',        // optional number after '>' : '5' | ''
      svgMediaId: null,     // media ID of SVG overlay (null = none)
      svgPosition: 'front', // 'front' | 'behind'
      textColor: null,      // null → config globale
      fontSize: 3,
      fontFamily: FONT_FAMILY,
      fontWeight: 700,
    },
    // Même hauteur par défaut que l’atome « Texte » (bloc une ligne)
    defaultSize: { width_mm: 12, height_mm: 10 }
  },
}

// Stat types with fixed colors (triangle color)
export const STAT_TYPES = {
  FOR: { label: 'Force',      color: '#ef4444' },
  DEX: { label: 'Dextérité', color: '#22c55e' },
  INI: { label: 'Initiative', color: '#14b8a6' },
  CHA: { label: 'Charisme',  color: '#ec4899' },
  MAG: { label: 'Magie',     color: '#a855f7' },
  DEV: { label: 'Déviation', color: '#f97316' },
  VIE: { label: 'Vie',       color: '#dc2626' },
  DEF: { label: 'Défense',   color: '#64748b' },
}

// Resource types with colors and icons
export const RESOURCE_TYPES = {
  or: { label: 'Or', color: '#fbbf24', icon: '●' },
  essence: { label: 'Essence de monstre', color: '#a855f7', icon: '◆' },
  pierre: { label: 'Pierre précieuse', color: '#38bdf8', icon: '◇' },
  mithril: { label: 'Mithril', color: '#94a3b8', icon: '⬡' },
  cristaux: { label: 'Cristaux élémentaire', color: '#4ade80', icon: '✦' },
  fragment: { label: 'Fragment céleste', color: '#f472b6', icon: '★' },
}

// Equipment slot colors
export const EQUIPMENT_COLORS = {
  principal: { label: 'Arme principale', color: '#ef4444' },
  secondaire: { label: 'Arme secondaire', color: '#3b82f6' },
  couvrechef: { label: 'Couvre-chef', color: '#ec4899' },
  tenue: { label: 'Armure/Tenue', color: '#22c55e' },
  bijoux: { label: 'Bijoux', color: '#eab308' },
  chausse: { label: 'Chausse', color: '#a16207' },
  deuxmains: { label: 'Deux mains', color: '#8b5cf6' },
}

export function getAtomDefaults(atomType) {
  const def = ATOM_TYPES[atomType]
  if (!def) return null
  return {
    type: 'atom',
    atomType,
    params: JSON.parse(JSON.stringify(def.defaultParams)),
    ...def.defaultSize
  }
}
