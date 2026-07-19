import { computed, readonly, ref } from 'vue'
import { api } from '../utils/api.js'

const catalogue = ref([])
const loading = ref(false)
const error = ref(null)
let loadPromise = null

export function catalogueByLogicalId(rows) {
  const indexed = {}
  for (const row of rows || []) {
    const meta = row?.track_meta
    if (!meta || meta.id == null) continue
    indexed[meta.id] = {
      ...meta,
      mediaId: row.id,
      filename: row.filename,
    }
  }
  return indexed
}

const byLogicalId = computed(() => catalogueByLogicalId(catalogue.value))

async function loadCatalogue() {
  if (loadPromise) return loadPromise
  loading.value = true
  error.value = null
  loadPromise = api.getTrackTextures()
    .then((rows) => {
      catalogue.value = Array.isArray(rows) ? rows : []
      return catalogue.value
    })
    .catch((err) => {
      error.value = err
      loadPromise = null
      return []
    })
    .finally(() => {
      loading.value = false
    })
  return loadPromise
}

export async function reloadTrackTextures() {
  const cachedLoad = loadPromise
  if (cachedLoad) await cachedLoad
  if (loadPromise !== cachedLoad) return loadPromise
  loadPromise = null
  return loadCatalogue()
}

export function useTrackTextures() {
  loadCatalogue()
  return {
    catalogue: readonly(catalogue),
    byLogicalId,
    loading: readonly(loading),
    error: readonly(error),
    reload: reloadTrackTextures,
  }
}
