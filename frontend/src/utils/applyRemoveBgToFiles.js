import { removeBg as defaultRemoveBg } from './removeBackground.js'

function baseName(name) {
  return String(name || 'image').replace(/\.[^.]+$/, '') || 'image'
}

/**
 * @param {File[]|FileList|Iterable<File>} files
 * @param {{ enabled?: boolean, onProgress?: Function, removeBgFn?: Function }} [opts]
 * @returns {Promise<File[]>}
 */
export async function applyRemoveBgToFiles(files, opts = {}) {
  const list = Array.from(files || [])
  const { enabled = false, onProgress, removeBgFn } = opts
  if (!enabled) return list

  const rembg = removeBgFn || defaultRemoveBg
  const out = []
  for (const file of list) {
    if (!file?.type?.startsWith('image/')) {
      out.push(file)
      continue
    }
    const blob = await rembg(file, { onProgress })
    out.push(new File([blob], `${baseName(file.name)}.png`, { type: 'image/png' }))
  }
  return out
}
