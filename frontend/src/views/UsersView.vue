<template>
  <div class="users-page">
    <header class="page-head">
      <h1>Utilisateurs</h1>
      <p class="lead">
        Créer, modifier et supprimer les comptes d’accès (identifiant + mot de passe, sans e-mail).
        Réservé aux administrateurs.
      </p>
    </header>

    <div class="panels">
      <!-- Panneau création -->
      <section class="panel panel-create" aria-labelledby="create-title">
        <h2 id="create-title">Nouveau compte</h2>
        <form class="form" @submit.prevent="onCreate">
          <label class="field">
            <span class="label">Identifiant</span>
            <input
              v-model="create.username"
              type="text"
              required
              autocomplete="off"
              placeholder="ex. marie"
            />
          </label>
          <label class="field">
            <span class="label">Mot de passe</span>
            <input
              v-model="create.password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              placeholder="Au moins 6 caractères"
            />
          </label>
          <label class="field">
            <span class="label">Rôle</span>
            <select v-model="create.role">
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </label>
          <button type="submit" class="btn-primary" :disabled="creating">
            {{ creating ? 'Création…' : 'Créer le compte' }}
          </button>
        </form>
      </section>

      <!-- Panneau liste + actions -->
      <section class="panel panel-list" aria-labelledby="list-title">
        <div class="panel-list-head">
          <h2 id="list-title">Comptes existants</h2>
          <button type="button" class="btn-ghost btn-sm" :disabled="loading" @click="load">
            Actualiser
          </button>
        </div>

        <p v-if="loading" class="state">Chargement…</p>
        <p v-else-if="!users.length" class="state muted">Aucun utilisateur (anormal — contactez le support).</p>

        <div v-else class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Identifiant</th>
                <th>Rôle</th>
                <th>Modifié</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td class="mono">{{ u.username }}</td>
                <td>
                  <span class="badge" :class="u.role === 'admin' ? 'badge-admin' : 'badge-user'">
                    {{ u.role === 'admin' ? 'Admin' : 'Utilisateur' }}
                  </span>
                </td>
                <td class="muted small">{{ formatDate(u.updated_at || u.created_at) }}</td>
                <td class="col-actions">
                  <button type="button" class="btn-ghost btn-sm" @click="openEdit(u)">Modifier</button>
                  <button
                    type="button"
                    class="btn-ghost btn-sm danger"
                    :disabled="u.id === auth.user?.id"
                    title="Vous ne pouvez pas supprimer votre propre compte"
                    @click="onDelete(u)"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <p v-if="msg" class="toast ok">{{ msg }}</p>
    <p v-if="err" class="toast err">{{ err }}</p>

    <!-- Modal modification -->
    <div v-if="editUser" class="modal-overlay" @click.self="closeEdit">
      <div class="modal" role="dialog" aria-labelledby="edit-modal-title">
        <h3 id="edit-modal-title">Modifier le compte</h3>
        <p class="modal-sub muted">Utilisateur : {{ editUser.username }}</p>

        <form class="form" @submit.prevent="submitEdit">
          <label class="field">
            <span class="label">Identifiant</span>
            <input v-model="editForm.username" type="text" required autocomplete="off" />
          </label>
          <label class="field">
            <span class="label">Rôle</span>
            <select v-model="editForm.role">
              <option value="user">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Nouveau mot de passe</span>
            <input
              v-model="editForm.password"
              type="password"
              autocomplete="new-password"
              placeholder="Laisser vide pour ne pas changer"
            />
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-ghost" @click="closeEdit">Annuler</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
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
const loading = ref(true)
const creating = ref(false)
const saving = ref(false)
const create = ref({ username: '', password: '', role: 'user' })
const msg = ref('')
const err = ref('')

const editUser = ref(null)
const editForm = ref({ username: '', role: 'user', password: '' })

function formatDate(s) {
  if (!s) return '—'
  return s.slice(0, 16).replace('T', ' ')
}

async function load() {
  err.value = ''
  loading.value = true
  try {
    users.value = await api.getUsers()
  } catch (e) {
    err.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function clearToasts() {
  msg.value = ''
  err.value = ''
}

async function onCreate() {
  clearToasts()
  creating.value = true
  try {
    await api.createUser(create.value)
    create.value = { username: '', password: '', role: 'user' }
    msg.value = 'Compte créé.'
    await load()
  } catch (e) {
    err.value = e.message || String(e)
  } finally {
    creating.value = false
  }
}

function openEdit(u) {
  clearToasts()
  editUser.value = u
  editForm.value = {
    username: u.username,
    role: u.role,
    password: '',
  }
}

function closeEdit() {
  editUser.value = null
}

async function submitEdit() {
  if (!editUser.value) return
  clearToasts()
  saving.value = true
  try {
    const body = {
      username: editForm.value.username.trim(),
      role: editForm.value.role,
    }
    if (editForm.value.password && editForm.value.password.length >= 6) {
      body.password = editForm.value.password
    } else if (editForm.value.password && editForm.value.password.length > 0) {
      err.value = 'Le mot de passe doit faire au moins 6 caractères.'
      saving.value = false
      return
    }
    await api.patchUser(editUser.value.id, body)
    msg.value = 'Compte mis à jour.'
    closeEdit()
    await load()
    await auth.fetchMe()
  } catch (e) {
    err.value = e.message || String(e)
  } finally {
    saving.value = false
  }
}

async function onDelete(u) {
  if (!confirm(`Supprimer définitivement le compte « ${u.username} » ?`)) return
  clearToasts()
  try {
    await api.deleteUser(u.id)
    msg.value = 'Compte supprimé.'
    await load()
  } catch (e) {
    err.value = e.message || String(e)
  }
}
</script>

<style scoped>
.users-page {
  padding: 24px 28px;
  max-width: 1100px;
  margin: 0 auto;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
}

.page-head h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
}
.lead {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
  max-width: 640px;
}

.panels {
  display: grid;
  grid-template-columns: minmax(280px, 340px) 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 800px) {
  .panels {
    grid-template-columns: 1fr;
  }
}

.panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 18px 20px;
}

.panel h2 {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
}
.field input,
.field select {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
}

.panel-create .btn-primary {
  margin-top: 4px;
  align-self: flex-start;
}

.panel-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.panel-list-head h2 {
  margin: 0;
}

.state {
  margin: 12px 0;
  font-size: 13px;
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: 11px;
}
.mono {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
}

.table-scroll {
  overflow-x: auto;
  margin: 0 -4px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
}
.data-table th {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  font-weight: 600;
}
.col-actions {
  white-space: nowrap;
  text-align: right;
}
.col-actions button {
  margin-left: 6px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.badge-admin {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}
.badge-user {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.toast {
  margin-top: 16px;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}
.toast.ok {
  background: rgba(34, 197, 94, 0.12);
  color: #86efac;
}
.toast.err {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

.danger:hover {
  color: #f87171 !important;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
}
.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 22px 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
}
.modal h3 {
  margin: 0 0 4px;
  font-size: 17px;
}
.modal-sub {
  margin: 0 0 18px;
  font-size: 12px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}
</style>
