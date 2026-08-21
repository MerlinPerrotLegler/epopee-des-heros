export const INGREDIENT_SLOT_COUNT = 6

export function isBlankBindingValue(v) {
  if (v == null) return true
  const s = String(v).trim()
  return s === ''
}

/** prefix = nameInLayout du composant sur le layout, ex. "craft" */
export function isIngredientSlotEmpty(data, prefix, n) {
  const key = `${prefix}.ingredient${n}.ref`
  if (!data || typeof data !== 'object') return true
  if (!(key in data)) return true
  return isBlankBindingValue(data[key])
}

/**
 * Noms de groupes à omettre (instance / print).
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
