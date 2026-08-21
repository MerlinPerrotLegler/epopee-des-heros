export const COMPONENT_DIM_MIN = 1
export const COMPONENT_DIM_MAX = 500

function parseDim(value, label) {
  if (value === undefined || value === null || value === '') {
    return { skip: true }
  }
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < COMPONENT_DIM_MIN || n > COMPONENT_DIM_MAX) {
    return {
      ok: false,
      status: 400,
      error: `${label} doit être un nombre entre ${COMPONENT_DIM_MIN} et ${COMPONENT_DIM_MAX} mm`,
    }
  }
  return { skip: false, value: n }
}

export function normalizeComponentMeta(body = {}) {
  const patch = {}

  if (body.name !== undefined && body.name !== null) {
    const name = String(body.name).trim()
    if (!name) {
      return { ok: false, status: 400, error: 'Le nom est requis' }
    }
    patch.name = name
  }

  const w = parseDim(body.width_mm, 'La largeur')
  if (w.ok === false) return w
  if (!w.skip) patch.width_mm = w.value

  const h = parseDim(body.height_mm, 'La hauteur')
  if (h.ok === false) return h
  if (!h.skip) patch.height_mm = h.value

  return { ok: true, patch }
}
