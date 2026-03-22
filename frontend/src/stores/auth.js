import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  /** true une fois le premier GET /api/auth/me terminé */
  const ready = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  async function fetchMe() {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        user.value = d.user || null
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  async function login(username, password) {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) {
      throw new Error(d.error || 'Connexion impossible')
    }
    // Relecture serveur : confirme que le cookie est bien pris en compte avant navigation
    await fetchMe()
    if (!user.value) {
      throw new Error('Session non enregistrée — vérifie que le backend tourne et les cookies ne sont pas bloqués.')
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      user.value = null
    }
  }

  return { user, ready, isAuthenticated, fetchMe, login, logout }
})
