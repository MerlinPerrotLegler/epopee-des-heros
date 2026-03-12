<template>
  <!--
    AtomDie12 — Pentagone (face de D12).
    Pas de remplissage : seuls des traits à la plume forment les 5 arêtes.
    Le rayon du pentagone est piloté par les dimensions de l'élément.
    Le fontSize contrôle uniquement la taille du nombre à l'intérieur.
  -->
  <svg
    width="100%" height="100%"
    :viewBox="`0 0 ${W} ${H}`"
    preserveAspectRatio="xMidYMid meet"
    style="overflow: visible"
  >
    <!-- Arêtes en fuseaux plume (derrière le texte) -->
    <path
      v-for="(d, i) in strokePaths" :key="i"
      :d="d"
      :fill="penColor"
      stroke="none"
    />
    <!-- Valeur (au-dessus des traits) -->
    <text
      :x="cx" :y="cy"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="p.textColor || '#1a1a2e'"
      :font-size="textSz"
      :font-family="p.fontFamily || 'Outfit'"
      font-weight="700"
    >{{ p.value || '8' }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { buildStrokePool, variantToPath, pickVariant } from '@/utils/cardTrackStrokes.js'

const props = defineProps({
  params:    { type: Object, default: () => ({}) },
  width_mm:  Number,
  height_mm: Number,
  zoom:      { type: Number, default: 1 },
})

const p     = computed(() => props.params)
const SCALE = 10
const W     = computed(() => (props.width_mm  || 9) * SCALE)
const H     = computed(() => (props.height_mm || 9) * SCALE)
const cx    = computed(() => W.value / 2)
const cy    = computed(() => H.value / 2)

// Rayon du pentagone — piloté par les dimensions de l'élément
const R      = computed(() => Math.min(W.value, H.value) / 2 * 0.85)
// Taille du texte — indépendante de la forme
const textSz = computed(() => (p.value.fontSize || 3) * SCALE)

// Pentagone régulier pointant vers le haut : sommets à -90° + 72°×i
const vertices = computed(() =>
  Array.from({ length: 5 }, (_, i) => {
    const a = (-Math.PI / 2) + (2 * Math.PI / 5) * i
    return { x: cx.value + R.value * Math.cos(a), y: cy.value + R.value * Math.sin(a) }
  })
)

const penColor     = computed(() => p.value.penColor || p.value.textColor || '#1a1a2e')
const penHalfWidth = computed(() => (p.value.penWidth ?? 0.5) / 2 * SCALE)
const pool         = computed(() => buildStrokePool(p.value.penPoolSize ?? 4, p.value.penSeed ?? 12))

const strokePaths = computed(() => {
  const v = vertices.value
  return v.map((vi, i) => {
    const vj      = v[(i + 1) % v.length]
    const variant = pickVariant(pool.value, p.value.penSeed ?? 12, i)
    return variant ? variantToPath(vi.x, vi.y, vj.x, vj.y, variant, penHalfWidth.value) : null
  }).filter(Boolean)
})
</script>
