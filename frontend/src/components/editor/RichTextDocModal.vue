<template>
  <div v-if="open" class="rt-doc-overlay" @click.self="$emit('close')">
    <div class="rt-doc-modal" role="dialog" aria-label="Documentation RichText">
      <header class="rt-doc-head">
        <h2>Guide Texte riche</h2>
        <button type="button" class="btn-icon" @click="$emit('close')">✕</button>
      </header>
      <div class="rt-doc-body">
        <section>
          <div class="rt-doc-md" v-html="guideHtml" />
        </section>
        <section class="rt-doc-dyn">
          <h3>Catalogue dynamique</h3>
          <p class="muted">Pictos et caractéristiques disponibles maintenant dans ce projet.</p>
          <h4>Caractéristiques</h4>
          <ul>
            <li v-for="s in stats" :key="s.id"><code>{{ s.insert }}</code> — {{ s.label }}</li>
          </ul>
          <h4>Pictogrammes ({{ pictos.length }})</h4>
          <ul class="rt-doc-pictos">
            <li v-for="p in pictos" :key="p.id">
              <code>/{{ p.insert.slice(1) }}</code>
              <span>{{ p.label }}</span>
              <span class="muted" v-if="p.tags?.length">[{{ p.tags.join(', ') }}]</span>
            </li>
          </ul>
          <p v-if="!pictos.length" class="muted">Aucun picto dans le catalogue.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { marked } from 'marked'
import { api } from '@/utils/api.js'
import { getRichTextCatalog } from '@/utils/richTextRegistry.js'
import { usePictosStore } from '@/stores/pictos.js'

defineProps({ open: Boolean })
defineEmits(['close'])

const pictosStore = usePictosStore()
const guideMd = ref('')

watch(() => true, async () => {
  pictosStore.load()
  try {
    const doc = await api.getSpec('GUIDE-richtext')
    guideMd.value = doc?.content || doc?.markdown || ''
    if (!guideMd.value && typeof doc === 'string') guideMd.value = doc
  } catch {
    guideMd.value = '_Impossible de charger GUIDE-richtext.md — ouvrez Docs dans l’app._'
  }
}, { immediate: true })

const guideHtml = computed(() => marked.parse(guideMd.value || ''))

const catalog = computed(() => getRichTextCatalog({ pictos: pictosStore.pictos }))
const stats = computed(() => catalog.value.filter((x) => x.kind === 'stat'))
const pictos = computed(() => catalog.value.filter((x) => x.kind === 'picto'))
</script>

<style scoped>
.rt-doc-overlay {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.rt-doc-modal {
  width: min(720px, 100%);
  max-height: 85vh;
  overflow: auto;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 16px 48px rgba(0,0,0,0.5);
}
.rt-doc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 1;
}
.rt-doc-head h2 { margin: 0; font-size: 16px; }
.rt-doc-body { padding: 16px 20px 24px; font-size: 13px; line-height: 1.5; }
.rt-doc-md :deep(h1) { font-size: 1.4em; }
.rt-doc-md :deep(h2) { font-size: 1.2em; margin-top: 1.2em; }
.rt-doc-md :deep(code) { font-family: var(--font-mono); font-size: 0.9em; }
.rt-doc-md :deep(pre) {
  background: var(--bg-secondary);
  padding: 10px;
  border-radius: 6px;
  overflow: auto;
}
.rt-doc-dyn { margin-top: 24px; border-top: 1px solid var(--border-subtle); padding-top: 16px; }
.muted { color: var(--text-muted); font-size: 12px; }
.rt-doc-pictos { max-height: 220px; overflow: auto; }
.rt-doc-pictos li { display: flex; gap: 8px; flex-wrap: wrap; margin: 4px 0; }
</style>
