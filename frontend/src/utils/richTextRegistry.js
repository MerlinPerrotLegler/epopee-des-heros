/**
 * Catalogue unique pour slash menu + doc RichText (TSD-026).
 */
import { STAT_CODES, PICTO_VIEWS, ALIGN_VALUES, SEPARATOR_TIERS, CADRE_CORNER_SHAPES } from './richTextParser.js'
import { STAT_TYPES } from '@/atoms/index.js'

/** @typedef {{ name: string, options?: string[], optionsFrom?: 'picto-tags'|'picto-refs'|'picto-views', free?: boolean, placeholder?: string }} ArgDef */
/** @typedef {{ id: string, kind: string, label: string, hint?: string, insert: string, group: string, command?: string, args?: ArgDef[], views?: string[] }} CatalogItem */

/**
 * @param {{ pictos?: Array<{ picto_ref: string, picto_label?: string, tags?: Array<{ name?: string, id?: string }> }> }} opts
 * @returns {CatalogItem[]}
 */
export function getRichTextCatalog({ pictos = [] } = {}) {
  const items = []

  items.push(
    { id: 'md-h1', kind: 'markdown', group: 'Mise en forme', label: 'Titre H1', hint: '# …', insert: '# ', command: null },
    { id: 'md-h2', kind: 'markdown', group: 'Mise en forme', label: 'Titre H2', hint: '## …', insert: '## ', command: null },
    { id: 'md-bullet', kind: 'markdown', group: 'Mise en forme', label: 'Puce', hint: '- …', insert: '- ', command: null },
    { id: 'md-num', kind: 'markdown', group: 'Mise en forme', label: 'Liste numérotée', hint: '1. …', insert: '1. ', command: null },
    { id: 'md-check', kind: 'markdown', group: 'Mise en forme', label: 'Case à cocher', hint: '[ ] …', insert: '[ ] ', command: null },
    { id: 'md-quote', kind: 'markdown', group: 'Mise en forme', label: 'Citation', hint: '> …', insert: '> ', command: null },
    { id: 'md-arrow', kind: 'markdown', group: 'Mise en forme', label: 'Flèche', hint: '=>', insert: '=>', command: null },
  )

  items.push(
    {
      id: 'sc-d8', kind: 'builtin', group: 'Shortcodes', label: 'Dé 8', hint: '/d8{valeur}',
      insert: '/d8{', command: 'd8',
      args: [{ name: 'valeur', options: ['1', '2', '3', '4', '5', '6', '7', '8', '?'], free: true }],
    },
    {
      id: 'sc-d12', kind: 'builtin', group: 'Shortcodes', label: 'Dé 12', hint: '/d12{valeur}',
      insert: '/d12{', command: 'd12',
      args: [{ name: 'valeur', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '?'], free: true }],
    },
    {
      id: 'sc-svg', kind: 'builtin', group: 'Shortcodes', label: 'SVG', hint: '/svg{file,#color?}',
      insert: '/svg{', command: 'svg',
      args: [
        { name: 'file', free: true, placeholder: 'fichier.svg' },
        { name: 'color', free: true, placeholder: '#c00', optional: true },
      ],
    },
    {
      id: 'sc-data', kind: 'builtin', group: 'Shortcodes', label: 'Donnée', hint: '/data{nom}',
      insert: '/data{', command: 'data',
      args: [{ name: 'nom', free: true, placeholder: 'chemin.param' }],
    },
    {
      id: 'sc-picto-tag', kind: 'builtin', group: 'Shortcodes', label: 'Picto (tag)', hint: '/picto{tag, ref, view}',
      insert: '/picto{', command: 'picto',
      args: [
        { name: 'tag', optionsFrom: 'picto-tags' },
        { name: 'ref', optionsFrom: 'picto-refs' },
        { name: 'view', optionsFrom: 'picto-views' },
      ],
    },
    {
      id: 'sc-align', kind: 'builtin', group: 'Shortcodes', label: 'Alignement', hint: '/align{left|right|center|justify}',
      insert: '/align{', command: 'align',
      args: [{ name: 'align', options: [...ALIGN_VALUES] }],
    },
    {
      id: 'sc-separator', kind: 'builtin', group: 'Shortcodes', label: 'Séparateur', hint: '/separator{tier,hauteur_mm}',
      insert: '/separator{', command: 'separator',
      args: [
        { name: 'tier', options: [...SEPARATOR_TIERS] },
        { name: 'hauteur', options: ['1', '1.5', '2', '2.5', '3', '4'], free: true },
      ],
    },
    {
      id: 'sc-cadre', kind: 'builtin', group: 'Shortcodes', label: 'Cadre', hint: '/cadre{tier,hauteur,coin?}',
      insert: '/cadre{', command: 'cadre',
      args: [
        { name: 'tier', options: [...SEPARATOR_TIERS] },
        { name: 'hauteur', options: ['8', '10', '12', '16', '20'], free: true },
        { name: 'coin', options: [...CADRE_CORNER_SHAPES], optional: true },
      ],
    },
  )

  for (const code of STAT_CODES) {
    const meta = STAT_TYPES[code]
    items.push({
      id: `stat-${code}`,
      kind: 'stat',
      group: 'Caractéristiques',
      label: meta?.label || code,
      hint: `/${code}{±n}`,
      insert: `/${code}`,
      command: code,
      args: [{ name: 'mod', options: ['+1', '+2', '-1', '-2'], free: true, optional: true }],
    })
  }

  for (const p of pictos) {
    const ref = p.picto_ref
    if (!ref) continue
    items.push({
      id: `picto-${ref}`,
      kind: 'picto',
      group: 'Pictogrammes',
      label: p.picto_label || ref,
      hint: `/${ref}{${PICTO_VIEWS.join('|')}}`,
      insert: `/${ref}`,
      command: ref,
      views: PICTO_VIEWS,
      args: [{ name: 'view', options: [...PICTO_VIEWS], optional: true }],
      tags: (p.tags || []).map((t) => t.name || t).filter(Boolean),
    })
  }

  return items
}

export function filterCatalog(items, query) {
  const q = String(query || '').replace(/^\//, '').toLowerCase()
  if (!q) return items
  return items.filter((it) =>
    it.id.toLowerCase().includes(q)
    || (it.command || '').toLowerCase().includes(q)
    || it.label.toLowerCase().includes(q)
    || (it.hint || '').toLowerCase().includes(q)
    || it.insert.toLowerCase().includes(q)
  )
}

/**
 * Contexte slash depuis le texte avant le caret.
 * @returns {{ start: number, name: string, inArgs: boolean, argsParts: string[], partial: string, argIndex: number } | null}
 */
export function parseSlashContext(before) {
  const src = String(before || '')
  const m = src.match(/(?:^|[\s\n])(\/[a-zA-Z0-9_-]*)(\{[^}]*)?$/)
  if (!m) return null
  const cmdToken = m[1] // /name
  const bracePart = m[2] // {… without closing } or undefined
  const slashIdx = src.lastIndexOf(cmdToken)
  if (slashIdx < 0) return null
  const name = cmdToken.slice(1)

  if (!bracePart) {
    return {
      start: slashIdx,
      name,
      inArgs: false,
      argsParts: [],
      partial: '',
      argIndex: -1,
    }
  }

  const inner = bracePart.slice(1) // drop {
  const bits = inner.split(',')
  const argsParts = bits.slice(0, -1).map((s) => s.trim())
  const partial = bits[bits.length - 1] ?? ''

  return {
    start: slashIdx,
    name,
    inArgs: true,
    argsParts,
    partial,
    argIndex: argsParts.length,
  }
}
