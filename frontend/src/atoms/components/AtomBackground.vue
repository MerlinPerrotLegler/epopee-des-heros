<template>
  <!-- Fond de carte : couleur + dégradés + texture + overlay empilés -->
  <div class="bg-root">

    <!-- Couleur de base -->
    <div v-if="p.baseColor && p.baseColor !== 'transparent'"
      class="bg-layer"
      :style="{ background: p.baseColor }"
    />

    <!-- Dégradé 1 -->
    <div v-if="p.grad1"
      class="bg-layer"
      :style="{ background: gradCss(1), opacity: p.grad1Opacity ?? 1 }"
    />

    <!-- Dégradé 2 -->
    <div v-if="p.grad2"
      class="bg-layer"
      :style="{ background: gradCss(2), opacity: p.grad2Opacity ?? 1 }"
    />

    <!-- Texture -->
    <img
      v-if="p.textureMediaId"
      class="bg-layer bg-img"
      :src="`/uploads/${p.textureMediaId}`"
      :style="{
        objectFit: p.textureFit || 'cover',
        opacity: p.textureOpacity ?? 1,
        mixBlendMode: p.textureBlendMode || 'normal',
      }"
    />

    <!-- Image de décor avec placement libre -->
    <img
      v-if="p.overlayMediaId"
      class="bg-layer"
      :src="`/uploads/${p.overlayMediaId}`"
      :style="{
        left:   (p.overlayX ?? 0) + '%',
        top:    (p.overlayY ?? 0) + '%',
        width:  (p.overlayW ?? 100) + '%',
        height: (p.overlayH ?? 100) + '%',
        objectFit: p.overlayFit || 'contain',
        opacity: p.overlayOpacity ?? 1,
      }"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})

const p = computed(() => props.params)

function gradCss(n) {
  const type   = p.value[`grad${n}Type`]  || 'linear'
  const angle  = p.value[`grad${n}Angle`] ?? 135
  const c1     = p.value[`grad${n}Color1`] || '#2a3050'
  const s1     = p.value[`grad${n}Stop1`]  ?? 0
  const c2     = p.value[`grad${n}Color2`] || '#6c7aff'
  const s2     = p.value[`grad${n}Stop2`]  ?? 100

  if (type === 'radial') {
    return `radial-gradient(ellipse at center, ${c1} ${s1}%, ${c2} ${s2}%)`
  }
  return `linear-gradient(${angle}deg, ${c1} ${s1}%, ${c2} ${s2}%)`
}
</script>

<style scoped>
.bg-root {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.bg-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.bg-img {
  display: block;
}
</style>
