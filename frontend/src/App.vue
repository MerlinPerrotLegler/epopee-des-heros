<template>
  <div class="app-shell">
    <nav class="app-nav">
      <div class="app-logo">
        <span class="logo-icon">⬡</span>
        <span class="logo-text">Card<br>Designer</span>
      </div>
      <div class="nav-links">
        <router-link to="/layouts" class="nav-item" :class="{ active: route.path.startsWith('/layouts') || route.path.startsWith('/editor') }">
          <span class="nav-icon">◫</span>
          <span class="nav-label">Layouts</span>
        </router-link>
        <router-link to="/components" class="nav-item" :class="{ active: route.path === '/components' }">
          <span class="nav-icon">◧</span>
          <span class="nav-label">Composants</span>
        </router-link>
        <router-link to="/media" class="nav-item" :class="{ active: route.path === '/media' }">
          <span class="nav-icon">▣</span>
          <span class="nav-label">Média</span>
        </router-link>
        <router-link to="/cards" class="nav-item" :class="{ active: route.path.startsWith('/cards') }">
          <span class="nav-icon">▦</span>
          <span class="nav-label">Cartes</span>
        </router-link>
        <router-link to="/export" class="nav-item" :class="{ active: route.path === '/export' }">
          <span class="nav-icon">⤓</span>
          <span class="nav-label">Export</span>
        </router-link>
      </div>
      <div class="nav-bottom">
        <router-link to="/config" class="nav-item" :class="{ active: route.path === '/config' }">
          <span class="nav-icon">⚙</span>
          <span class="nav-label">Config</span>
        </router-link>
        <router-link to="/snapshots" class="nav-item" :class="{ active: route.path === '/snapshots' }">
          <span class="nav-icon">⟲</span>
          <span class="nav-label">Versions</span>
        </router-link>
      </div>
    </nav>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editor.js'
import { useConfigStore } from '@/stores/config.js'
import { useFontsStore } from '@/stores/fonts.js'

const route = useRoute()
const editorStore = useEditorStore()
const configStore = useConfigStore()
const fontsStore = useFontsStore()

function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    // Ignorer si on est dans un champ de saisie
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
    e.preventDefault()
    editorStore.undo()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  configStore.load()
  fontsStore.load()
})
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.app-nav {
  width: 72px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  flex-shrink: 0;
}

.app-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 12px;
  width: 100%;
}

.logo-icon {
  font-size: 22px;
  color: var(--accent-primary);
}

.logo-text {
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.2;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  width: 100%;
  padding: 0 8px;
}

.nav-bottom {
  width: 100%;
  padding: 0 8px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 8px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--text-muted);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.nav-item.active {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
}

.nav-icon {
  font-size: 18px;
  line-height: 1;
}

.nav-label {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.app-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
