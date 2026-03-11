const BASE = '/api'

const AUTH_HEADER = 'Basic ' + btoa(
  `${import.meta.env.VITE_AUTH_USER || 'admin'}:${import.meta.env.VITE_AUTH_PASS || 'changeme'}`
)

async function request(path, options = {}) {
  const url = `${BASE}${path}`
  const config = {
    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH_HEADER },
    ...options
  }
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body)
  }
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'] // let browser set multipart boundary
  }

  const res = await fetch(url, config)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

export const api = {
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
  duplicateComponent: (id, data) => request(`/components/${id}/duplicate`, { method: 'POST', body: data || {} }),
  deleteComponent: (id) => request(`/components/${id}`, { method: 'DELETE' }),

  // Molecules
  getMolecules: () => request('/molecules'),
  getMolecule: (id) => request(`/molecules/${id}`),
  createMolecule: (data) => request('/molecules', { method: 'POST', body: data }),
  updateMolecule: (id, data) => request(`/molecules/${id}`, { method: 'PUT', body: data }),
  duplicateMolecule: (id, data) => request(`/molecules/${id}/duplicate`, { method: 'POST', body: data || {} }),
  deleteMolecule: (id) => request(`/molecules/${id}`, { method: 'DELETE' }),

  // Cards
  getCards: (layoutId) => request(layoutId ? `/cards?layout_id=${layoutId}` : '/cards'),
  getCard: (id) => request(`/cards/${id}`),
  createCard: (data) => request('/cards', { method: 'POST', body: data }),
  updateCard: (id, data) => request(`/cards/${id}`, { method: 'PUT', body: data }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  importCards: (data) => request('/cards/import', { method: 'POST', body: data }),

  // Media
  getMedia: (folderId) => request(folderId ? `/media?folder_id=${folderId}` : '/media'),
  getFolders: () => request('/media/folders'),
  createFolder: (data) => request('/media/folders', { method: 'POST', body: data }),
  updateFolder: (id, data) => request(`/media/folders/${id}`, { method: 'PATCH', body: data }),
  deleteFolder: (id) => request(`/media/folders/${id}`, { method: 'DELETE' }),
  uploadMedia: (formData) => {
    return fetch(`${BASE}/media/upload`, { method: 'POST', body: formData, headers: { 'Authorization': AUTH_HEADER } }).then(r => r.json())
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

  // Custom fonts
  getFonts: () => request('/fonts'),
  createFont: (data) => request('/fonts', { method: 'POST', body: data }),
  deleteFont: (id) => request(`/fonts/${id}`, { method: 'DELETE' }),
}
