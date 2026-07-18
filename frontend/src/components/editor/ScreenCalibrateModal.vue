<template>
  <div v-if="open" class="calib-overlay" @click.self="emit('close')">
    <div class="calib-modal" role="dialog" aria-labelledby="calib-title">
      <h3 id="calib-title">Calibrer la taille réelle</h3>
      <p class="calib-help">
        Place une <strong>carte bancaire</strong> (85,6&nbsp;mm de large) contre le rectangle,
        puis ajuste le curseur jusqu’à ce que les largeurs coïncident.
      </p>

      <div class="calib-stage" :style="stageStyle">
        <div class="calib-card" :style="cardStyle">
          <span class="calib-card-label">85,6 mm</span>
        </div>
      </div>

      <label class="calib-slider-label">
        Échelle
        <input
          type="range"
          min="0.7"
          max="2.2"
          step="0.01"
          v-model.number="scale"
        />
        <span class="calib-scale-val">{{ scale.toFixed(2) }}×</span>
      </label>

      <div class="calib-actions">
        <button type="button" class="btn-ghost" @click="emit('close')">Annuler</button>
        <button type="button" class="btn-primary" @click="save">Valider 1:1</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { mmCss, CSS_PX_PER_MM } from '@/utils/cssMm.js'
import { getOneToOneZoom, setOneToOneZoom } from '@/utils/physicalScale.js'

const CREDIT_CARD_WIDTH_MM = 85.6
const CREDIT_CARD_HEIGHT_MM = CREDIT_CARD_WIDTH_MM / 1.586
const STAGE_PAD_PX = 24

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'calibrated'])

const scale = ref(getOneToOneZoom())

watch(() => props.open, (v) => {
  if (v) scale.value = getOneToOneZoom()
})

const cardStyle = computed(() => ({
  width: mmCss(CREDIT_CARD_WIDTH_MM),
  height: mmCss(CREDIT_CARD_HEIGHT_MM),
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))

/** Reserve layout space for the scaled card so it is never cropped. */
const stageStyle = computed(() => ({
  width: `${CREDIT_CARD_WIDTH_MM * CSS_PX_PER_MM * scale.value + STAGE_PAD_PX * 2}px`,
  height: `${CREDIT_CARD_HEIGHT_MM * CSS_PX_PER_MM * scale.value + STAGE_PAD_PX * 2}px`,
}))

function save() {
  setOneToOneZoom(scale.value)
  emit('calibrated', scale.value)
  emit('close')
}
</script>

<style scoped>
.calib-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow: auto;
}
.calib-modal {
  background: var(--bg-secondary, #1e2235);
  border: 1px solid var(--border-default, #2a3050);
  border-radius: 10px;
  padding: 24px 28px;
  width: max-content;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow: auto;
  color: var(--text-primary, #e8eaf0);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
.calib-modal h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}
.calib-help {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--text-muted, #9aa3b5);
  max-width: 36em;
}
.calib-stage {
  background: var(--bg-primary, #121522);
  border: 1px dashed var(--border-default, #2a3050);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  overflow: visible;
  box-sizing: border-box;
}
.calib-card {
  background: #f4f1ea;
  border: 1px solid #c4b8a8;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.calib-card-label {
  font-size: 12px;
  color: #5c5346;
  font-family: var(--font-mono, ui-monospace, monospace);
}
.calib-slider-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  margin-bottom: 16px;
  max-width: 480px;
}
.calib-slider-label input[type="range"] {
  flex: 1;
}
.calib-scale-val {
  font-family: var(--font-mono, ui-monospace, monospace);
  min-width: 3.2em;
  text-align: right;
}
.calib-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-ghost, .btn-primary {
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 13px;
  cursor: pointer;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-default, #2a3050);
  color: var(--text-muted, #9aa3b5);
}
.btn-primary {
  background: var(--accent-primary, #6c7aff);
  border: 1px solid transparent;
  color: #fff;
  font-weight: 600;
}
</style>
