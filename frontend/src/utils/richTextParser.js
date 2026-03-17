/**
 * richTextParser.js
 * ─────────────────
 * Parseur pour l'atome richText (TSD-020).
 *
 * Syntaxe source reconnue :
 *   **gras**  *italique*  __souligné__  ~~barré~~  `code`  \n → <br>
 *   /D8{N}          → dé D8 avec valeur N
 *   /D12{N}         → dé D12 avec valeur N
 *   /R{type,amt}    → ressource (or, essence, pierre, mithril, cristaux, fragment)
 *   /R{type}        → ressource sans quantité
 *   /FOR{+1}        → caractéristique avec modificateur
 *   /INI            → caractéristique sans modificateur
 *   /SVG{fichier}   → image SVG depuis /uploads/
 *   $$expr$$        → formule FML inline (rendue en KaTeX)
 *   $$$expr$$$      → formule FML en bloc centré
 *
 * Exports :
 *   tokenize(content)  → Token[]
 *   parseFML(expr)     → string KaTeX
 */

// ── Markdown → HTML ───────────────────────────────────────────────────────────
export function markdownToHtml(text) {
  return text
    // Escape < > & pour éviter l'injection HTML accidentelle dans du texte brut
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Markdown
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// ── FML → KaTeX ───────────────────────────────────────────────────────────────
// Traduction récursive par passes : on repart tant que des fonctions FML sont trouvées.
// [^()]* ne traverse pas les parenthèses, donc les fonctions internes sont traduites en premier.
const FML_PASSES = 6

export function parseFML(expr) {
  // Mots-clés simples
  let r = expr
    .replace(/\btimes\b/g, '\\times')
    .replace(/\bdiv\b/g, '\\div')
    .replace(/\bgeq\b/g, '\\geq')
    .replace(/\bleq\b/g, '\\leq')
    .replace(/\bneq\b/g, '\\neq')
    .replace(/\binf\b/g, '\\infty')
    .replace(/\bpm\b/g, '\\pm')

  // Fonctions à 1 argument
  const fn1 = (name, wrap) =>
    new RegExp(`${name}\\(([^()]*)\\)`, 'g')
  const fn2 = (name) =>
    new RegExp(`${name}\\(([^()]*),([^()]*)\\)`, 'g')
  const fn3 = (name) =>
    new RegExp(`${name}\\(([^()]*),([^()]*),([^()]*)\\)`, 'g')

  for (let pass = 0; pass < FML_PASSES; pass++) {
    const prev = r
    r = r
      // 2-arg
      .replace(fn2('frac'),  (_, a, b) => `\\frac{${a.trim()}}{${b.trim()}}`)
      .replace(fn2('pow'),   (_, x, n) => `{${x.trim()}}^{${n.trim()}}`)
      .replace(fn2('sub'),   (_, x, i) => `{${x.trim()}}_{${i.trim()}}`)
      .replace(fn2('max'),   (_, a, b) => `\\max(${a.trim()},\\,${b.trim()})`)
      .replace(fn2('min'),   (_, a, b) => `\\min(${a.trim()},\\,${b.trim()})`)
      // 3-arg
      .replace(fn3('sum'),   (_, from, to, f) => `\\sum_{${from.trim()}}^{${to.trim()}}${f.trim()}`)
      .replace(fn3('int'),   (_, a, b, f) => `\\int_{${a.trim()}}^{${b.trim()}}${f.trim()}`)
      // 1-arg
      .replace(fn1('sqrt'),  (_, x) => `\\sqrt{${x.trim()}}`)
      .replace(fn1('floor'), (_, x) => `\\lfloor ${x.trim()} \\rfloor`)
      .replace(fn1('ceil'),  (_, x) => `\\lceil ${x.trim()} \\rceil`)
      .replace(fn1('abs'),   (_, x) => `\\left|${x.trim()}\\right|`)
      .replace(fn1('neg'),   (_, x) => `-{${x.trim()}}`)
    if (r === prev) break
  }
  return r
}

// ── Tokenizer ─────────────────────────────────────────────────────────────────
/**
 * Token types :
 *   { type: 'html',     html: string }
 *   { type: 'die',      sides: 8|12, value: string }
 *   { type: 'resource', resource: string, amount: string }
 *   { type: 'stat',     stat: string, modifier: string }
 *   { type: 'svg',      name: string }
 *   { type: 'math',     expr: string, block: boolean }
 */

// Ordre critique :
//   1. $$$...$$$ avant $$...$$
//   2. /D12 avant /D8 (sinon /D1 matcherait en partiel)
//   3. /SVG avant /S...stat (aucun stat ne commence par S mais prudence)
//   4. stats listées explicitement
const TOKEN_RE = /(\$\$\$[\s\S]+?\$\$\$|\$\$[^$]+?\$\$|\/D12\{[^}]*\}|\/D8\{[^}]*\}|\/R\{[^}]*\}|\/(FOR|DEX|INI|CHA|MAG|DEV|VIE|DEF)(?:\{[^}]*\})?|\/SVG\{[^}]*\})/g

export function tokenize(content) {
  if (!content) return []
  const tokens = []
  let lastIndex = 0
  TOKEN_RE.lastIndex = 0
  let m

  while ((m = TOKEN_RE.exec(content)) !== null) {
    // Text segment before this token
    if (m.index > lastIndex) {
      const text = content.slice(lastIndex, m.index)
      if (text) tokens.push({ type: 'html', html: markdownToHtml(text) })
    }

    const raw = m[1]

    if (raw.startsWith('$$$')) {
      tokens.push({ type: 'math', expr: raw.slice(3, -3).trim(), block: true })
    } else if (raw.startsWith('$$')) {
      tokens.push({ type: 'math', expr: raw.slice(2, -2).trim(), block: false })
    } else if (raw.startsWith('/D12')) {
      tokens.push({ type: 'die', sides: 12, value: raw.slice(5, -1) || '?' })
    } else if (raw.startsWith('/D8')) {
      tokens.push({ type: 'die', sides: 8, value: raw.slice(4, -1) || '?' })
    } else if (raw.startsWith('/R{')) {
      const inner = raw.slice(3, -1)
      const ci = inner.indexOf(',')
      if (ci === -1) {
        tokens.push({ type: 'resource', resource: inner.trim(), amount: '' })
      } else {
        tokens.push({ type: 'resource', resource: inner.slice(0, ci).trim(), amount: inner.slice(ci + 1).trim() })
      }
    } else if (raw.startsWith('/SVG{')) {
      tokens.push({ type: 'svg', name: raw.slice(5, -1).trim() })
    } else {
      // stat : /FOR or /FOR{+1}
      const braceIdx = raw.indexOf('{')
      const stat     = braceIdx === -1 ? raw.slice(1) : raw.slice(1, braceIdx)
      const modifier = braceIdx === -1 ? '' : raw.slice(braceIdx + 1, -1)
      tokens.push({ type: 'stat', stat, modifier })
    }

    lastIndex = TOKEN_RE.lastIndex
  }

  // Trailing text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    if (text) tokens.push({ type: 'html', html: markdownToHtml(text) })
  }

  return tokens
}
