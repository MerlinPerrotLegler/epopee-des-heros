<template>
  <!--
    AtomDie8 — Triangulaire (face de D8).
    Pas de remplissage : seuls des traits à la plume forment les 3 arêtes.
    Le rayon du triangle est piloté par les dimensions de l'élément.
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
      :x="cx * 0.9" :y="cy"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="p.textColor || '#1a1a2e'"
      :font-size="textSz"
      :font-family="p.fontFamily || 'Outfit'"
      font-weight="700"
    >{{ p.value || '3' }}</text>
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
const W     = computed(() => (props.width_mm  || 8) * SCALE)
const H     = computed(() => (props.height_mm || 8) * SCALE)
const cx    = computed(() => W.value / 2)
const cy    = computed(() => H.value / 2 * 1.15)

// Rayon du triangle — piloté par les dimensions de l'élément
const R      = computed(() => Math.min(W.value, H.value) / 2 * 1.12)
// Taille du texte — indépendante de la forme
const textSz = computed(() => (p.value.fontSize || 3.5) * SCALE)

// Triangle équilatéral pointant vers le haut : sommets à -90°, 30°, 150°
const ANGLES_3 = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]
const vertices = computed(() =>
  ANGLES_3.map(a => ({ x: cx.value + R.value * Math.cos(a), y: cy.value + R.value * Math.sin(a) }))
)

const penColor     = computed(() => p.value.penColor || p.value.textColor || '#1a1a2e')
const penHalfWidth = computed(() => (p.value.penWidth ?? 0.5) / 2 * SCALE)
const pool         = computed(() => buildStrokePool(p.value.penPoolSize ?? 4, p.value.penSeed ?? 8))

const strokePaths = computed(() => {
  const v = vertices.value
  return v.map((vi, i) => {
    const vj      = v[(i + 1) % v.length]
    const variant = pickVariant(pool.value, p.value.penSeed ?? 8, i)
    return variant ? variantToPath(vi.x, vi.y, vj.x, vj.y, variant, penHalfWidth.value) : null
  }).filter(Boolean)
})
</script>
