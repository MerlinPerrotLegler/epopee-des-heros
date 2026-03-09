// ============================================
// Atom Type Registry
// Each atom type defines its default params and metadata
// ============================================

export const ATOM_TYPES = {
  title: {
    label: 'Titre',
    icon: 'T',
    defaultParams: {
      text: 'Titre',
      fontSize: 4, // mm
      fontWeight: 700,
      fontFamily: 'Outfit',
      color: '#000000',
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
      fontFamily: 'Outfit',
      color: '#333333',
      textAlign: 'left',
      lineHeight: 1.3,
      overflow: 'hidden', // hidden | visible | ellipsis
    },
    defaultSize: { width_mm: 40, height_mm: 10 }
  },

  icon: {
    label: 'Icône SVG',
    icon: '◆',
    defaultParams: {
      mediaId: null, // reference to media library
      svgContent: '', // inline SVG fallback
      color: '#000000',
      opacity: 1,
    },
    defaultSize: { width_mm: 6, height_mm: 6 }
  },

  pastille: {
    label: 'Pastille',
    icon: '●',
    defaultParams: {
      text: '',
      bgColor: '#6c7aff',
      textColor: '#ffffff',
      fontSize: 2.5,
      borderRadius: 50, // percentage
      borderWidth: 0,
      borderColor: '#000000',
    },
    defaultSize: { width_mm: 8, height_mm: 8 }
  },

  die8: {
    label: 'Dé 8',
    icon: 'D8',
    defaultParams: {
      value: '3',
      textColor: '#ffffff',
      fontSize: 3.5,
    },
    defaultSize: { width_mm: 8, height_mm: 7 }
  },

  die12: {
    label: 'Dé 12',
    icon: 'D12',
    defaultParams: {
      value: '8',
      textColor: '#ffffff',
      fontSize: 3,
    },
    defaultSize: { width_mm: 9, height_mm: 9 }
  },

  cardPlaceholder: {
    label: 'Carte placeholder',
    icon: '▭',
    defaultParams: {
      cardType: 'equipement', // card_type enum
      label: 'Carte',
      bgColor: 'rgba(108, 122, 255, 0.1)',
      borderColor: '#6c7aff',
      borderStyle: 'dashed',
    },
    defaultSize: { width_mm: 20, height_mm: 28 }
  },

  resourcePlaceholder: {
    label: 'Ressource placeholder',
    icon: '◇',
    defaultParams: {
      resourceType: '', // will be bound
      label: 'Ressource',
      bgColor: 'rgba(255, 107, 107, 0.1)',
      borderColor: '#ff6b6b',
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
      color: '#000000',
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
      color: '#ffffff',
      bgColor: '#6c7aff',
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
      fontFamily: 'JetBrains Mono',
      color: '#666666',
    },
    defaultSize: { width_mm: 15, height_mm: 4 }
  },

  hexTile: {
    label: 'Tuile hexagonale',
    icon: '⬡',
    defaultParams: {
      bgColor: '#2a3050',
      borderColor: '#6c7aff',
      borderWidth: 0.3,
      text: '',
      fontSize: 2.5,
      textColor: '#ffffff',
    },
    defaultSize: { width_mm: 10, height_mm: 11.5 }
  },

  image: {
    label: 'Image',
    icon: '🖼',
    defaultParams: {
      mediaId: null, // media library reference
      fit: 'cover', // cover | contain | fill
      opacity: 1,
      borderRadius: 0,
      // AI placeholder fields (V2)
      aiPrompt: '',
      aiGenerated: false,
    },
    defaultSize: { width_mm: 30, height_mm: 30 }
  },

  rectangle: {
    label: 'Rectangle',
    icon: '▬',
    defaultParams: {
      bgColor: '#2a3050',
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
      color: '#363d5c',
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
      bgColor:     '#2a3050',
      textColor:   '#ffffff',
      fontSize:    2.5,
      borderColor: '#6c7aff',
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
      bgColor:     '#2a3050',
      textColor:   '#ffffff',
      fontSize:    2.5,
      borderColor: '#6c7aff',
      borderWidth: 0.2,
      caps:        false, // triangles rectangles aux extrémités
    },
    defaultSize: { width_mm: 55, height_mm: 5 }
  },

  cardTrack: {
    label: 'CardTrack (4 bords)',
    icon: '⊞',
    defaultParams: {
      max:         50,           // cases droites totales (hors 4 coins)
      n_start:     0,            // premier numéro
      startCorner: 'topLeft',    // 'topLeft'|'topRight'|'bottomRight'|'bottomLeft'
      bgColor:     '#2a3050',
      textColor:   '#ffffff',
      fontSize:    2.5,
      borderColor: '#6c7aff',
      borderWidth: 0.2,
      svgMediaId:  null,         // SVG décoratif dans les coins (optionnel)
    },
    defaultSize: { width_mm: 63, height_mm: 88 }
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
      textColor: '#ffffff',
      fontSize: 3,
    },
    defaultSize: { width_mm: 12, height_mm: 11 }
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
