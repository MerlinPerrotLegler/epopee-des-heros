export { slugifyTypeCode, PROTECTED_TYPE_CODE } from '../../../backend/utils/typeCode.js'

export const CREATE_TYPE_SENTINEL = '__create__'

export function typeLabel(code, types = []) {
  if (code == null || code === '') return ''
  const found = types.find((t) => t.code === code)
  return found?.label || String(code)
}
