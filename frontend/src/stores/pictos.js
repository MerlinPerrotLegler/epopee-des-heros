import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/utils/api.js'

export const usePictosStore = defineStore('pictos', () => {
  const tags = ref([])
  const pictos = ref([])
  const loaded = ref(false)

  async function load(force = false) {
    if (loaded.value && !force) return
    const [t, p] = await Promise.all([api.getPictoTags(), api.getPictos()])
    tags.value = t
    pictos.value = p
    loaded.value = true
  }

  function byRef(ref) {
    const r = String(ref || '').trim()
    return pictos.value.find((p) => p.picto_ref === r) || null
  }

  function pictosForTag(tagId) {
    if (!tagId) return pictos.value
    return pictos.value.filter((p) => (p.tags || []).some((t) => t.id === tagId || t.name === tagId))
  }

  return { tags, pictos, loaded, load, byRef, pictosForTag }
})
