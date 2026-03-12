/**
 * Wrapper autour de @imgly/background-removal.
 * Importé en lazy (import dynamique) pour ne pas alourdir le bundle initial.
 * Le modèle ONNX (~40 MB) est téléchargé une seule fois puis mis en cache navigateur.
 */

let _lib = null

async function getLib() {
  if (!_lib) {
    const mod = await import('@imgly/background-removal')
    _lib = mod.removeBackground
  }
  return _lib
}

/**
 * Supprime le fond d'une image et retourne un Blob PNG transparent.
 *
 * @param {string|Blob|File} source  URL ou blob de l'image source
 * @param {object} opts
 * @param {(key:string, current:number, total:number) => void} [opts.onProgress]
 * @returns {Promise<Blob>}  PNG avec fond transparent
 */
export async function removeBg(source, { onProgress } = {}) {
  const removeBackground = await getLib()

  return removeBackground(source, {
    model: 'medium',
    output: {
      format: 'image/png',
      quality: 1,
      type: 'foreground',
    },
    progress: onProgress
      ? (key, current, total) => onProgress(key, current, total)
      : undefined,
  })
}
