<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <span class="login-logo">⬡</span>
        <h1>Card Designer</h1>
        <p class="login-sub">Connexion administrateur</p>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <div v-if="error" class="login-error">{{ error }}</div>
        <label>
          <span>Identifiant</span>
          <input v-model="username" type="text" autocomplete="username" required />
        </label>
        <label>
          <span>Mot de passe</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/layouts'
    await router.replace(redirect || '/layouts')
  } catch (e) {
    error.value = e.message || 'Erreur'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 28px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

.login-brand {
  text-align: center;
  margin-bottom: 22px;
}

.login-logo {
  font-size: 36px;
  color: var(--accent-primary);
  display: block;
  margin-bottom: 8px;
}

.login-brand h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.login-sub {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--text-muted);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.login-form input {
  padding: 8px 10px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-primary);
}

.login-error {
  font-size: 11px;
  color: #f87171;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: rgba(239, 68, 68, 0.12);
}

.login-btn {
  margin-top: 6px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent-primary);
  color: #fff;
  cursor: pointer;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
