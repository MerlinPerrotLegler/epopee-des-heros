<template>
  <div class="docs-view">
    <aside class="docs-sidebar">
      <div class="sidebar-head">
        <h1>Documentation</h1>
        <p class="sidebar-sub">Specs techniques du Card Designer</p>
        <input
          v-model="query"
          class="docs-search"
          type="search"
          placeholder="Rechercher une spec…"
          aria-label="Rechercher une spec"
        />
      </div>

      <div v-if="loadingList" class="sidebar-status">Chargement…</div>
      <div v-else-if="listError" class="sidebar-status error">{{ listError }}</div>
      <nav v-else class="docs-nav">
        <section v-for="group in groupedDocs" :key="group.key" class="nav-group">
          <h2 class="nav-group-title">{{ group.label }}</h2>
          <button
            v-for="doc in group.items"
            :key="doc.id"
            type="button"
            class="nav-doc"
            :class="{ active: currentId === doc.id }"
            @click="selectDoc(doc.id)"
          >
            <span class="nav-doc-title">{{ shortTitle(doc) }}</span>
            <span
              v-if="doc.status"
              class="status-badge"
              :class="statusClass(doc.status)"
            >{{ normalizeStatus(doc.status) }}</span>
          </button>
        </section>
        <p v-if="!groupedDocs.length" class="sidebar-status">Aucun résultat</p>
      </nav>
    </aside>

    <main class="docs-main">
      <div v-if="loadingDoc" class="main-status">Chargement de la spec…</div>
      <div v-else-if="docError" class="main-status error">{{ docError }}</div>
      <template v-else-if="doc">
        <header class="doc-header">
          <div class="doc-meta">
            <span class="doc-kind" :class="doc.kind">{{ kindLabel(doc.kind) }}</span>
            <span v-if="doc.status" class="status-badge" :class="statusClass(doc.status)">
              {{ normalizeStatus(doc.status) }}
            </span>
            <span v-if="doc.updated" class="doc-updated">MAJ {{ doc.updated }}</span>
          </div>
          <h1 class="doc-title">{{ doc.title }}</h1>
          <p class="doc-file">{{ doc.filename }}</p>
        </header>

        <nav v-if="toc.length" class="doc-toc">
          <span class="toc-label">Sommaire</span>
          <a
            v-for="item in toc"
            :key="item.id"
            class="toc-link"
            :class="`lvl-${item.level}`"
            :href="`#${item.id}`"
            @click.prevent="scrollToHeading(item.id)"
          >{{ item.text }}</a>
        </nav>

        <article class="doc-prose" v-html="html" />
      </template>
      <div v-else class="main-status">Sélectionnez une spec dans la liste.</div>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { api } from '@/utils/api.js'

const props = defineProps({
  id: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()

const docs = ref([])
const doc = ref(null)
const html = ref('')
const toc = ref([])
const query = ref('')
const loadingList = ref(true)
const loadingDoc = ref(false)
const listError = ref('')
const docError = ref('')

marked.setOptions({
  gfm: true,
  breaks: false,
})

const currentId = computed(() => props.id || route.params.id || '')

const filteredDocs = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return docs.value
  return docs.value.filter((d) => {
    const hay = `${d.id} ${d.title} ${d.status || ''} ${d.filename}`.toLowerCase()
    return hay.includes(q)
  })
})

const groupedDocs = computed(() => {
  const groups = [
    { key: 'guide', label: 'Guide', kinds: ['readme', 'workplan'] },
    { key: 'tsd', label: 'Spécifications (TSD)', kinds: ['tsd'] },
    { key: 'other', label: 'Autres', kinds: ['doc'] },
  ]
  return groups
    .map((g) => ({
      key: g.key,
      label: g.label,
      items: filteredDocs.value.filter((d) => g.kinds.includes(d.kind)),
    }))
    .filter((g) => g.items.length)
})

function shortTitle(d) {
  if (d.kind === 'tsd' && d.number != null) {
    const rest = d.title.replace(/^TSD-\d+\s*[—–-]\s*/i, '').trim()
    return `TSD-${String(d.number).padStart(3, '0')} — ${rest || d.title}`
  }
  return d.title
}

function kindLabel(kind) {
  if (kind === 'tsd') return 'TSD'
  if (kind === 'workplan') return 'Plan'
  if (kind === 'readme') return 'Guide'
  return 'Doc'
}

function normalizeStatus(status) {
  const s = String(status || '').trim()
  if (/done|complet|terminé/i.test(s)) return 'Done'
  if (/review/i.test(s)) return 'Review'
  if (/draft|brouillon/i.test(s)) return 'Draft'
  return s
}

function statusClass(status) {
  const n = normalizeStatus(status).toLowerCase()
  if (n === 'done') return 'ok'
  if (n === 'review') return 'warn'
  if (n === 'draft') return 'draft'
  return 'muted'
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function renderMarkdown(md) {
  const headings = []
  const used = new Set()
  const renderer = new marked.Renderer()

  // marked v15 : renderer.heading reçoit un token
  renderer.heading = function heading(token) {
    const depth = token.depth
    const text = this.parser.parseInline(token.tokens)
    const plain = text.replace(/<[^>]+>/g, '')
    let id = slugify(plain) || `h-${headings.length}`
    let n = 1
    while (used.has(id)) {
      id = `${slugify(plain)}-${n++}`
    }
    used.add(id)
    if (depth >= 2 && depth <= 3) {
      headings.push({ id, text: plain, level: depth })
    }
    return `<h${depth} id="${id}">${text}</h${depth}>\n`
  }

  const out = marked.parse(md, { renderer })
  toc.value = headings
  return out
}

function selectDoc(id) {
  if (route.params.id === id) {
    loadDoc(id)
    return
  }
  router.push({ name: 'Docs', params: { id } })
}

async function loadList() {
  loadingList.value = true
  listError.value = ''
  try {
    docs.value = await api.getSpecs()
  } catch (e) {
    listError.value = e.message || 'Impossible de charger les specs'
  } finally {
    loadingList.value = false
  }
}

async function loadDoc(id) {
  if (!id) {
    doc.value = null
    html.value = ''
    toc.value = []
    return
  }
  loadingDoc.value = true
  docError.value = ''
  try {
    const data = await api.getSpec(id)
    doc.value = data
    html.value = renderMarkdown(data.content || '')
    await nextTick()
    const main = document.querySelector('.docs-main')
    if (main) main.scrollTop = 0
  } catch (e) {
    doc.value = null
    html.value = ''
    toc.value = []
    docError.value = e.message || 'Spec introuvable'
  } finally {
    loadingDoc.value = false
  }
}

function scrollToHeading(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => route.params.id,
  async (id) => {
    if (!id && docs.value.length) {
      await router.replace({ name: 'Docs', params: { id: docs.value[0].id } })
      return
    }
    await loadDoc(id)
  },
)

onMounted(async () => {
  await loadList()
  if (!route.params.id && docs.value.length) {
    await router.replace({ name: 'Docs', params: { id: docs.value[0].id } })
  } else if (route.params.id) {
    await loadDoc(route.params.id)
  }
})
</script>

<style scoped>
.docs-view {
  display: flex;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(1200px 500px at 10% -10%, rgba(108, 122, 255, 0.12), transparent 60%),
    radial-gradient(900px 400px at 90% 0%, rgba(56, 189, 248, 0.08), transparent 55%),
    var(--bg-deep);
}

.docs-sidebar {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-head {
  padding: 20px 16px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-head h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sidebar-sub {
  margin: 4px 0 12px;
  font-size: 11px;
  color: var(--text-muted);
}

.docs-search {
  width: 100%;
  font-size: 12px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}

.docs-nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px 8px 20px;
}

.nav-group {
  margin-bottom: 14px;
}

.nav-group-title {
  margin: 0 8px 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.nav-doc {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 2px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-doc:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-doc.active {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  box-shadow: inset 2px 0 0 var(--accent-primary);
}

.nav-doc-title {
  font-size: 12px;
  line-height: 1.35;
  font-weight: 500;
}

.sidebar-status,
.main-status {
  padding: 24px 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.sidebar-status.error,
.main-status.error {
  color: var(--accent-secondary);
}

.docs-main {
  flex: 1;
  overflow-y: auto;
  padding: 28px 36px 64px;
  min-width: 0;
}

.doc-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.doc-kind {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
}

.doc-kind.tsd { color: var(--accent-info); }
.doc-kind.workplan { color: var(--accent-warning); }
.doc-kind.readme { color: var(--accent-success); }

.status-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.status-badge.ok {
  color: var(--accent-success);
  background: rgba(74, 222, 128, 0.12);
  border-color: rgba(74, 222, 128, 0.35);
}

.status-badge.warn {
  color: var(--accent-warning);
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.35);
}

.status-badge.draft,
.status-badge.muted {
  color: var(--text-muted);
  background: var(--bg-tertiary);
}

.doc-updated {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.doc-title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-primary);
}

.doc-file {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.doc-toc {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  margin-bottom: 24px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
}

.toc-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-right: 4px;
}

.toc-link {
  font-size: 12px;
  color: var(--text-secondary);
  text-decoration: none;
}

.toc-link:hover {
  color: var(--accent-primary);
}

.toc-link.lvl-3 {
  opacity: 0.85;
  font-size: 11px;
}

.doc-prose {
  max-width: 820px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.doc-prose :deep(h1) {
  display: none; /* title already in header */
}

.doc-prose :deep(h2),
.doc-prose :deep(h3),
.doc-prose :deep(h4) {
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.3;
  margin: 1.6em 0 0.6em;
  scroll-margin-top: 16px;
}

.doc-prose :deep(h2) {
  font-size: 18px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-subtle);
}

.doc-prose :deep(h3) {
  font-size: 15px;
}

.doc-prose :deep(p) {
  margin: 0 0 0.9em;
}

.doc-prose :deep(a) {
  color: var(--accent-info);
  text-decoration: none;
}

.doc-prose :deep(a:hover) {
  text-decoration: underline;
}

.doc-prose :deep(ul),
.doc-prose :deep(ol) {
  margin: 0 0 1em;
  padding-left: 1.4em;
}

.doc-prose :deep(li) {
  margin: 0.25em 0;
}

.doc-prose :deep(li input[type='checkbox']) {
  margin-right: 6px;
}

.doc-prose :deep(blockquote) {
  margin: 0 0 1em;
  padding: 8px 14px;
  border-left: 3px solid var(--accent-primary);
  background: rgba(108, 122, 255, 0.08);
  color: var(--text-secondary);
}

.doc-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 1.6em 0;
}

.doc-prose :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--bg-tertiary);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--accent-info);
}

.doc-prose :deep(pre) {
  margin: 0 0 1.1em;
  padding: 14px 16px;
  overflow-x: auto;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
}

.doc-prose :deep(pre code) {
  background: transparent;
  padding: 0;
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.55;
}

.doc-prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 1.2em;
  font-size: 13px;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.doc-prose :deep(th),
.doc-prose :deep(td) {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
  vertical-align: top;
}

.doc-prose :deep(th) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.doc-prose :deep(tr:last-child td) {
  border-bottom: none;
}

.doc-prose :deep(tr:nth-child(even) td) {
  background: rgba(255, 255, 255, 0.02);
}

@media (max-width: 900px) {
  .docs-view {
    flex-direction: column;
  }
  .docs-sidebar {
    width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid var(--border-subtle);
  }
  .docs-main {
    padding: 20px 16px 48px;
  }
}
</style>
