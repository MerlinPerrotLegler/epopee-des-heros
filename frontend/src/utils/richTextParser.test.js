import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { tokenize, tokenizeInline, parseFML, splitArgs } from './richTextParser.js'

describe('splitArgs', () => {
  it('splits commas', () => {
    assert.deepEqual(splitArgs('a, b, c'), ['a', 'b', 'c'])
  })
})

describe('tokenizeInline shortcodes', () => {
  it('parses /d8{3} and /d12()', () => {
    const t = tokenizeInline('/d8{3} /d12()')
    const dice = t.filter((x) => x.type === 'die')
    assert.equal(dice[0].sides, 8)
    assert.equal(dice[0].value, '3')
    assert.equal(dice[1].sides, 12)
    assert.equal(dice[1].value, '?')
  })

  it('parses /svg with color and () form', () => {
    const t = tokenizeInline('/svg(icon.svg,#c00)')
    assert.equal(t[0].type, 'svg')
    assert.equal(t[0].name, 'icon.svg')
    assert.equal(t[0].color, '#c00')
  })

  it('parses /data and $<alias>', () => {
    const t = tokenizeInline('/data{price.gold} et $<price.gold>')
    const data = t.filter((x) => x.type === 'data')
    assert.equal(data.length, 2)
    assert.equal(data[0].name, 'price.gold')
    assert.equal(data[1].name, 'price.gold')
  })

  it('parses stats', () => {
    const t = tokenizeInline('/FOR{+1} /INI').filter((x) => x.type === 'stat')
    assert.equal(t[0].stat, 'FOR')
    assert.equal(t[0].modifier, '+1')
    assert.equal(t[1].stat, 'INI')
  })

  it('parses picto with view', () => {
    const t = tokenizeInline('/epee{both}')
    assert.equal(t[0].type, 'picto')
    assert.equal(t[0].ref, 'epee')
    assert.equal(t[0].view, 'both')
  })

  it('parses /picto{tag,ref,view}', () => {
    const t = tokenizeInline('/picto{armes, epee, icon}')
    assert.equal(t[0].type, 'pictoByTag')
    assert.equal(t[0].tag, 'armes')
    assert.equal(t[0].ref, 'epee')
    assert.equal(t[0].view, 'icon')
    assert.equal(t[0].invalid, false)
  })

  it('rejects legacy /D8 and \\ref', () => {
    const t = tokenizeInline('x /D8{3} \\or y')
    assert.ok(!t.some((x) => x.type === 'die'))
    assert.ok(!t.some((x) => x.type === 'picto' && x.ref === 'or'))
  })

  it('parses => arrow', () => {
    const t = tokenizeInline('a => b')
    assert.ok(t.some((x) => x.type === 'arrow'))
  })
})

describe('tokenize blocks', () => {
  it('parses headings lists checkbox separator align', () => {
    const src = `# Titre
## Sous
- a
- b
1. un
/align{center}
/separator{rare,3}
[ ] todo
[x] done
> quote`
    const t = tokenize(src)
    assert.ok(t.some((x) => x.type === 'heading' && x.level === 1))
    assert.ok(t.some((x) => x.type === 'heading' && x.level === 2))
    assert.ok(t.some((x) => x.type === 'list' && !x.ordered && x.items.length === 2))
    assert.ok(t.some((x) => x.type === 'list' && x.ordered))
    const sep = t.find((x) => x.type === 'separator')
    assert.ok(sep)
    assert.equal(sep.tier, 'rare')
    assert.equal(sep.height_mm, 3)
    assert.equal(sep.align, 'center')
    assert.ok(t.some((x) => x.type === 'checkbox' && !x.checked && x.align === 'center'))
    assert.ok(t.some((x) => x.type === 'checkbox' && x.checked))
    assert.ok(t.some((x) => x.type === 'blockquote' && x.align === 'center'))
    assert.ok(!t.some((x) => x.type === 'hr'))
  })

  it('does not treat ------ as separator', () => {
    const t = tokenize('------')
    assert.ok(!t.some((x) => x.type === 'separator' || x.type === 'hr'))
  })

  it('parses /align and defaults for /separator', () => {
    const t = tokenize('/align{justify}\n/separator')
    const sep = t.find((x) => x.type === 'separator')
    assert.equal(sep.tier, 'basic')
    assert.equal(sep.height_mm, 2)
    assert.equal(sep.align, 'justify')
  })

  it('parses /cadre defaults and corner', () => {
    const t = tokenize('/cadre{rare,16,circle}')
    const c = t.find((x) => x.type === 'cadre')
    assert.equal(c.tier, 'rare')
    assert.equal(c.height_mm, 16)
    assert.equal(c.cornerShape, 'circle')
    const d = tokenize('/cadre').find((x) => x.type === 'cadre')
    assert.equal(d.tier, 'basic')
    assert.equal(d.height_mm, 12)
    assert.equal(d.cornerShape, 'star4')
  })
})

describe('parseFML', () => {
  it('frac', () => {
    assert.match(parseFML('frac(a,b)'), /\\frac/)
  })
})
