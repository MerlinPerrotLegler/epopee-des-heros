/**
 * richTextParser.js — TSD-026
 * Blocs : # titres, - / 1. listes, [ ]/[x], >, =>
 * Shortcodes de bloc (ligne seule) : /align{…} /separator{tier,hauteur}
 * Shortcodes inline : /d8 /d12 /svg /data $<…> /STAT /picto /ref{view?}
 * Arguments : () ou {} interchangeables
 */

export const STAT_CODES = ['FOR', 'DEX', 'INI', 'CHA', 'MAG', 'DEV', 'VIE', 'DEF']
export const PICTO_VIEWS = ['icon', 'label', 'both']
export const ALIGN_VALUES = ['left', 'right', 'center', 'justify']
export const SEPARATOR_TIERS = ['fin', 'basic', 'rare', 'epic', 'mythique', 'legendaire']

const STAT_SET = new Set(STAT_CODES)
const ALIGN_SET = new Set(ALIGN_VALUES)
const TIER_SET = new Set(SEPARATOR_TIERS)

// ── Markdown inline → HTML ────────────────────────────────────────────────────
export function markdownToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

// ── FML → KaTeX ───────────────────────────────────────────────────────────────
const FML_PASSES = 6

export function parseFML(expr) {
  let r = expr
    .replace(/\btimes\b/g, '\\times')
    .replace(/\bdiv\b/g, '\\div')
    .replace(/\bgeq\b/g, '\\geq')
    .replace(/\bleq\b/g, '\\leq')
    .replace(/\bneq\b/g, '\\neq')
    .replace(/\binf\b/g, '\\infty')
    .replace(/\bpm\b/g, '\\pm')

  const fn1 = (name) => new RegExp(`${name}\\(([^()]*)\\)`, 'g')
  const fn2 = (name) => new RegExp(`${name}\\(([^()]*),([^()]*)\\)`, 'g')
  const fn3 = (name) => new RegExp(`${name}\\(([^()]*),([^()]*),([^()]*)\\)`, 'g')

  for (let pass = 0; pass < FML_PASSES; pass++) {
    const prev = r
    r = r
      .replace(fn2('frac'), (_, a, b) => `\\frac{${a.trim()}}{${b.trim()}}`)
      .replace(fn2('pow'), (_, x, n) => `{${x.trim()}}^{${n.trim()}}`)
      .replace(fn2('sub'), (_, x, i) => `{${x.trim()}}_{${i.trim()}}`)
      .replace(fn2('max'), (_, a, b) => `\\max(${a.trim()},\\,${b.trim()})`)
      .replace(fn2('min'), (_, a, b) => `\\min(${a.trim()},\\,${b.trim()})`)
      .replace(fn3('sum'), (_, from, to, f) => `\\sum_{${from.trim()}}^{${to.trim()}}${f.trim()}`)
      .replace(fn3('int'), (_, a, b, f) => `\\int_{${a.trim()}}^{${b.trim()}}${f.trim()}`)
      .replace(fn1('sqrt'), (_, x) => `\\sqrt{${x.trim()}}`)
      .replace(fn1('floor'), (_, x) => `\\lfloor ${x.trim()} \\rfloor`)
      .replace(fn1('ceil'), (_, x) => `\\lceil ${x.trim()} \\rceil`)
      .replace(fn1('abs'), (_, x) => `\\left|${x.trim()}\\right|`)
      .replace(fn1('neg'), (_, x) => `-{${x.trim()}}`)
    if (r === prev) break
  }
  return r
}

/** Split args by commas not inside nested brackets (simple top-level split). */
export function splitArgs(inner) {
  if (!inner || !inner.trim()) return []
  return inner.split(',').map((s) => s.trim())
}

/**
 * If s starts with /name or /name{…} or /name(…), return match info.
 * Also handles $<name>.
 */
function matchAt(s, i) {
  if (s.startsWith('$$$', i)) {
    const end = s.indexOf('$$$', i + 3)
    if (end !== -1) {
      return { end: end + 3, token: { type: 'math', expr: s.slice(i + 3, end).trim(), block: true } }
    }
  }
  if (s.startsWith('$$', i) && !s.startsWith('$$$', i)) {
    const end = s.indexOf('$$', i + 2)
    if (end !== -1) {
      return { end: end + 2, token: { type: 'math', expr: s.slice(i + 2, end).trim(), block: false } }
    }
  }
  if (s.startsWith('=>', i)) {
    return { end: i + 2, token: { type: 'arrow' } }
  }
  if (s.startsWith('$<', i)) {
    const end = s.indexOf('>', i + 2)
    if (end !== -1) {
      return { end: end + 1, token: { type: 'data', name: s.slice(i + 2, end).trim() } }
    }
  }
  if (s[i] !== '/') return null

  const nameMatch = s.slice(i + 1).match(/^([a-zA-Z0-9_-]+)/)
  if (!nameMatch) return null
  const name = nameMatch[1]
  let j = i + 1 + name.length
  let argsInner = null
  if (s[j] === '{' || s[j] === '(') {
    const open = s[j]
    const close = open === '{' ? '}' : ')'
    const closeIdx = s.indexOf(close, j + 1)
    if (closeIdx === -1) return null
    argsInner = s.slice(j + 1, closeIdx)
    j = closeIdx + 1
  }
  const args = argsInner != null ? splitArgs(argsInner) : []
  const token = shortcodeToToken(name, args, argsInner)
  if (!token) return null
  return { end: j, token }
}

/**
 * Shortcodes réservés au niveau bloc (ligne entière).
 * Retourne null si la ligne n'en est pas un.
 */
export function parseBlockShortcodeLine(trimmed) {
  const m = String(trimmed || '').match(/^\/([a-zA-Z0-9_-]+)(?:\{([^}]*)\}|\(([^)]*)\))?$/)
  if (!m) return null
  const name = m[1]
  const inner = m[2] != null ? m[2] : m[3]
  const args = inner != null ? splitArgs(inner) : []

  if (name === 'align') {
    const raw = (args[0] || 'left').toLowerCase()
    return { type: 'align', align: ALIGN_SET.has(raw) ? raw : 'left' }
  }

  if (name === 'separator') {
    let tier = args[0] || 'basic'
    if (!TIER_SET.has(tier)) tier = 'basic'
    let height_mm = parseFloat(args[1])
    if (!Number.isFinite(height_mm) || height_mm <= 0) height_mm = 2
    return { type: 'separator', tier, height_mm }
  }

  return null
}

function shortcodeToToken(name, args, rawInner) {
  // Réservés bloc — ne pas interpréter comme picto si collés inline
  if (name === 'align' || name === 'separator') return null

  // Dés : uniquement /d8 /d12 en minuscules (pas /D8 legacy)
  if (name === 'd8' || name === 'd12') {
    const sides = name === 'd12' ? 12 : 8
    let v
    if (rawInner == null) v = `D${sides}`
    else if (rawInner.trim() === '') v = '?'
    else v = args[0] || '?'
    return { type: 'die', sides, value: v }
  }

  if (name === 'svg') {
    if (!args.length) return { type: 'svg', name: '', color: null }
    const file = args[0]
    const color = args[1] || null
    return { type: 'svg', name: file, color }
  }

  if (name === 'data') {
    return { type: 'data', name: args[0] || '' }
  }

  if (name === 'picto') {
    if (args.length < 3) {
      return { type: 'pictoByTag', tag: args[0] || '', ref: args[1] || '', view: args[2] || 'icon', invalid: true }
    }
    const view = PICTO_VIEWS.includes(args[2]) ? args[2] : 'icon'
    return { type: 'pictoByTag', tag: args[0], ref: args[1], view, invalid: false }
  }

  if (STAT_SET.has(name)) {
    return { type: 'stat', stat: name, modifier: args[0] || '' }
  }

  // Generic picto ref: /ref or /ref{view}
  let view = 'icon'
  if (args.length >= 1 && PICTO_VIEWS.includes(args[0])) view = args[0]
  return { type: 'picto', ref: name, view }
}

/** Inline tokenize a single line / paragraph (no block structure). */
export function tokenizeInline(text) {
  if (!text) return []
  const tokens = []
  let i = 0
  let buf = ''

  const flush = () => {
    if (!buf) return
    tokens.push({ type: 'html', html: markdownToHtml(buf) })
    buf = ''
  }

  while (i < text.length) {
    const m = matchAt(text, i)
    if (m) {
      flush()
      tokens.push(m.token)
      i = m.end
    } else {
      buf += text[i]
      i++
    }
  }
  flush()
  return tokens
}

function parseListItemBody(line, markerRe) {
  const m = line.match(markerRe)
  if (!m) return null
  return line.slice(m[0].length)
}

function withAlign(token, align) {
  if (!align) return token
  return { ...token, align }
}

/**
 * Full document tokenize → block + inline tokens.
 * `/align{…}` (ligne seule) fixe l'alignement des blocs suivants.
 * `/separator{tier,hauteur}` (ligne seule) → séparateur calligraphique.
 */
export function tokenize(content) {
  if (!content) return []
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  /** @type {string|null} */
  let currentAlign = null

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // blank
    if (trimmed === '') {
      out.push(withAlign({ type: 'html', html: '<br>' }, currentAlign))
      i++
      continue
    }

    // block shortcodes (ligne entière)
    const blockSc = parseBlockShortcodeLine(trimmed)
    if (blockSc?.type === 'align') {
      currentAlign = blockSc.align
      i++
      continue
    }
    if (blockSc?.type === 'separator') {
      out.push(withAlign(blockSc, currentAlign))
      i++
      continue
    }

    // heading
    const hm = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (hm) {
      out.push(withAlign({
        type: 'heading',
        level: hm[1].length,
        children: tokenizeInline(hm[2]),
      }, currentAlign))
      i++
      continue
    }

    // blockquote (consecutive > lines)
    if (/^>\s?/.test(trimmed)) {
      const parts = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        parts.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      out.push(withAlign({ type: 'blockquote', children: tokenizeInline(parts.join(' ')) }, currentAlign))
      continue
    }

    // checkbox line
    const cm = trimmed.match(/^\[([ xX])\]\s+(.*)$/)
    if (cm) {
      out.push(withAlign({
        type: 'checkbox',
        checked: cm[1].toLowerCase() === 'x',
        children: tokenizeInline(cm[2]),
      }, currentAlign))
      i++
      continue
    }

    // unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const body = parseListItemBody(lines[i].trim(), /^[-*]\s+/)
        items.push(tokenizeInline(body))
        i++
      }
      out.push(withAlign({ type: 'list', ordered: false, items }, currentAlign))
      continue
    }

    // ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const body = parseListItemBody(lines[i].trim(), /^\d+\.\s+/)
        items.push(tokenizeInline(body))
        i++
      }
      out.push(withAlign({ type: 'list', ordered: true, items }, currentAlign))
      continue
    }

    // paragraph line
    out.push(withAlign({ type: 'paragraph', children: tokenizeInline(line) }, currentAlign))
    i++
  }

  return out
}
