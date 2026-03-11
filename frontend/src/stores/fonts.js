import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/utils/api.js'

export const useFontsStore = defineStore('fonts', () => {
  const fonts = ref([])

  function injectFont(font) {
    if (document.querySelector(`link[data-font-id="${font.id}"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = font.url
    link.setAttribute('data-font-id', font.id)
    document.head.appendChild(link)
  }

  async function load() {
    fonts.value = await api.getFonts()
    fonts.value.forEach(injectFont)
  }

  async function add(family, customUrl) {
    const font = await api.createFont({ family, url: customUrl || undefined })
    fonts.value.push(font)
    injectFont(font)
    return font
  }

  async function remove(id) {
    await api.deleteFont(id)
    fonts.value = fonts.value.filter(f => f.id !== id)
    const link = document.querySelector(`link[data-font-id="${id}"]`)
    if (link) link.remove()
  }

  const familyNames = computed(() => fonts.value.map(f => f.family))

  return { fonts, familyNames, load, add, remove }
})
