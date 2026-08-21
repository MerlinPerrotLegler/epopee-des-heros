/**
 * Native <select> quirks (Chrome/Safari) :
 * - nested in <label> → a second synthetic click toggles the menu closed
 * - ancestor overflow:auto → focus scrollIntoView closes the menu
 * - OS picker is not in the DOM → click-outside handlers close the parent popover
 */

export function findSelectsNestedInLabels(source) {
  const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/)
  if (!templateMatch) return []
  let html = templateMatch[1].replace(/<!--[\s\S]*?-->/g, '')
  const hits = []
  const labelRe = /<label\b[^>]*>/gi
  let m
  while ((m = labelRe.exec(html))) {
    const openEnd = m.index + m[0].length
    const close = html.indexOf('</label>', openEnd)
    if (close < 0) continue
    const inner = html.slice(openEnd, close)
    if (/<select\b/i.test(inner)) {
      hits.push({ index: m.index, preview: inner.replace(/\s+/g, ' ').trim().slice(0, 80) })
    }
  }
  return hits
}

export function shouldIgnorePopoverOutsideMouseDown({
  target,
  activeElement,
  popoverEl,
  wrapEl,
}) {
  if (!target) return false
  if (wrapEl?.contains(target) || popoverEl?.contains(target)) return true
  if (target.closest?.('select')) return true
  // OS-level <select> menu is not in the DOM; mousedown often hits <html>/<body>
  // while the select in the popover still has focus.
  const tag = target.tagName
  if (
    activeElement?.tagName === 'SELECT'
    && popoverEl?.contains(activeElement)
    && (tag === 'HTML' || tag === 'BODY')
  ) {
    return true
  }
  return false
}

export function focusSelectWithoutScroll(el) {
  if (!el || el.tagName !== 'SELECT' || typeof el.focus !== 'function') return
  el.focus({ preventScroll: true })
}
