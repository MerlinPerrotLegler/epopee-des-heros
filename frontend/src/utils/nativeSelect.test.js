import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  findSelectsNestedInLabels,
  focusSelectWithoutScroll,
  shouldIgnorePopoverOutsideMouseDown,
} from './nativeSelect.js'

describe('findSelectsNestedInLabels', () => {
  it('detects a select nested in a label', () => {
    const src = `
      <template>
        <label class="field">
          <span>Type</span>
          <select v-model="x"></select>
        </label>
      </template>
    `
    assert.equal(findSelectsNestedInLabels(src).length, 1)
  })

  it('ignores sibling label + select', () => {
    const src = `
      <template>
        <div class="field-row">
          <label>Type</label>
          <select v-model="x"></select>
        </div>
      </template>
    `
    assert.equal(findSelectsNestedInLabels(src).length, 0)
  })
})

describe('Vue templates: no select inside label', () => {
  it('does not nest native <select> in <label> (opens then closes every other click)', () => {
    const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
    const hits = []

    function walk(dir) {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name)
        if (name.isDirectory()) walk(p)
        else if (name.name.endsWith('.vue')) {
          const nested = findSelectsNestedInLabels(readFileSync(p, 'utf8'))
          for (const h of nested) hits.push(`${p}: ${h.preview}`)
        }
      }
    }
    walk(srcRoot)
    assert.deepEqual(hits, [])
  })
})

describe('shouldIgnorePopoverOutsideMouseDown', () => {
  it('ignores mousedown inside the popover', () => {
    const popover = { contains: (n) => n === 'inside' }
    assert.equal(shouldIgnorePopoverOutsideMouseDown({
      target: 'inside',
      popoverEl: popover,
    }), true)
  })

  it('ignores native OS picker while a select in the popover is focused', () => {
    const select = { tagName: 'SELECT' }
    const popover = { contains: (n) => n === select }
    assert.equal(shouldIgnorePopoverOutsideMouseDown({
      target: { tagName: 'HTML', closest: () => null },
      activeElement: select,
      popoverEl: popover,
    }), true)
  })

  it('closes when clicking a real outside node even if a select is focused', () => {
    const select = { tagName: 'SELECT' }
    const popover = { contains: (n) => n === select }
    assert.equal(shouldIgnorePopoverOutsideMouseDown({
      target: { tagName: 'DIV', closest: () => null },
      activeElement: select,
      popoverEl: popover,
      wrapEl: { contains: () => false },
    }), false)
  })
})

describe('focusSelectWithoutScroll', () => {
  it('focuses a select with preventScroll', () => {
    const calls = []
    const el = {
      tagName: 'SELECT',
      focus: (opts) => calls.push(opts),
    }
    focusSelectWithoutScroll(el)
    assert.deepEqual(calls, [{ preventScroll: true }])
  })
})
