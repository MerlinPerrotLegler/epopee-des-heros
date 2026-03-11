<template>
  <div class="config-view">
    <div class="config-header">
      <h1>Configuration globale</h1>
      <p class="config-desc">Tokens de design appliqués à tous les atomes dont le paramètre correspondant est <code>null</code>.</p>
    </div>
    <div class="config-body">
      <ConfigPanel />
    </div>
  </div>
</template>

<script setup>
import ConfigPanel from '@/components/editor/ConfigPanel.vue'
</script>

<style scoped>
.config-view {
  padding: 24px;
  max-width: 480px;
  font-size: 12px;
}

.config-header {
  margin-bottom: 20px;
}

.config-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.config-desc {
  color: var(--text-muted);
  font-size: 11px;
  margin: 0;
}

.config-desc code {
  font-family: var(--font-mono);
  background: var(--bg-tertiary);
  padding: 1px 4px;
  border-radius: 2px;
}

.config-body {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
}
</style>
