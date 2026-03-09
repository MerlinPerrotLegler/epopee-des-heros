<template>
  <!-- Pentagone rouge (une face du D12) -->
  <svg width="100%" height="100%" viewBox="0 0 44 42" preserveAspectRatio="xMidYMid meet">
    <polygon points="22,1 41,15 34,38 10,38 3,15" fill="#ef4444" />
    <text x="22" y="28" text-anchor="middle"
      :fill="params.textColor || '#fff'"
      :font-size="(params.fontSize || 3) * 3.5"
      font-family="Outfit" font-weight="700">
      {{ params.value || '8' }}
    </text>
  </svg>
</template>

<script setup>
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
</script>
