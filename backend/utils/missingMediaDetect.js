/**
 * Détection TSD-012 : bindings mediaId non résolus + type IA depuis le layout.
 */
import { findImageElement, imageNameFromBindingPath } from '../services/aiGeneration.js'

export function unresolvedMediaBindings(data) {
  return Object.entries(data || {})
    .filter(([path, value]) => path.endsWith('.mediaId') && value)
    .map(([binding_path, media_id_ref]) => ({
      binding_path,
      media_id_ref: String(media_id_ref),
    }))
}

export function mediaTypeForBinding(layers, bindingPath) {
  const el = findImageElement(layers || [], imageNameFromBindingPath(bindingPath))
  return el?.params?.ai_media_type || 'illustration'
}
