<template>
  <div v-if="open" class="rt-slash" :style="menuStyle" @mousedown="onMenuMouseDown">
    <div v-if="phaseTitle" class="rt-slash-phase">{{ phaseTitle }}</div>
    <div ref="listRef" class="rt-slash-list">
      <div
        v-for="(it, idx) in visibleItems"
        :key="it.id || it.value"
        class="rt-slash-item"
        :class="{ active: idx === active }"
        @mouseenter="active = idx"
        @click="acceptIndex(idx)"
      >
        <span class="rt-slash-label">{{ it.label }}</span>
        <span class="rt-slash-hint">{{ it.hint || it.value || '' }}</span>
      </div>
      <div v-if="!visibleItems.length" class="rt-slash-empty">
        {{ emptyHint }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { getRichTextCatalog, filterCatalog } from '@/utils/richTextRegistry.js'
import { PICTO_VIEWS } from '@/utils/richTextParser.js'
import { usePictosStore } from '@/stores/pictos.js'

const props = defineProps({
  open: Boolean,
  /** Full slash context from parseSlashContext */
  context: { type: Object, default: null },
  anchor: { type: Object, default: null },
})

const emit = defineEmits(['replace', 'close'])

const pictosStore = usePictosStore()
pictosStore.load()

const active = ref(0)
const listRef = ref(null)

const catalog = computed(() => getRichTextCatalog({ pictos: pictosStore.pictos }))

const matchedCommand = computed(() => {
  const ctx = props.context
  if (!ctx?.name) return null
  return catalog.value.find((it) => it.command === ctx.name) || null
})

const phase = computed(() => {
  const ctx = props.context
  if (!ctx) return 'command'
  if (ctx.inArgs && matchedCommand.value?.args?.length) return 'arg'
  return 'command'
})

const argDef = computed(() => {
  const cmd = matchedCommand.value
  const ctx = props.context
  if (!cmd?.args || !ctx || ctx.argIndex < 0) return null
  return cmd.args[ctx.argIndex] || null
})

const filterQuery = computed(() => {
  const ctx = props.context
  if (!ctx) return ''
  if (phase.value === 'arg') return ctx.partial || ''
  return ctx.name || ''
})

const phaseTitle = computed(() => {
  if (phase.value === 'arg' && argDef.value) {
    return `Option : ${argDef.value.name}${argDef.value.optional ? ' (optionnel)' : ''}`
  }
  const q = filterQuery.value
  if (q) return `Filtre : ${q}`
  return 'Commandes'
})

const emptyHint = computed(() => {
  if (phase.value === 'arg' && argDef.value?.free) {
    return 'Aucun filtre — Entrée pour valider la saisie'
  }
  return 'Aucun résultat'
})

function optionsForArg(def, ctx) {
  if (!def) return []
  if (def.options?.length) {
    return def.options.map((v) => ({ id: `opt-${v}`, label: v, value: v, hint: def.name }))
  }
  if (def.optionsFrom === 'picto-views') {
    return PICTO_VIEWS.map((v) => ({ id: `view-${v}`, label: v, value: v, hint: 'view' }))
  }
  if (def.optionsFrom === 'picto-tags') {
    return pictosStore.tags.map((t) => ({
      id: `tag-${t.id}`,
      label: t.name,
      value: t.name,
      hint: 'tag',
    }))
  }
  if (def.optionsFrom === 'picto-refs') {
    const tagName = ctx.argsParts[0] || ''
    const tag = pictosStore.tags.find((t) => t.name === tagName || String(t.id) === tagName)
    const list = tag ? pictosStore.pictosForTag(tag.id) : pictosStore.pictos
    return list.map((p) => ({
      id: `ref-${p.picto_ref}`,
      label: p.picto_label || p.picto_ref,
      value: p.picto_ref,
      hint: p.picto_ref,
    }))
  }
  return []
}

const visibleItems = computed(() => {
  const q = filterQuery.value.trim()
  const ctx = props.context
  if (phase.value === 'arg' && argDef.value) {
    const opts = optionsForArg(argDef.value, ctx)
    if (!q) return opts
    const ql = q.toLowerCase()
    return opts.filter((o) =>
      o.label.toLowerCase().includes(ql) || String(o.value).toLowerCase().includes(ql)
    )
  }
  return filterCatalog(catalog.value, q || ctx?.name || '')
})

watch(filterQuery, () => { active.value = 0 })
watch(visibleItems, () => nextTick(scrollActiveIntoView))
watch(active, () => nextTick(scrollActiveIntoView))

watch(
  () => props.open,
  (v) => {
    if (v) active.value = 0
  },
)

function onMenuMouseDown(e) {
  // Garder le focus dans le textarea : ne pas blur en cliquant la liste
  e.preventDefault()
}

function scrollActiveIntoView() {
  const list = listRef.value
  if (!list) return
  const items = list.querySelectorAll('.rt-slash-item')
  const cur = items[active.value]
  if (!cur) return
  items[active.value - 1]?.scrollIntoView({ block: 'nearest' })
  items[active.value + 1]?.scrollIntoView({ block: 'nearest' })
  cur.scrollIntoView({ block: 'nearest' })
}

const menuStyle = computed(() => ({
  top: `${props.anchor?.top ?? 0}px`,
  left: `${props.anchor?.left ?? 0}px`,
}))

function buildCommandPrefix(cmd) {
  if (!cmd) return ''
  if (cmd.kind === 'markdown') return cmd.insert
  if (cmd.args?.length) return `/${cmd.command}{`
  return cmd.insert.endsWith('{') ? cmd.insert : (cmd.insert.includes('{') ? cmd.insert : `/${cmd.command}`)
}

function acceptIndex(idx) {
  const it = visibleItems.value[idx]
  if (!it) return
  acceptItem(it)
}

function acceptItem(it) {
  const ctx = props.context
  if (!ctx) return

  if (phase.value === 'command') {
    if (it.kind === 'markdown' || !it.command) {
      emit('replace', { start: ctx.start, text: it.insert, close: true })
      return
    }
    const prefix = buildCommandPrefix(it)
    const hasArgs = it.args?.length > 0
    emit('replace', {
      start: ctx.start,
      text: prefix,
      close: !hasArgs,
    })
    return
  }

  const cmd = matchedCommand.value
  if (!cmd) return
  const argIdx = ctx.argIndex
  const parts = [...ctx.argsParts, it.value]
  const isLast = argIdx >= (cmd.args.length - 1)
  const text = isLast
    ? `/${cmd.command}{${parts.join(',')}}`
    : `/${cmd.command}{${parts.join(',')},`
  emit('replace', { start: ctx.start, text, close: isLast })
}

function acceptFreePartial() {
  const ctx = props.context
  const cmd = matchedCommand.value
  const def = argDef.value
  if (!ctx || !cmd || !def || phase.value !== 'arg') return false
  const value = (ctx.partial || '').trim()
  if (!value && !def.optional) return false
  const parts = value ? [...ctx.argsParts, value] : [...ctx.argsParts]
  const isLast = ctx.argIndex >= (cmd.args.length - 1) || (!value && def.optional)
  let text
  if (!value && def.optional && isLast) {
    text = ctx.argsParts.length
      ? `/${cmd.command}{${ctx.argsParts.join(',')}}`
      : `/${cmd.command}`
  } else if (isLast || ctx.argIndex >= cmd.args.length - 1) {
    text = `/${cmd.command}{${parts.join(',')}}`
  } else {
    text = `/${cmd.command}{${parts.join(',')},`
  }
  emit('replace', { start: ctx.start, text, close: isLast || (!value && def.optional) })
  return true
}

function onNavKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    e.stopPropagation()
    if (!visibleItems.value.length) return
    active.value = Math.min(visibleItems.value.length - 1, active.value + 1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    if (!visibleItems.value.length) return
    active.value = Math.max(0, active.value - 1)
    return
  }
  if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'Tab') {
    e.preventDefault()
    e.stopPropagation()
    const it = visibleItems.value[active.value]
    if (it) {
      acceptItem(it)
      return
    }
    acceptFreePartial()
    return
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
  }
}

/** Intercepte uniquement la navigation quand le menu est ouvert (focus textarea). */
function onKey(e) {
  if (!props.open) return false
  if (['ArrowDown', 'ArrowUp', 'Enter', 'ArrowRight', 'Tab', 'Escape'].includes(e.key)) {
    onNavKeydown(e)
    return true
  }
  return false
}

defineExpose({ onKey })
</script>

<style scoped>
.rt-slash {
  position: absolute;
  z-index: 80;
  min-width: 260px;
  max-width: 340px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  padding: 0;
  display: flex;
  flex-direction: column;
}
.rt-slash-phase {
  font-size: 10px;
  color: var(--accent-primary);
  padding: 6px 10px 2px;
}
.rt-slash-list {
  max-height: 220px;
  overflow: auto;
  padding: 4px 0;
}
.rt-slash-item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
}
.rt-slash-item.active,
.rt-slash-item:hover { background: rgba(108,122,255,0.18); }
.rt-slash-label { color: var(--text-primary); }
.rt-slash-hint { color: var(--text-muted); font-family: var(--font-mono); font-size: 10px; }
.rt-slash-empty { padding: 10px; color: var(--text-muted); font-size: 12px; }
</style>
