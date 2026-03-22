const BASE = '/api'

async function request(path, options = {}) {
  const url = `${BASE}${path}`
  // `...options` en premier pour que credentials / headers fusionnés ne soient jamais écrasés
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  }
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body)
  }
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type']
  }

  const res = await fetch(url, config)

  if (res.status === 401 && !path.startsWith('/auth/')) {
    const loc = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : ''
    if (!loc.startsWith('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(loc || '/layouts')}`
    }
    const err = await res.json().catch(() => ({ error: 'Non authentifié' }))
    throw new Error(err.error || `API error ${res.status}`)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth (utilisé rarement depuis api.js — préférer le store auth)
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Layouts
  getLayouts: (type) => request(type ? `/layouts?type=${type}` : '/layouts'),
  getLayout: (id) => request(`/layouts/${id}`),
  createLayout: (data) => request('/layouts', { method: 'POST', body: data }),
  updateLayout: (id, data) => request(`/layouts/${id}`, { method: 'PATCH', body: data }),
  updateLayoutDefinition: (id, def) => request(`/layouts/${id}/definition`, { method: 'PUT', body: def }),
  duplicateLayout: (id, data) => request(`/layouts/${id}/duplicate`, { method: 'POST', body: data || {} }),
  deleteLayout: (id) => request(`/layouts/${id}`, { method: 'DELETE' }),

  // Components
  getComponents: () => request('/components'),
  getComponent: (id) => request(`/components/${id}`),
  createComponent: (data) => request('/components', { method: 'POST', body: data }),
  updateComponent: (id, data) => request(`/components/${id}`, { method: 'PUT', body: data }),
  patchComponent: (id, data) => request(`/components/${id}`, { method: 'PATCH', body: data }),
  duplicateComponent: (id, data) => request(`/components/${id}/duplicate`, { method: 'POST', body: data || {} }),
  deleteComponent: (id) => request(`/components/${id}`, { method: 'DELETE' }),

  // Cards
  getCards: (layoutId) => request(layoutId ? `/cards?layout_id=${layoutId}` : '/cards'),
  getCard: (id) => request(`/cards/${id}`),
  createCard: (data) => request('/cards', { method: 'POST', body: data }),
  updateCard: (id, data) => request(`/cards/${id}`, { method: 'PUT', body: data }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  importCards: (data) => request('/cards/import', { method: 'POST', body: data }),
  previewCsvUrl: (url) => request('/cards/preview-url', { method: 'POST', body: { url } }),
  importCardsFromUrl: (data) => request('/cards/import-url', { method: 'POST', body: data }),
  exportCardsUrl: (layoutId) => `${BASE}/cards/export?layout_id=${layoutId}`,

  // Import Jobs
  getImportJobs: () => request('/import-jobs'),
  getImportJob: (id) => request(`/import-jobs/${id}`),
  syncImportJob: (id) => request(`/import-jobs/${id}/sync`, { method: 'POST' }),
  deleteImportJob: (id) => request(`/import-jobs/${id}`, { method: 'DELETE' }),

  // Media
  getMedia: (folderId) => request(folderId ? `/media?folder_id=${folderId}` : '/media'),
  getFolders: () => request('/media/folders'),
  createFolder: (data) => request('/media/folders', { method: 'POST', body: data }),
  updateFolder: (id, data) => request(`/media/folders/${id}`, { method: 'PATCH', body: data }),
  deleteFolder: (id) => request(`/media/folders/${id}`, { method: 'DELETE' }),
  uploadMedia: (formData) => {
    return fetch(`${BASE}/media/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }).then(async (r) => {
      if (r.status === 401) {
        const loc = `${window.location.pathname}${window.location.search}`
        if (!loc.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(loc || '/layouts')}`
        }
        throw new Error('Non authentifié')
      }
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }))
        throw new Error(err.error || `API error ${r.status}`)
      }
      return r.json()
    })
  },
  updateMedia: (id, data) => request(`/media/${id}`, { method: 'PATCH', body: data }),
  deleteMedia: (id) => request(`/media/${id}`, { method: 'DELETE' }),

  // Card Types
  getCardTypes: () => request('/card-types'),
  createCardType: (data) => request('/card-types', { method: 'POST', body: data }),

  // Snapshots
  getSnapshots: () => request('/snapshots'),
  createSnapshot: (label) => request('/snapshots', { method: 'POST', body: { label } }),
  restoreSnapshot: (id) => request(`/snapshots/${id}/restore`, { method: 'POST' }),
  deleteSnapshot: (id) => request(`/snapshots/${id}`, { method: 'DELETE' }),

  // Export
  prepareExport: (data) => request('/export/prepare', { method: 'POST', body: data }),

  // Global design config
  getConfig: () => request('/config'),
  putConfig: (data) => request('/config', { method: 'PUT', body: data }),

  // AI generation config
  getAIConfig: () => request('/config/ai'),
  putAIConfig: (data) => request('/config/ai', { method: 'PUT', body: data }),

  // Missing media
  getMissingMedia: (status) => request(status ? `/missing-media?status=${status}` : '/missing-media'),
  patchMissingMedia: (id, data) => request(`/missing-media/${id}`, { method: 'PATCH', body: data }),
  previewPrompt: (id) => request(`/missing-media/${id}/preview-prompt`, { method: 'POST' }),
  generateMissingMedia: (id) => request(`/missing-media/${id}/generate`, { method: 'POST' }),
  generateAllMissingMedia: (opts) => request('/missing-media/generate-all', { method: 'POST', body: opts || {} }),

  // Custom fonts
  getFonts: () => request('/fonts'),
  createFont: (data) => request('/fonts', { method: 'POST', body: data }),
  deleteFont: (id) => request(`/fonts/${id}`, { method: 'DELETE' }),
}
