import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyRemoveBgToFiles } from './applyRemoveBgToFiles.js'

describe('applyRemoveBgToFiles', () => {
  it('returns same files when enabled is false', async () => {
    const f = new File([Uint8Array.of(1, 2, 3)], 'a.jpg', { type: 'image/jpeg' })
    let called = 0
    const out = await applyRemoveBgToFiles([f], {
      enabled: false,
      removeBgFn: async () => { called++; return new Blob([Uint8Array.of(9)], { type: 'image/png' }) },
    })
    assert.equal(called, 0)
    assert.equal(out.length, 1)
    assert.equal(out[0], f)
  })

  it('replaces each image with PNG when enabled', async () => {
    const f = new File([Uint8Array.of(1)], 'hero.JPEG', { type: 'image/jpeg' })
    const out = await applyRemoveBgToFiles([f], {
      enabled: true,
      removeBgFn: async (src) => {
        assert.ok(src instanceof Blob || src instanceof File)
        return new Blob([Uint8Array.of(7, 7)], { type: 'image/png' })
      },
    })
    assert.equal(out.length, 1)
    assert.equal(out[0].name, 'hero.png')
    assert.equal(out[0].type, 'image/png')
  })

  it('skips rembg for non-image mime when enabled', async () => {
    const f = new File([Uint8Array.of(1)], 'x.bin', { type: 'application/octet-stream' })
    let called = 0
    const out = await applyRemoveBgToFiles([f], {
      enabled: true,
      removeBgFn: async () => { called++; return new Blob([]) },
    })
    assert.equal(called, 0)
    assert.equal(out[0], f)
  })
})
