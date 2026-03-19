<template>
  <div class="atom-render" :class="{ 'atom-render--overflow': atomType === 'die8' || atomType === 'die12' }">
    <component
      v-if="atomComponent"
      :is="atomComponent"
      :params="resolvedParams"
      :width_mm="width_mm"
      :height_mm="height_mm"
      :zoom="zoom"
      :selected="selected"
      v-bind="extraProps"
    />
    <div v-else class="atom-unknown">{{ atomType }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ATOM_PARAM_RULES_KEY, useConfigStore } from '@/stores/config.js'

import AtomBackgroundTexture        from '@/atoms/components/AtomBackgroundTexture.vue'
import AtomBackgroundGradientLinear from '@/atoms/components/AtomBackgroundGradientLinear.vue'
import AtomBackgroundGradientRadial from '@/atoms/components/AtomBackgroundGradientRadial.vue'
import AtomBackgroundImage          from '@/atoms/components/AtomBackgroundImage.vue'
import AtomTitle               from '@/atoms/components/AtomTitle.vue'
import AtomText                from '@/atoms/components/AtomText.vue'
import AtomIcon                from '@/atoms/components/AtomIcon.vue'
import AtomPastille            from '@/atoms/components/AtomPastille.vue'
import AtomDice8                from '@/atoms/components/AtomDice8.vue'
import AtomDice12               from '@/atoms/components/AtomDice12.vue'
import AtomCaracteristique     from '@/atoms/components/AtomCaracteristique.vue'
import AtomCardPlaceholder     from '@/atoms/components/AtomCardPlaceholder.vue'
import AtomResourcePlaceholder from '@/atoms/components/AtomResourcePlaceholder.vue'
import AtomResource            from '@/atoms/components/AtomResource.vue'
import AtomPrice               from '@/atoms/components/AtomPrice.vue'
import AtomCardType            from '@/atoms/components/AtomCardType.vue'
import AtomCounter             from '@/atoms/components/AtomCounter.vue'
import AtomHexTile             from '@/atoms/components/AtomHexTile.vue'
import AtomImage               from '@/atoms/components/AtomImage.vue'
import AtomRectangle           from '@/atoms/components/AtomRectangle.vue'
import AtomLine                from '@/atoms/components/AtomLine.vue'
import AtomTrak                from '@/atoms/components/AtomTrak.vue'
import AtomTrakCorner          from '@/atoms/components/AtomTrakCorner.vue'
import AtomCardTrack           from '@/atoms/components/AtomCardTrack.vue'
import AtomSeparator           from '@/atoms/components/AtomSeparator.vue'
import AtomDrawing             from '@/atoms/components/AtomDrawing.vue'
import AtomRichText            from '@/atoms/components/AtomRichText.vue'

const ATOM_COMPONENTS = {
  backgroundTexture:        AtomBackgroundTexture,
  backgroundGradientLinear: AtomBackgroundGradientLinear,
  backgroundGradientRadial: AtomBackgroundGradientRadial,
  backgroundImage:          AtomBackgroundImage,
  title:               AtomTitle,
  text:                AtomText,
  icon:                AtomIcon,
  pastille:            AtomPastille,
  die8:                AtomDice8,
  die12:               AtomDice12,
  caracteristique:     AtomCaracteristique,
  cardPlaceholder:     AtomCardPlaceholder,
  resourcePlaceholder: AtomResourcePlaceholder,
  resource:            AtomResource,
  price:               AtomPrice,
  cardType:            AtomCardType,
  counter:             AtomCounter,
  hexTile:             AtomHexTile,
  image:               AtomImage,
  rectangle:           AtomRectangle,
  line:                AtomLine,
  trak:                AtomTrak,
  trakCorner:          AtomTrakCorner,
  cardTrack:           AtomCardTrack,
  separator:           AtomSeparator,
  drawing:             AtomDrawing,
  richText:            AtomRichText,
}

const props = defineProps({
  atomType:   String,
  params:     { type: Object, default: () => ({}) },
  width_mm:   Number,
  height_mm:  Number,
  zoom:       { type: Number, default: 1 },
  selected:   { type: Boolean, default: false },
  liveStroke: { type: Object, default: null },   // only used by AtomDrawing
})

const configStore = useConfigStore()

const atomComponent = computed(() => ATOM_COMPONENTS[props.atomType] ?? null)

// Extra props passed only to specific atom types (avoids spurious $attrs warnings)
const extraProps = computed(() =>
  props.atomType === 'drawing' ? { liveStroke: props.liveStroke } : {}
)

// Merge params with global config: null values in params are replaced by the config value
const resolvedParams = computed(() => {
  const cfg = configStore.config
  const resolved = { ...props.params }
  for (const [key, cfgVal] of Object.entries(cfg)) {
    if (cfgVal !== null && cfgVal !== undefined && resolved[key] === null) {
      resolved[key] = cfgVal
    }
  }

  const atomRules = cfg?.[ATOM_PARAM_RULES_KEY]?.[props.atomType] || {}
  for (const [paramKey, rule] of Object.entries(atomRules)) {
    if (rule?.fixedEnabled && Object.prototype.hasOwnProperty.call(rule || {}, 'fixedValue')) {
      resolved[paramKey] = rule.fixedValue
    }
  }

  return resolved
})
</script>

<style scoped>
.atom-render {
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}
.atom-render--overflow {
  overflow: visible;
}

.atom-unknown {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px dashed #ef4444;
  color: #ef4444;
  font-size: 10px;
}
</style>
