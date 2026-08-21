export const PROTECTED_TYPE_CODE = 'dos'

export function slugifyTypeCode(input) {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function normalizeNewType({ label, code } = {}) {
  const trimmedLabel = String(label ?? '').trim()
  if (!trimmedLabel) {
    return { ok: false, status: 400, error: 'Le libellé est requis' }
  }
  const rawCode = String(code ?? '').trim()
  const slug = slugifyTypeCode(rawCode || trimmedLabel)
  if (!slug) {
    return { ok: false, status: 400, error: 'Code invalide' }
  }
  return { ok: true, label: trimmedLabel, code: slug }
}

export function assertCanDeleteType(code) {
  if (code === PROTECTED_TYPE_CODE) {
    return { ok: false, status: 409, error: 'Le type dos ne peut pas être supprimé' }
  }
  return { ok: true }
}

export function isUniqueConstraintError(err) {
  const msg = String(err?.message || '')
  return err?.code === 'SQLITE_CONSTRAINT'
    || err?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || msg.includes('UNIQUE constraint failed')
    || msg.includes('Duplicate entry')
}
