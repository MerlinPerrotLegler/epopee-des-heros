/**
 * Seed idempotent du composant « Ingrédients de fabrication » (TSD-027).
 * INSERT si l'id est absent — jamais d'UPDATE de definition.
 */

export const INGREDIENTS_FABRICATION_ID = 'cmp-ingredients-fabrication'

const CASE_X = [0.5, 9.9, 19.3, 28.7, 38.1, 47.5]
const DIAMOND_X = [8.0, 17.4, 26.8, 36.2, 45.6]
const ROW_Y = 11
const CASE_W = 7.2
const CASE_H = 16
const DIAMOND_SIZE = 1.6
const DIAMOND_Y = 18.2
const INSET = 0.6

function atomEl(id, atomType, { x, y, w, h, nameInLayout = '', params = {} }) {
  return {
    id,
    kind: 'element',
    type: 'atom',
    atomType,
    name: nameInLayout || '',
    nameInLayout,
    locked: false,
    visible: true,
    opacity: 1,
    x_mm: x,
    y_mm: y,
    width_mm: w,
    height_mm: h,
    rotation: 0,
    params,
  }
}

function group(id, name, children) {
  return {
    id,
    kind: 'group',
    name,
    locked: false,
    visible: true,
    opacity: 1,
    children,
  }
}

const PICTO_BASE = {
  tag: '',
  ref: '',
  view: 'icon',
  iconSize: 6,
  gap: 1,
  fit: 'contain',
  fontSize: 2.8,
  fontFamily: null,
  fontWeight: 400,
  color: null,
  textAlign: 'left',
  opacity: 1,
}

const TEXT_BASE = {
  text: '',
  fontSize: 2.8,
  fontWeight: 400,
  fontFamily: null,
  color: null,
  textAlign: 'center',
  lineHeight: 1.3,
  overflow: 'hidden',
  autoSize: false,
  maxFontSize: 12,
  fontStyle: 'normal',
}

const CADRE_PARAMS = {
  strokeColor: '#1a1a1a',
  strokeWidth: 0.2,
  cornerCut: 1.2,
  fill: 'transparent',
  opacity: 1,
}

const LOSANGE_PARAMS = {
  color: '#1a1a1a',
  strokeWidth: 0.2,
  fill: 'transparent',
  opacity: 1,
}

export function buildIngredientsFabricationDefinition() {
  const header = group('ing-header', 'header', [
    atomEl('ing-header-icon', 'picto', {
      x: 0.5, y: 0.5, w: 6, h: 6,
      nameInLayout: 'headerIcon',
      params: { ...PICTO_BASE },
    }),
    atomEl('ing-header-title', 'title', {
      x: 7.5, y: 0.3, w: 47.5, h: 4.5,
      nameInLayout: 'title',
      params: {
        text: 'INGRÉDIENTS DE FABRICATION',
        fontSize: 3.2,
        fontWeight: 700,
        fontFamily: 'serif',
        color: '#7a1f1f',
        textAlign: 'left',
        letterSpacing: 0,
        textTransform: 'uppercase',
      },
    }),
    atomEl('ing-header-subtitle', 'text', {
      x: 7.5, y: 5, w: 47.5, h: 5,
      nameInLayout: 'subtitle',
      params: {
        ...TEXT_BASE,
        text: 'Cette arme peut être fabriquée en utilisant au moins 2 de ces éléments.',
        fontSize: 2.2,
        fontFamily: 'serif',
        color: '#5a3030',
        textAlign: 'left',
        fontStyle: 'italic',
      },
    }),
  ])

  const layers = [header]

  for (let n = 1; n <= 6; n++) {
    const x = CASE_X[n - 1]
    if (n >= 2) {
      layers.push(group(`ing-diamond${n}`, `diamond${n}`, [
        atomEl(`ing-diamond${n}-shape`, 'losange', {
          x: DIAMOND_X[n - 2],
          y: DIAMOND_Y,
          w: DIAMOND_SIZE,
          h: DIAMOND_SIZE,
          params: { ...LOSANGE_PARAMS },
        }),
      ]))
    }
    layers.push(group(`ing-slot${n}`, `ingredient${n}`, [
      atomEl(`ing-slot${n}-cadre`, 'cadreChanfrein', {
        x, y: ROW_Y, w: CASE_W, h: CASE_H,
        params: { ...CADRE_PARAMS },
      }),
      atomEl(`ing-slot${n}-picto`, 'picto', {
        x: x + INSET,
        y: ROW_Y + INSET,
        w: CASE_W - 2 * INSET,
        h: 10,
        nameInLayout: `ingredient${n}`,
        params: { ...PICTO_BASE, iconSize: 10 },
      }),
      atomEl(`ing-slot${n}-qty`, 'text', {
        x: x + INSET,
        y: ROW_Y + CASE_H - 4.5,
        w: CASE_W - 2 * INSET,
        h: 4.5,
        nameInLayout: `ingredient${n}q`,
        params: {
          ...TEXT_BASE,
          fontSize: 2.4,
          fontWeight: 700,
          textAlign: 'center',
        },
      }),
    ]))
  }

  return { layers, dataSchema: {} }
}

export const INGREDIENTS_FABRICATION_MOLECULE_ID = 'mol-ingredients-fabrication'

const BLOCK_NAME = 'Ingrédients de fabrication'
const BLOCK_DESC = 'Bloc picto + quantité (6 cases) pour cartes d\'équipement'

export async function seedIngredientsFabrication(db) {
  if (!db) return
  const existing = await db.prepare(
    'SELECT id FROM components WHERE id = ?',
  ).get(INGREDIENTS_FABRICATION_ID)
  if (existing) return

  await db.prepare(
    'INSERT INTO components (id, name, description, width_mm, height_mm, definition) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    INGREDIENTS_FABRICATION_ID,
    BLOCK_NAME,
    BLOCK_DESC,
    56,
    28,
    JSON.stringify(buildIngredientsFabricationDefinition()),
  )
}

export async function seedIngredientsFabricationMolecule(db) {
  if (!db) return
  const existing = await db.prepare(
    'SELECT id FROM molecules WHERE id = ?',
  ).get(INGREDIENTS_FABRICATION_MOLECULE_ID)
  if (existing) return

  const definition = {
    width_mm: 56,
    height_mm: 28,
    ...buildIngredientsFabricationDefinition(),
  }
  await db.prepare(
    'INSERT INTO molecules (id, name, description, definition) VALUES (?, ?, ?, ?)',
  ).run(
    INGREDIENTS_FABRICATION_MOLECULE_ID,
    BLOCK_NAME,
    BLOCK_DESC,
    JSON.stringify(definition),
  )
}
