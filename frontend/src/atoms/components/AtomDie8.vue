<template>
  <!-- Triangle bleu (une face du D8) -->
  <svg width="100%" height="100%" viewBox="0 0 40 35" preserveAspectRatio="xMidYMid meet">
    <polygon points="20,1 39,34 1,34" fill="#3b82f6" />
    <text x="20" y="28" text-anchor="middle"
      :fill="params.textColor || '#fff'"
      :font-size="(params.fontSize || 3.5) * 3.5"
      font-family="Outfit" font-weight="700">
      {{ params.value || '3' }}
    </text>
  </svg>
</template>

<script setup>
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
</script>
