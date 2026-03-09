<template>
  <div class="mp-wrap" ref="wrapRef">
    <button class="mp-btn" @click.stop="toggle" :title="modelValue || 'Choisir un média'">
      <img v-if="previewUrl" :src="previewUrl" class="mp-thumb" />
      <span v-else>🖼</span>
    </button>

    <div v-if="open" class="mp-popover" @click.stop>
      <!-- Search -->
      <input
        v-model="search"
        class="mp-search"
        placeholder="Rechercher…"
        autofocus
      />
      <!-- Grid -->
      <div class="mp-grid">
        <div
          v-for="m in filtered" :key="m.id"
          class="mp-item"
          :class="{ active: m.id === modelValue }"
          @click="select(m)"
          :title="m.original_name"
        >
          <img v-if="isImage(m)" :src="`/uploads/${m.filename}`" />
          <span v-else class="mp-svg">SVG</span>
          <span class="mp-name">{{ m.original_name }}</span>
        </div>
        <div v-if="!filtered.length" class="mp-empty">Aucun fichier</div>
      </div>
      <!-- Clear -->
      <div class="mp-footer">
        <button class="mp-clear" @click="select(null)">✕ Effacer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/utils/api.js'

const props = defineProps({
  modelValue: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue'])

const open     = ref(false)
const search   = ref('')
const media    = ref([])
const wrapRef  = ref(null)

const previewUrl = computed(() => {
  if (!props.modelValue) return null
  return `/uploads/${props.modelValue}`
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return media.value.filter(m => !q || m.original_name.toLowerCase().includes(q))
})

function isImage(m) {
  return m.mime_type?.startsWith('image/')
}

async function toggle() {
  open.value = !open.value
  if (open.value && !media.value.length) {
    media.value = await api.getMedia()
  }
}

function select(m) {
  emit('update:modelValue', m ? m.id : null)
  open.value = false
}

// Close on outside click
function onOutsideClick(e) {
  if (wrapRef.value && !wrapRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onOutsideClick))
</script>

<style scoped>
.mp-wrap {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.mp-btn {
  width: 28px;
  height: 24px;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1px;
}
.mp-btn:hover { border-color: var(--accent-primary); }

.mp-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mp-popover {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 999;
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}

.mp-search {
  width: 100%;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-sizing: border-box;
}

.mp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.mp-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 1px solid transparent;
}
.mp-item:hover { background: var(--bg-hover); }
.mp-item.active { border-color: var(--accent-primary); background: rgba(108,122,255,0.1); }

.mp-item img {
  width: 48px;
  height: 40px;
  object-fit: cover;
  border-radius: 2px;
}

.mp-svg {
  width: 48px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  font-weight: 700;
  font-size: 10px;
  background: var(--bg-secondary);
  border-radius: 2px;
}

.mp-name {
  font-size: 8px;
  color: var(--text-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  max-width: 56px;
}

.mp-empty {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 10px;
  color: var(--text-muted);
  padding: 12px;
}

.mp-footer {
  border-top: 1px solid var(--border-subtle);
  padding-top: 4px;
}

.mp-clear {
  background: none;
  border: none;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 4px;
}
.mp-clear:hover { color: #ef4444; }
</style>
