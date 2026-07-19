export function getLinkedVersoId(layout) {
  if (!layout || layout.is_back) return null
  return layout.back_layout_id || null
}

export function findRectoForVerso(versoId, layouts = []) {
  if (!versoId) return null
  return layouts.find((l) => !l.is_back && l.back_layout_id === versoId) || null
}

export function getFacePartnerId(layout, layouts = []) {
  if (!layout) return null
  if (!layout.is_back) return getLinkedVersoId(layout)
  return findRectoForVerso(layout.id, layouts)?.id || null
}

export function resolveOpenLayoutId(rectoLayout, face) {
  if (face === 'verso' && rectoLayout?.back_layout_id) return rectoLayout.back_layout_id
  return rectoLayout.id
}

export function thumbnailForFace(rectoLayout, face, layouts = []) {
  if (face === 'verso' && rectoLayout?.back_layout_id) {
    const v = layouts.find((l) => l.id === rectoLayout.back_layout_id)
    return v?.thumbnail || null
  }
  return rectoLayout?.thumbnail || null
}
