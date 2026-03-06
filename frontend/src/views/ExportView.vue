<template>
  <div class="crud-view">
    <header class="view-header">
      <h1>Export PDF</h1>
    </header>

    <div class="export-config">
      <div class="panel-section">
        <div class="panel-section-title">Sélection</div>
        <div class="field-row">
          <label>Mode</label>
          <select v-model="mode">
            <option value="layout">Par layout</option>
            <option value="type">Par type de carte</option>
          </select>
        </div>
        <div class="field-row" v-if="mode === 'layout'">
          <label>Layout</label>
          <select v-model="selectedLayout">
            <option v-for="l in layouts" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <div class="field-row" v-if="mode === 'type'">
          <label>Type</label>
          <select v-model="selectedType">
            <option v-for="t in cardTypes" :key="t.code" :value="t.code">{{ t.label }}</option>
          </select>
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section-title">Page</div>
        <div class="field-row">
          <label>Format</label>
          <select v-model="pageFormat" @change="applyFormat">
            <option value="a4">A4 (210×297mm)</option>
            <option value="letter">Letter (216×279mm)</option>
            <option value="a3">A3 (297×420mm)</option>
            <option value="custom">Personnalisé</option>
          </select>
        </div>
        <div class="field-row">
          <label>Largeur (mm)</label>
          <input type="number" v-model.number="pageW" />
        </div>
        <div class="field-row">
          <label>Hauteur (mm)</label>
          <input type="number" v-model.number="pageH" />
        </div>
        <div class="field-row">
          <label>Fond perdu (mm)</label>
          <input type="number" v-model.number="bleed" min="0" max="10" />
        </div>
        <div class="field-row">
          <label>Traits de coupe</label>
          <input type="checkbox" v-model="cutMarks" />
        </div>
      </div>

      <div class="panel-section">
        <div class="panel-section-title">Options</div>
        <div class="field-row">
          <label>Recto/Verso</label>
          <select v-model="rectoVerso">
            <option value="recto">Recto uniquement</option>
            <option value="both">Recto + Verso (miroir)</option>
            <option value="separate">Recto puis Verso séparés</option>
          </select>
        </div>
      </div>

      <button class="btn-primary" @click="prepareExport" style="margin: 16px 12px">
        Préparer l'export
      </button>

      <div v-if="exportData" class="panel-section">
        <div class="panel-section-title">Résultat</div>
        <p style="font-size:12px; color:var(--accent-success)">
          {{ exportData.instances.length }} cartes prêtes.
        </p>
        <p style="font-size:11px; color:var(--text-secondary); margin-top:8px">
          L'export PDF est rendu côté client. Utilisez Ctrl+P sur la page de preview pour imprimer.
        </p>
        <button class="btn-ghost" @click="openPreview" style="margin-top:8px">Ouvrir la preview</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/utils/api.js'

const layouts = ref([])
const cardTypes = ref([])
const mode = ref('layout')
const selectedLayout = ref(null)
const selectedType = ref(null)
const pageFormat = ref('a4')
const pageW = ref(210)
const pageH = ref(297)
const bleed = ref(3)
const cutMarks = ref(true)
const rectoVerso = ref('both')
const exportData = ref(null)

onMounted(async () => {
  [layouts.value, cardTypes.value] = await Promise.all([api.getLayouts(), api.getCardTypes()])
})

function applyFormat() {
  const formats = { a4: [210, 297], letter: [216, 279], a3: [297, 420] }
  if (formats[pageFormat.value]) {
    [pageW.value, pageH.value] = formats[pageFormat.value]
  }
}

async function prepareExport() {
  const body = {
    page_width_mm: pageW.value,
    page_height_mm: pageH.value,
    bleed_mm: bleed.value,
    cut_marks: cutMarks.value
  }
  if (mode.value === 'layout') body.layout_id = selectedLayout.value
  else body.card_type = selectedType.value

  exportData.value = await api.prepareExport(body)
}

function openPreview() {
  // Store export data in sessionStorage for the preview page
  // In a real implementation, this would open a new window with the rendered cards
  alert('Preview: fonctionnalité à implémenter avec le rendu côté client. Les données sont prêtes dans la console.')
  console.log('Export data:', exportData.value)
}
</script>

<style scoped>
.crud-view { padding: 24px; height: 100%; overflow-y: auto; }
.view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.view-header h1 { font-size: 20px; font-weight: 600; }
.export-config { max-width: 500px; }
</style>
