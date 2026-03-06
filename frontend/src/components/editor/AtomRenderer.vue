<template>
  <div class="atom-render" :style="containerStyle">
    <!-- Title -->
    <div v-if="atomType === 'title'" class="atom-title" :style="textStyle">
      {{ params.text || 'Titre' }}
    </div>

    <!-- Text -->
    <div v-else-if="atomType === 'text'" class="atom-text" :style="textStyle">
      {{ params.text || 'Texte…' }}
    </div>

    <!-- Icon SVG -->
    <div v-else-if="atomType === 'icon'" class="atom-icon" :style="{ color: params.color, opacity: params.opacity }">
      <div v-if="params.svgContent" v-html="params.svgContent"></div>
      <span v-else class="icon-placeholder">◆</span>
    </div>

    <!-- Pastille -->
    <div v-else-if="atomType === 'pastille'" class="atom-pastille" :style="pastilleStyle">
      {{ params.text }}
    </div>

    <!-- Dé 8 -->
    <svg v-else-if="atomType === 'die8'" class="atom-die" viewBox="0 0 40 46" preserveAspectRatio="xMidYMid meet">
      <polygon
        points="20,1 39,13 39,33 20,45 1,33 1,13"
        :fill="params.bgColor" :stroke="params.strokeColor"
        :stroke-width="params.strokeWidth * 4"
      />
      <text x="20" y="28" text-anchor="middle" :fill="params.textColor"
        :font-size="params.fontSize * 4" font-family="Outfit" font-weight="600">
        {{ params.value || 'D8' }}
      </text>
    </svg>

    <!-- Dé 12 -->
    <svg v-else-if="atomType === 'die12'" class="atom-die" viewBox="0 0 44 48" preserveAspectRatio="xMidYMid meet">
      <polygon
        points="22,1 42,10 42,30 34,47 10,47 2,30 2,10"
        :fill="params.bgColor" :stroke="params.strokeColor"
        :stroke-width="params.strokeWidth * 4"
      />
      <text x="22" y="30" text-anchor="middle" :fill="params.textColor"
        :font-size="params.fontSize * 4" font-family="Outfit" font-weight="600">
        {{ params.value || 'D12' }}
      </text>
    </svg>

    <!-- Card placeholder -->
    <div v-else-if="atomType === 'cardPlaceholder'" class="atom-card-ph" :style="cardPhStyle">
      <span>{{ params.label || params.cardType }}</span>
    </div>

    <!-- Resource placeholder -->
    <div v-else-if="atomType === 'resourcePlaceholder'" class="atom-res-ph" :style="resPhStyle">
      <span>{{ params.label || '?' }}</span>
    </div>

    <!-- Resource -->
    <div v-else-if="atomType === 'resource'" class="atom-resource" :style="{ color: params.color }">
      <span class="res-icon" :style="{ color: RESOURCE_TYPES[params.resourceType]?.color }">
        {{ RESOURCE_TYPES[params.resourceType]?.icon || '●' }}
      </span>
      <span class="res-value">{{ params.value || '0' }}</span>
      <span v-if="params.showLabel" class="res-label">{{ RESOURCE_TYPES[params.resourceType]?.label }}</span>
    </div>

    <!-- Price -->
    <div v-else-if="atomType === 'price'" class="atom-price" :class="params.layout">
      <template v-if="typeof params.resources === 'object'">
        <span v-for="(val, key) in params.resources" :key="key" class="price-item">
          <span :style="{ color: RESOURCE_TYPES[key]?.color }">{{ RESOURCE_TYPES[key]?.icon || '●' }}</span>
          <span>{{ val }}</span>
        </span>
      </template>
      <span v-else class="price-placeholder">Prix…</span>
    </div>

    <!-- Card Type badge -->
    <div v-else-if="atomType === 'cardType'" class="atom-cardtype" :style="cardTypeStyle">
      {{ params.type || 'Type' }}
    </div>

    <!-- Counter -->
    <div v-else-if="atomType === 'counter'" class="atom-counter" :style="counterStyle">
      {{ params.prefix }}{{ params.value || '000' }}
    </div>

    <!-- Hex Tile -->
    <svg v-else-if="atomType === 'hexTile'" class="atom-hex" viewBox="0 0 100 115" preserveAspectRatio="xMidYMid meet">
      <polygon
        points="50,2 97,28 97,87 50,113 3,87 3,28"
        :fill="params.bgColor" :stroke="params.borderColor"
        :stroke-width="params.borderWidth * 8"
      />
      <text x="50" y="65" text-anchor="middle" :fill="params.textColor"
        :font-size="params.fontSize * 6" font-family="Outfit" font-weight="500">
        {{ params.text }}
      </text>
    </svg>

    <!-- Image -->
    <div v-else-if="atomType === 'image'" class="atom-image" :style="imageStyle">
      <img v-if="params.mediaId" :src="`/uploads/${params.mediaId}`" :style="{ objectFit: params.fit }" />
      <div v-else class="image-placeholder">
        <span v-if="params.aiPrompt">🤖 {{ params.aiPrompt.slice(0, 30) }}…</span>
        <span v-else>Image</span>
      </div>
    </div>

    <!-- Rectangle -->
    <div v-else-if="atomType === 'rectangle'" :style="rectStyle"></div>

    <!-- Line -->
    <div v-else-if="atomType === 'line'" :style="lineStyle"></div>

    <!-- Fallback -->
    <div v-else class="atom-unknown">{{ atomType }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RESOURCE_TYPES } from '@/atoms/index.js'

const props = defineProps({
  atomType: String,
  params: { type: Object, default: () => ({}) },
  width_mm: Number,
  height_mm: Number,
  zoom: { type: Number, default: 1 }
})

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  overflow: 'hidden',
}))

const mmToScaledPx = (mm) => mm * 3.7795 * props.zoom

const textStyle = computed(() => ({
  fontFamily: props.params.fontFamily || 'Outfit',
  fontSize: `${mmToScaledPx(props.params.fontSize || 3)}px`,
  fontWeight: props.params.fontWeight || 400,
  color: props.params.color || '#000',
  textAlign: props.params.textAlign || 'left',
  lineHeight: props.params.lineHeight || 1.3,
  letterSpacing: props.params.letterSpacing ? `${props.params.letterSpacing}px` : undefined,
  textTransform: props.params.textTransform || 'none',
  overflow: props.params.overflow === 'ellipsis' ? 'hidden' : (props.params.overflow || 'hidden'),
  textOverflow: props.params.overflow === 'ellipsis' ? 'ellipsis' : undefined,
  whiteSpace: props.params.overflow === 'ellipsis' ? 'nowrap' : undefined,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: props.atomType === 'title' ? 'center' : 'flex-start',
  justifyContent: props.params.textAlign === 'center' ? 'center' : (props.params.textAlign === 'right' ? 'flex-end' : 'flex-start'),
}))

const pastilleStyle = computed(() => ({
  background: props.params.bgColor,
  color: props.params.textColor,
  fontSize: `${mmToScaledPx(props.params.fontSize || 2.5)}px`,
  borderRadius: `${props.params.borderRadius || 50}%`,
  border: props.params.borderWidth ? `${props.params.borderWidth}px solid ${props.params.borderColor}` : 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  fontWeight: 600,
}))

const cardPhStyle = computed(() => ({
  background: props.params.bgColor,
  border: `1px ${props.params.borderStyle} ${props.params.borderColor}`,
  borderRadius: '3px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  fontSize: `${mmToScaledPx(2)}px`,
  color: props.params.borderColor,
}))

const resPhStyle = computed(() => ({
  background: props.params.bgColor,
  border: `1px ${props.params.borderStyle} ${props.params.borderColor}`,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  fontSize: `${mmToScaledPx(2)}px`,
  color: props.params.borderColor,
}))

const cardTypeStyle = computed(() => ({
  background: props.params.bgColor,
  color: props.params.textColor || '#fff',
  fontSize: `${mmToScaledPx(props.params.fontSize || 2)}px`,
  padding: '2px 6px',
  borderRadius: '3px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}))

const counterStyle = computed(() => ({
  fontFamily: props.params.fontFamily || 'JetBrains Mono',
  fontSize: `${mmToScaledPx(props.params.fontSize || 2)}px`,
  color: props.params.color,
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  height: '100%',
}))

const imageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  borderRadius: props.params.borderRadius ? `${props.params.borderRadius}px` : '0',
  opacity: props.params.opacity ?? 1,
  overflow: 'hidden',
}))

const rectStyle = computed(() => ({
  width: '100%',
  height: '100%',
  background: props.params.bgColor,
  border: props.params.borderWidth ? `${props.params.borderWidth}px solid ${props.params.borderColor}` : 'none',
  borderRadius: props.params.borderRadius ? `${props.params.borderRadius}px` : '0',
  opacity: props.params.opacity ?? 1,
}))

const lineStyle = computed(() => ({
  width: '100%',
  height: `${Math.max(1, mmToScaledPx(props.params.thickness || 0.3))}px`,
  background: props.params.color,
  borderStyle: props.params.style || 'solid',
  marginTop: '50%',
}))
</script>

<style scoped>
.atom-render {
  pointer-events: none;
  user-select: none;
}

.atom-die, .atom-hex {
  width: 100%;
  height: 100%;
}

.atom-resource {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  height: 100%;
}

.res-icon { font-size: 1.2em; }
.res-value { font-weight: 600; }
.res-label { font-size: 0.8em; opacity: 0.7; }

.atom-price {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  flex-wrap: wrap;
}

.atom-price.vertical { flex-direction: column; align-items: flex-start; }

.price-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.9em;
}

.price-placeholder { color: #999; font-style: italic; }

.atom-image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.atom-image img {
  width: 100%;
  height: 100%;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    45deg, #f0f0f0, #f0f0f0 4px, #e0e0e0 4px, #e0e0e0 8px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #888;
}

.atom-unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(239, 68, 68, 0.1);
  border: 1px dashed #ef4444;
  color: #ef4444;
  font-size: 10px;
}
</style>
