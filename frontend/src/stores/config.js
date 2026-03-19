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

export const ATOM_PARAM_RULES_KEY = 'atomParamRules'

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

  function getAtomParamRule(atomType, paramKey) {
    const allRules = config.value?.[ATOM_PARAM_RULES_KEY] || {}
    const atomRules = allRules[atomType] || {}
    return atomRules[paramKey] || { hidden: false, fixedEnabled: false }
  }

  async function setAtomParamRule(atomType, paramKey, patch) {
    const updated = { ...config.value }
    const allRules = { ...(updated[ATOM_PARAM_RULES_KEY] || {}) }
    const atomRules = { ...(allRules[atomType] || {}) }
    const prevRule = atomRules[paramKey] || { hidden: false, fixedEnabled: false }
    atomRules[paramKey] = { ...prevRule, ...patch }
    allRules[atomType] = atomRules
    updated[ATOM_PARAM_RULES_KEY] = allRules
    config.value = await api.putConfig(updated)
  }

  return { config, loading, load, set, getAtomParamRule, setAtomParamRule }
})
