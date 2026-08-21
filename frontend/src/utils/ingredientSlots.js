export const INGREDIENT_SLOT_COUNT = 6
export const INGREDIENTS_FABRICATION_MOLECULE_ID = 'mol-ingredients-fabrication'
/** Identifiant data-binding posé par défaut sur le layout */
export const INGREDIENTS_DEFAULT_NAME_IN_LAYOUT = 'craft'

/** nameInLayout par défaut à la pose d'une molécule connue */
export function defaultMoleculeNameInLayout(moleculeId) {
  if (moleculeId === INGREDIENTS_FABRICATION_MOLECULE_ID) {
    return INGREDIENTS_DEFAULT_NAME_IN_LAYOUT
  }
  return ''
}

export function isBlankBindingValue(v) {
  if (v == null) return true
  const s = String(v).trim()
  return s === ''
}

/** prefix = nameInLayout du composant/molécule sur le layout, ex. "craft" */
export function isIngredientSlotEmpty(data, prefix, n) {
  const key = `${prefix}.ingredient${n}.ref`
  if (!data || typeof data !== 'object') return true
  if (!(key in data)) return true
  return isBlankBindingValue(data[key])
}

/**
 * Noms de groupes à omettre (instance / print) — legacy composant (pas de reflow).
 * diamondN est le losange *avant* la case N.
 */
export function hiddenIngredientGroupNames(data, prefix) {
  const hidden = new Set()
  for (let n = 1; n <= INGREDIENT_SLOT_COUNT; n++) {
    if (isIngredientSlotEmpty(data, prefix, n)) {
      hidden.add(`ingredient${n}`)
      if (n >= 2) hidden.add(`diamond${n}`)
    }
  }
  return hidden
}

/**
 * Positions x (mm) style CSS space-evenly dans un conteneur de largeur `containerW`.
 * space = (containerW − Σ widths) / (N + 1), clampé à ≥ 0.
 * x[i] = space + i × (width[i] + space)
 */
export function spaceEvenlyXs(widths, containerW) {
  const list = Array.isArray(widths) ? widths : []
  const n = list.length
  if (n === 0) return []
  const sum = list.reduce((a, w) => a + (Number(w) || 0), 0)
  const rawSpace = (Number(containerW) || 0) - sum
  const space = Math.max(0, rawSpace / (n + 1))
  const xs = []
  let x = space
  for (let i = 0; i < n; i++) {
    xs.push(x)
    x += (Number(list[i]) || 0) + space
  }
  return xs
}

function cloneEl(el) {
  return {
    ...el,
    params: el.params ? { ...el.params } : el.params,
  }
}

function groupMinX(children) {
  let min = Infinity
  for (const c of children || []) {
    if (c && c.kind === 'element' && typeof c.x_mm === 'number') {
      if (c.x_mm < min) min = c.x_mm
    }
  }
  return Number.isFinite(min) ? min : 0
}

function groupWidth(children) {
  let min = Infinity
  let max = -Infinity
  for (const c of children || []) {
    if (!c || c.kind !== 'element') continue
    const x = Number(c.x_mm) || 0
    const w = Number(c.width_mm) || 0
    if (x < min) min = x
    if (x + w > max) max = x + w
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0
  return Math.max(0, max - min)
}

function translateGroupChildren(children, deltaX) {
  return (children || []).map((c) => {
    if (!c || c.kind !== 'element') return c
    const clone = cloneEl(c)
    clone.x_mm = (Number(c.x_mm) || 0) + deltaX
    return clone
  })
}

function findGroup(layers, name) {
  return (layers || []).find((g) => g && g.kind === 'group' && g.name === name) || null
}

function visibleSlotNumbers(data, prefix, hideEmptySlots) {
  const slots = []
  for (let n = 1; n <= INGREDIENT_SLOT_COUNT; n++) {
    if (!hideEmptySlots || !isIngredientSlotEmpty(data, prefix, n)) {
      slots.push(n)
    }
  }
  return slots
}

/**
 * Flatten + reflow space-evenly pour la molécule Ingrédients de fabrication.
 * Clone les atomes (pas de mutation de la définition persistée).
 * Losanges uniquement entre deux cases visibles consécutives, centrés dans la gouttière.
 */
export function layoutIngredientElements(definition, options = {}) {
  if (!definition || typeof definition !== 'object') return []

  const {
    data = null,
    prefix = '',
    hideEmptySlots = false,
    containerWidthMm = definition.width_mm ?? 56,
  } = options

  const layers = definition.layers
  if (!Array.isArray(layers)) {
    if (Array.isArray(definition.elements)) {
      return definition.elements.filter((el) => el && el.visible !== false).map(cloneEl)
    }
    return []
  }

  const result = []
  const header = findGroup(layers, 'header')
  if (header) {
    for (const child of header.children || []) {
      if (child && child.kind === 'element' && child.visible !== false) {
        result.push(cloneEl(child))
      }
    }
  }

  const visible = visibleSlotNumbers(data, prefix, hideEmptySlots)
  if (visible.length === 0) return result

  const slotGroups = visible.map((n) => findGroup(layers, `ingredient${n}`)).filter(Boolean)
  const widths = slotGroups.map((g) => groupWidth(g.children))
  const xs = spaceEvenlyXs(widths, containerWidthMm)

  for (let i = 0; i < slotGroups.length; i++) {
    const g = slotGroups[i]
    const oldMinX = groupMinX(g.children)
    const deltaX = xs[i] - oldMinX
    const translated = translateGroupChildren(g.children, deltaX)
    for (const child of translated) {
      if (child && child.kind === 'element' && child.visible !== false) {
        result.push(child)
      }
    }

    // Diamond between this visible case and the next
    if (i < slotGroups.length - 1) {
      const nextSlot = visible[i + 1]
      // Prefer diamond for next slot index (legacy naming diamondN = before case N)
      const diamondName = `diamond${nextSlot}`
      let diamond = findGroup(layers, diamondName)
      // Fallback: any diamond between consecutive visible slots
      if (!diamond) {
        for (let d = visible[i] + 1; d <= nextSlot; d++) {
          diamond = findGroup(layers, `diamond${d}`)
          if (diamond) break
        }
      }
      if (diamond) {
        const dChildren = (diamond.children || []).filter(
          (c) => c && c.kind === 'element' && c.visible !== false,
        )
        if (dChildren.length) {
          const dW = groupWidth(dChildren)
          const leftEdge = xs[i] + widths[i]
          const rightEdge = xs[i + 1]
          const gutterMid = (leftEdge + rightEdge) / 2
          const targetX = gutterMid - dW / 2
          const oldDX = groupMinX(dChildren)
          const dDelta = targetX - oldDX
          for (const child of translateGroupChildren(dChildren, dDelta)) {
            result.push(child)
          }
        }
      }
    }
  }

  return result
}
