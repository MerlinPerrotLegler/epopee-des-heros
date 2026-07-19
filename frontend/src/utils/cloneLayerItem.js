function newId() {
  return crypto.randomUUID()
}

function offsetElement(node, offsetMm) {
  if (typeof node.x_mm === 'number') node.x_mm += offsetMm
  if (typeof node.y_mm === 'number') node.y_mm += offsetMm
  if (node.nameInLayout) node.nameInLayout = `${node.nameInLayout}_copy`
}

/**
 * Deep-clone a layer tree node (element or group), assigning new UUIDs.
 * Element nodes (and nested elements) are offset by `offsetMm` (default 2).
 *
 * @param {object} item
 * @param {{ offsetMm?: number }} [opts]
 * @returns {object}
 */
export function cloneLayerItem(item, opts = {}) {
  const offsetMm = opts.offsetMm ?? 2
  const clone = JSON.parse(JSON.stringify(item))

  function walk(node) {
    node.id = newId()
    if (node.kind === 'group') {
      for (const child of node.children || []) walk(child)
    } else {
      offsetElement(node, offsetMm)
    }
  }

  walk(clone)
  return clone
}
