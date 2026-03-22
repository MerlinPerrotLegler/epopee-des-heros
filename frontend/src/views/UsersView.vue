<template>
  <div class="users-view">
    <header class="view-header">
      <h1>Utilisateurs</h1>
      <p class="hint">Administration des comptes (sans e-mail). Seuls les administrateurs voient cette page.</p>
    </header>

    <div class="panel">
      <h2>Nouvel utilisateur</h2>
      <form class="create-form" @submit.prevent="onCreate">
        <input v-model="create.username" placeholder="Identifiant" required autocomplete="off" />
        <input v-model="create.password" type="password" placeholder="Mot de passe (6+ car.)" required minlength="6" autocomplete="new-password" />
        <select v-model="create.role">
          <option value="user">Utilisateur</option>
          <option value="admin">Administrateur</option>
        </select>
        <button type="submit" class="btn-primary" :disabled="creating">Créer</button>
      </form>
      <p v-if="msg" class="msg">{{ msg }}</p>
      <p v-if="err" class="err">{{ err }}</p>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Identifiant</th>
            <th>Rôle</th>
            <th>Créé</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.username }}</td>
            <td>
              <select :value="u.role" @change="onRoleChange(u, $event.target.value)">
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </td>
            <td class="muted">{{ u.created_at?.slice(0, 10) }}</td>
            <td class="actions">
              <button type="button" class="btn-ghost btn-sm" @click="openPwd(u)">Mot de passe</button>
              <button
                type="button"
                class="btn-ghost btn-sm danger"
                :disabled="u.id === auth.user?.id"
                @click="onDelete(u)"
              >
                Supprimer
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pwdUser" class="modal-overlay" @click.self="pwdUser = null">
      <div class="modal">
        <h3>Nouveau mot de passe — {{ pwdUser.username }}</h3>
        <form @submit.prevent="submitPwd">
          <input v-model="pwdForm" type="password" placeholder="Nouveau mot de passe" minlength="6" required autocomplete="new-password" />
          <div class="modal-actions">
            <button type="button" class="btn-ghost" @click="pwdUser = null">Annuler</button>
            <button type="submit" class="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const users = ref([])
const creating = ref(false)
const create = ref({ username: '', password: '', role: 'user' })
const msg = ref('')
const err = ref('')
const pwdUser = ref(null)
const pwdForm = ref('')

async function load() {
  err.value = ''
  try {
    users.value = await api.getUsers()
  } catch (e) {
    err.value = e.message || String(e)
  }
}

onMounted(load)

async function onCreate() {
  msg.value = ''
  err.value = ''
  creating.value = true
  try {
    await api.createUser(create.value)
    create.value = { username: '', password: '', role: 'user' }
    msg.value = 'Utilisateur créé.'
    await load()
  } catch (e) {
    err.value = e.message || String(e)
  } finally {
    creating.value = false
  }
}

async function onRoleChange(u, role) {
  err.value = ''
  try {
    await api.patchUser(u.id, { role })
    await load()
  } catch (e) {
    err.value = e.message || String(e)
    await load()
  }
}

function openPwd(u) {
  pwdUser.value = u
  pwdForm.value = ''
}

async function submitPwd() {
  if (!pwdUser.value) return
  err.value = ''
  try {
    await api.patchUser(pwdUser.value.id, { password: pwdForm.value })
    pwdUser.value = null
    msg.value = 'Mot de passe mis à jour.'
    await load()
  } catch (e) {
    err.value = e.message || String(e)
  }
}

async function onDelete(u) {
  if (!confirm(`Supprimer l’utilisateur « ${u.username} » ?`)) return
  err.value = ''
  try {
    await api.deleteUser(u.id)
    await load()
  } catch (e) {
    err.value = e.message || String(e)
  }
}
</script>

<style scoped>
.users-view {
  padding: 24px;
  max-width: 900px;
  overflow: auto;
  height: 100%;
}
.view-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
}
.hint {
  margin: 0 0 20px;
  font-size: 12px;
  color: var(--text-muted);
}
.panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 24px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 14px;
}
.create-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.create-form input,
.create-form select {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
}
.msg { color: var(--accent-primary); font-size: 12px; margin-top: 8px; }
.err { color: #f87171; font-size: 12px; margin-top: 8px; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th, td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
}
th {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
}
.muted { color: var(--text-muted); font-size: 12px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-sm { font-size: 11px; padding: 4px 8px; }
.danger:hover { color: #f87171; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 20px;
  min-width: 320px;
}
.modal h3 {
  margin: 0 0 12px;
  font-size: 15px;
}
.modal input {
  width: 100%;
  padding: 8px 10px;
  margin-bottom: 12px;
  box-sizing: border-box;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
