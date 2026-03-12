<template>
  <div class="missing-media-list">

    <!-- Toolbar -->
    <div class="mm-toolbar">
      <select v-model="statusFilter" @change="load" class="filter-select">
        <option value="">Tous</option>
        <option value="pending">pending</option>
        <option value="generating">generating</option>
        <option value="resolved">resolved</option>
        <option value="error">error</option>
        <option value="ignored">ignored</option>
      </select>
      <span class="mm-count">{{ pendingConfigured }} configurés / {{ items.length }} total</span>
      <button
        class="btn-primary btn-sm"
        :disabled="pendingConfigured === 0 || generatingCount > 0"
        @click="generateAll"
      >
        ⚡ Générer tout ({{ pendingConfigured }})
      </button>
    </div>

    <!-- AI config warning -->
    <div v-if="!aiConfigured" class="config-warning">
      ⚠ Provider IA non configuré.
      <router-link to="/config" @click.native="$emit('navigate-config')" class="warn-link">Configurer dans Config &gt; IA Provider →</router-link>
    </div>

    <!-- Empty state -->
    <div v-if="items.length === 0 && !loading" class="empty-state">
      <p>Aucun média manquant{{ statusFilter ? ` avec le statut "${statusFilter}"` : '' }}.</p>
    </div>

    <!-- List -->
    <div v-if="loading" class="loading">Chargement…</div>
    <div v-else class="mm-items">
      <div v-for="item in items" :key="item.id" class="mm-item" :class="statusClass(item)">
        <div class="mm-item-main">
          <div class="mm-top">
            <span class="mm-card-name">{{ item.card_instance_name || '—' }}</span>
            <code class="mm-path">{{ item.binding_path }}</code>
            <span class="mm-status-badge" :class="item.status">{{ item.status }}</span>
          </div>
          <div class="mm-meta">
            <span class="mm-layout" v-if="item.layout_id">
              Layout :
              <router-link :to="`/editor/${item.layout_id}`" class="layout-link">{{ item.layout_name || item.layout_id?.slice(0, 8) }} →</router-link>
            </span>
            <span class="mm-type">type : <strong>{{ item.media_type || '—' }}</strong></span>
          </div>
          <!-- Prompt missing warning -->
          <div v-if="!item.prompt_configured && item.status !== 'resolved'" class="prompt-warning">
            ⚠ Prompt manquant dans le layout —
            <router-link :to="`/editor/${item.layout_id}`" class="warn-link">Configurer →</router-link>
          </div>
          <!-- Error message -->
          <div v-if="item.status === 'error' && item.error_message" class="error-msg">{{ item.error_message }}</div>
          <!-- Resolved thumbnail -->
          <div v-if="item.status === 'resolved' && item.resolved_media_id" class="resolved-thumb">
            <img :src="`/uploads/${item.resolved_media_id}`" alt="generated" />
          </div>
        </div>

        <div class="mm-actions">
          <button class="btn-ghost btn-xs" @click="openPreviewPrompt(item)" title="Aperçu prompt">
            👁 Prompt
          </button>
          <button
            class="btn-ghost btn-xs"
            :disabled="!item.prompt_configured || item.status === 'generating' || !aiConfigured"
            :title="!item.prompt_configured ? 'Prompt manquant' : !aiConfigured ? 'Provider non configuré' : 'Générer'"
            @click="generate(item)"
          >
            {{ item.status === 'generating' ? '⟳ génération…' : '⚡ Générer' }}
          </button>
          <button class="btn-ghost btn-xs" @click="ignore(item)" v-if="item.status !== 'ignored'" title="Ignorer">Ignorer</button>
        </div>
      </div>
    </div>

    <!-- Prompt preview modal -->
    <div class="modal-overlay" v-if="previewPromptModal" @click.self="previewPromptModal = null">
      <div class="modal prompt-modal">
        <div class="modal-header">
          <span>Aperçu du prompt — {{ previewPromptModal.card_instance_name }}</span>
          <button class="btn-icon" @click="previewPromptModal = null">×</button>
        </div>
        <div class="modal-body">
          <div v-if="promptLoading" class="loading">Chargement…</div>
          <div v-else-if="promptError" class="error-msg">{{ promptError }}</div>
          <pre v-else class="prompt-pre">{{ promptText }}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost btn-sm" @click="copyPrompt" :disabled="!promptText">
            {{ copied ? '✓ Copié !' : '⎘ Copier' }}
          </button>
          <button
            class="btn-primary btn-sm"
            :disabled="!promptText || !aiConfigured || !previewPromptModal.prompt_configured"
            :title="!aiConfigured ? 'Provider non configuré' : ''"
            @click="generateFromModal"
          >⚡ Générer</button>
          <button class="btn-ghost btn-sm" @click="previewPromptModal = null">Fermer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/utils/api.js'

const items = ref([])
const loading = ref(false)
const statusFilter = ref('pending')
const aiConfigured = ref(false)

const previewPromptModal = ref(null)
const promptText = ref('')
const promptLoading = ref(false)
const promptError = ref('')
const copied = ref(false)

let pollTimer = null

const pendingConfigured = computed(() =>
  items.value.filter(i => i.status === 'pending' && i.prompt_configured).length
)
const generatingCount = computed(() =>
  items.value.filter(i => i.status === 'generating').length
)

onMounted(async () => {
  await checkAIConfig()
  await load()
  startPolling()
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function startPolling() {
  pollTimer = setInterval(async () => {
    if (generatingCount.value > 0) await load()
  }, 3000)
}

async function checkAIConfig() {
  try {
    const cfg = await api.getAIConfig()
    aiConfigured.value = cfg.api_key_set && !!cfg.global_prompt
  } catch { aiConfigured.value = false }
}

async function load() {
  loading.value = true
  try {
    items.value = await api.getMissingMedia(statusFilter.value || undefined)
  } catch {} finally {
    loading.value = false
  }
}

function statusClass(item) {
  if (!item.prompt_configured && item.status !== 'resolved') return 'warn'
  return item.status
}

async function generate(item) {
  await api.generateMissingMedia(item.id)
  const idx = items.value.findIndex(i => i.id === item.id)
  if (idx > -1) items.value[idx] = { ...items.value[idx], status: 'generating' }
}

async function generateAll() {
  await api.generateAllMissingMedia()
  await load()
}

async function ignore(item) {
  const updated = await api.patchMissingMedia(item.id, { status: 'ignored' })
  const idx = items.value.findIndex(i => i.id === item.id)
  if (idx > -1) items.value[idx] = { ...items.value[idx], ...updated }
}

async function openPreviewPrompt(item) {
  previewPromptModal.value = item
  promptText.value = ''
  promptError.value = ''
  promptLoading.value = true
  try {
    const res = await api.previewPrompt(item.id)
    promptText.value = res.prompt
  } catch (e) {
    promptError.value = e.message
  } finally {
    promptLoading.value = false
  }
}

async function copyPrompt() {
  if (!promptText.value) return
  await navigator.clipboard.writeText(promptText.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function generateFromModal() {
  if (!previewPromptModal.value) return
  await generate(previewPromptModal.value)
  previewPromptModal.value = null
}
</script>

<style scoped>
.missing-media-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 12px;
}

.mm-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-select {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 11px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.mm-count { font-size: 11px; color: var(--text-muted); flex: 1; }

.config-warning {
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.4);
  border-radius: var(--radius-sm);
  padding: 7px 12px;
  font-size: 11px;
  color: #ca8a04;
}

.warn-link { color: inherit; font-weight: 600; }

.empty-state { text-align: center; padding: 40px; color: var(--text-muted); }
.loading { color: var(--text-muted); font-size: 11px; padding: 8px 0; }

.mm-items { display: flex; flex-direction: column; gap: 6px; }

.mm-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.mm-item.generating { border-color: rgba(59,130,246,0.4); }
.mm-item.resolved { border-color: rgba(34,197,94,0.4); }
.mm-item.error { border-color: rgba(239,68,68,0.4); }
.mm-item.warn { border-color: rgba(234,179,8,0.4); }
.mm-item.ignored { opacity: 0.5; }

.mm-item-main { flex: 1; display: flex; flex-direction: column; gap: 4px; }

.mm-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mm-card-name { font-weight: 600; color: var(--text-primary); }
.mm-path { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }

.mm-status-badge {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 8px;
  letter-spacing: 0.04em;
}
.mm-status-badge.pending    { background: rgba(108,122,255,0.15); color: var(--accent-primary); }
.mm-status-badge.generating { background: rgba(59,130,246,0.15); color: #3b82f6; }
.mm-status-badge.resolved   { background: rgba(34,197,94,0.15); color: #22c55e; }
.mm-status-badge.error      { background: rgba(239,68,68,0.15); color: #ef4444; }
.mm-status-badge.ignored    { background: rgba(107,114,128,0.15); color: #6b7280; }

.mm-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--text-muted); }
.layout-link { color: var(--accent-primary); text-decoration: none; font-weight: 500; }
.layout-link:hover { text-decoration: underline; }

.prompt-warning { font-size: 10px; color: #ca8a04; }
.error-msg { font-size: 10px; color: #ef4444; font-family: var(--font-mono); }

.resolved-thumb img {
  max-width: 48px;
  max-height: 48px;
  object-fit: contain;
  border-radius: 3px;
  border: 1px solid var(--border-subtle);
}

.mm-actions { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; flex-shrink: 0; }

.btn-xs { font-size: 10px; padding: 2px 8px; }

/* Prompt preview modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
}

.prompt-modal {
  width: 540px;
  max-width: 95vw;
  max-height: 80vh;
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px; font-weight: 600;
  flex-shrink: 0;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.prompt-pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin: 0;
}

.modal-footer {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
</style>
