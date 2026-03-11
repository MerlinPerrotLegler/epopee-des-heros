import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/utils/api.js'

// Design tokens exposed in the global config panel
export const CONFIG_KEYS = [
  { key: 'fontFamily',   label: 'Police',             type: 'select', options: ['Outfit', 'JetBrains Mono', 'serif', 'sans-serif'] },
  { key: 'fontSize',     label: 'Taille police (mm)', type: 'number', step: 0.5 },
  { key: 'textColor',    label: 'Couleur texte',      type: 'color' },
  { key: 'color',        label: 'Couleur',            type: 'color' },
  { key: 'bgColor',      label: 'Fond',               type: 'color' },
  { key: 'borderColor',  label: 'Bordure',            type: 'color' },
  { key: 'borderWidth',  label: 'Épaisseur bordure (mm)', type: 'number', step: 0.1 },
  { key: 'borderRadius', label: 'Rayon bordure (px)', type: 'number', step: 1 },
]

export const useConfigStore = defineStore('config', () => {
  const config = ref({})
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      config.value = await api.getConfig()
    } finally {
      loading.value = false
    }
  }

  async function set(key, value) {
    const updated = { ...config.value }
    if (value === null || value === undefined || value === '') {
      delete updated[key]
    } else {
      updated[key] = value
    }
    config.value = await api.putConfig(updated)
  }

  return { config, loading, load, set }
})
