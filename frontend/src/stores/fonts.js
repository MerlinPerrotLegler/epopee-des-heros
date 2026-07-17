import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/utils/api.js'

export const useFontsStore = defineStore('fonts', () => {
  const fonts = ref([])
  const loaded = ref(false)
  /** Incrémenté quand les faces sont réellement disponibles — force un refresh UI. */
  const generation = ref(0)
  let loadPromise = null

  async function waitForFamily(family) {
    if (!document.fonts?.load || !family) return
    try {
      await document.fonts.load(`16px "${family}"`)
      await document.fonts.ready
    } catch {
      // Police indisponible / CORS — on continue sans bloquer
    }
  }

  function injectFont(font) {
    return new Promise((resolve) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        waitForFamily(font.family).then(resolve)
      }

      const existing = document.querySelector(`link[data-font-id="${font.id}"]`)
      if (existing) {
        done()
        return
      }
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = font.url
      link.setAttribute('data-font-id', font.id)
      link.onload = done
      link.onerror = done
      document.head.appendChild(link)
      // Fallback si onload ne fire jamais (cache agressif)
      setTimeout(done, 3000)
    })
  }

  async function load({ force = false } = {}) {
    if (loaded.value && !force) return
    if (loadPromise && !force) return loadPromise
    loadPromise = (async () => {
      try {
        fonts.value = await api.getFonts()
        await Promise.all(fonts.value.map(injectFont))
        loaded.value = true
        generation.value += 1
      } catch (e) {
        // 401 avant login : on laisse loaded=false pour retenter après auth
        console.warn('[fonts] load failed', e)
        throw e
      } finally {
        loadPromise = null
      }
    })()
    return loadPromise
  }

  async function add(family, customUrl) {
    const font = await api.createFont({ family, url: customUrl || undefined })
    fonts.value.push(font)
    await injectFont(font)
    generation.value += 1
    return font
  }

  async function remove(id) {
    await api.deleteFont(id)
    fonts.value = fonts.value.filter(f => f.id !== id)
    const link = document.querySelector(`link[data-font-id="${id}"]`)
    if (link) link.remove()
    generation.value += 1
  }

  const familyNames = computed(() => fonts.value.map(f => f.family))

  return { fonts, familyNames, loaded, generation, load, add, remove }
})
