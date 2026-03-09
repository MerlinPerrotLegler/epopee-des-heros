<template>
  <svg width="100%" height="100%" viewBox="0 0 100 115" preserveAspectRatio="xMidYMid meet">
    <polygon points="50,2 97,28 97,87 50,113 3,87 3,28"
      :fill="params.bgColor || '#2a3050'"
      :stroke="params.borderColor || '#6c7aff'"
      :stroke-width="(params.borderWidth || 0.3) * 8" />
    <text x="50" y="65" text-anchor="middle"
      :fill="params.textColor || '#fff'"
      :font-size="(params.fontSize || 2.5) * 6"
      font-family="Outfit" font-weight="500">
      {{ params.text }}
    </text>
  </svg>
</template>

<script setup>
defineProps({ params: { type: Object, default: () => ({}) }, width_mm: Number, height_mm: Number, zoom: { type: Number, default: 1 } })
</script>
