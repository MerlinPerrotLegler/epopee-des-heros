<template>
  <div class="atoms-config-view">
    <div class="atoms-config-header">
      <h1>Configuration des atomes</h1>
      <p class="atoms-config-desc">
        Valeurs fixes et visibilité des paramètres pour chaque type d'atome.
      </p>
    </div>
    <div class="atoms-config-body">
      <AtomConfigPanel />
    </div>
  </div>
</template>

<script setup>
import AtomConfigPanel from '@/components/config/AtomConfigPanel.vue'
</script>

<style scoped>
.atoms-config-view {
  padding: 24px;
  max-width: 1280px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.atoms-config-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.atoms-config-desc {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--text-muted);
}

.atoms-config-body {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
}
</style>
