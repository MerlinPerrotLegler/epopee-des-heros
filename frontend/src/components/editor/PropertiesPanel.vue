<template>
  <div class="properties-panel" v-if="el">
    <!-- Position & Size -->
    <div class="panel-section">
      <div class="panel-section-title">Position & Taille</div>
      <div class="pos-grid">
        <div class="pos-field">
          <label>X</label>
          <input type="number" :value="el.x_mm" @input="update('x_mm', +$event.target.value)" step="0.5" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field">
          <label>Y</label>
          <input type="number" :value="el.y_mm" @input="update('y_mm', +$event.target.value)" step="0.5" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field">
          <label>W</label>
          <input type="number" :value="el.width_mm" @input="update('width_mm', +$event.target.value)" step="0.5" min="1" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field">
          <label>H</label>
          <input type="number" :value="el.height_mm" @input="update('height_mm', +$event.target.value)" step="0.5" min="1" />
          <span class="unit">mm</span>
        </div>
        <div class="pos-field" style="grid-column: span 2">
          <label>Rotation</label>
          <input type="number" :value="el.rotation || 0" @input="update('rotation', +$event.target.value)" step="1" />
          <span class="unit">°</span>
        </div>
      </div>
    </div>

    <!-- Name in Layout (for data binding) -->
    <div class="panel-section">
      <div class="panel-section-title">Identifiant (data binding)</div>
      <div class="field-row">
        <label>Nom</label>
        <input
          :value="el.nameInLayout"
          @input="update('nameInLayout', $event.target.value)"
          placeholder="ex: card_name"
          style="flex:1; font-family: var(--font-mono); font-size: 11px"
        />
      </div>
    </div>

    <!-- ── Section picto : catalogue tag → ref (avant styles) ───────────── -->
    <div class="panel-section" v-if="el.type === 'atom' && el.atomType === 'picto'">
      <div class="panel-section-title">Catalogue Pictorgame</div>

      <div class="param-block">
        <div class="param-header">
          <label class="param-label">Tag</label>
          <span v-if="PARAM_HELP.tag" class="param-help">{{ PARAM_HELP.tag }}</span>
        </div>
        <div class="field-row">
          <template v-if="isPictoParamBinding(el.params?.tag)">
            <input
              :value="el.params?.tag || ''"
              @input="updateParam('tag', $event.target.value)"
              :disabled="isParamFixed('tag')"
              style="flex:1; font-family:var(--font-mono); font-size:10px"
            />
          </template>
          <select
            v-else
            :value="el.params?.tag || ''"
            @change="updateParam('tag', $event.target.value || '')"
            :disabled="isParamFixed('tag')"
            style="flex:1"
          >
            <option value="">— tous —</option>
            <option v-for="t in pictosStore.tags" :key="t.id" :value="String(t.id)">{{ t.name }}</option>
            <option
              v-if="el.params?.tag && !pictosStore.tags.some(t => String(t.id) === String(el.params.tag))"
              :value="el.params.tag"
            >{{ el.params.tag }}</option>
          </select>
        </div>
      </div>

      <div class="param-block">
        <div class="param-header">
          <label class="param-label">Ref</label>
          <span v-if="PARAM_HELP.ref" class="param-help">{{ PARAM_HELP.ref }}</span>
        </div>
        <div class="field-row">
          <template v-if="isPictoParamBinding(el.params?.ref)">
            <input
              :value="el.params?.ref || ''"
              @input="updateParam('ref', $event.target.value)"
              :disabled="isParamFixed('ref')"
              style="flex:1; font-family:var(--font-mono); font-size:10px"
            />
          </template>
          <select
            v-else
            :value="el.params?.ref || ''"
            @change="updateParam('ref', $event.target.value || '')"
            :disabled="isParamFixed('ref')"
            style="flex:1"
          >
            <option value="">— choisir —</option>
            <option v-for="opt in pictoRefOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            <option
              v-if="el.params?.ref && !pictoRefOptions.some(o => o.value === el.params.ref)"
              :value="el.params.ref"
            >{{ el.params.ref }}</option>
          </select>
        </div>
      </div>

      <div class="param-block">
        <div class="param-header">
          <label class="param-label">Vue</label>
          <span v-if="PARAM_HELP.view" class="param-help">{{ PARAM_HELP.view }}</span>
        </div>
        <div class="field-row">
          <select
            :value="el.params?.view || 'horizontal'"
            @change="updateParam('view', $event.target.value)"
            :disabled="isParamFixed('view')"
            style="flex:1"
          >
            <option v-for="opt in (getEnumOptions('view') || [])" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Section spéciale CardTrack : édition par case ── -->
    <div class="panel-section" v-if="el.type === 'atom' && el.atomType === 'cardTrack'">
      <div class="panel-section-title">Édition par case</div>
      <div class="field-row" v-if="store.activeCellIdx !== null">
        <label style="color:var(--accent-primary)">Case #{{ store.activeCellIdx }}</label>
        <button class="clear-btn" @click="clearCellOverride">✕ Réinitialiser</button>
      </div>
      <div class="ct-hint" v-else>
        Cliquez une case du CardTrack dans le canvas pour la sélectionner.
      </div>
      <template v-if="store.activeCellIdx !== null">
        <div class="field-row">
          <label>Fond</label>
          <ColorPickerAlpha
            :model-value="activeCellOverride.bgColor ?? null"
            @update:model-value="setCellProp('bgColor', $event ?? undefined)"
          />
        </div>
        <div class="field-row">
          <label>SVG ID</label>
          <input :value="activeCellOverride.svgMediaId || ''" @input="setCellProp('svgMediaId', $event.target.value || undefined)" placeholder="media ID" style="flex:1; font-family:var(--font-mono); font-size:10px" />
          <MediaPicker :model-value="activeCellOverride.svgMediaId || null" @update:model-value="setCellProp('svgMediaId', $event || undefined)" />
        </div>
      </template>
    </div>

    <!-- ── Section spéciale : éditeur de dégradé ── -->
    <div class="panel-section" v-if="isGradientAtom">
      <div class="panel-section-title">Couleurs du dégradé</div>
      <GradientStopEditor
        :model-value="el.params?.stops || []"
        @update:model-value="updateParam('stops', $event)"
        :gradient-type="el.atomType === 'backgroundGradientRadial' ? 'radial' : 'linear'"
        :angle="el.params?.angle || 135"
        :pos-x="el.params?.posX || 50"
        :pos-y="el.params?.posY || 50"
        :shape="el.params?.shape || 'ellipse'"
      />
    </div>

    <!-- ── Section richText : Contenu en premier ─────────────────────────── -->
    <div class="panel-section" v-if="el.type === 'atom' && el.atomType === 'richText'">
      <div class="panel-section-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>Contenu</span>
        <button type="button" class="btn-ghost btn-sm" @click="rtDocOpen = true">Doc</button>
      </div>
      <div class="rt-syntax-hint">
        **gras** *italique* · # titre · - puce · [ ] · /align{center} · /separator{basic,2}<br>
        /d8{6} /pieces{both} /picto{tag,ref,icon} /svg{file,#c00} /data{nom}<br>
        Tapez <code>/</code> pour le menu d’insertion
      </div>
      <div class="rt-editor-wrap">
        <textarea
          ref="rtTextarea"
          :value="el.params.content || ''"
          @input="onRtInput"
          @keydown="onRtKeydown"
          rows="8"
          class="rt-textarea"
          placeholder="Texte avec **gras**, /d8{6}, /align{center}…"
        />
        <RichTextSlashMenu
          ref="rtSlash"
          :open="rtSlashOpen"
          :context="rtSlashContext"
          :anchor="rtSlashAnchor"
          @replace="replaceRtSlash"
          @close="closeRtSlash"
        />
      </div>
      <div class="field-row" style="margin-top:8px">
        <label>Icône de puce</label>
        <MediaPicker
          :model-value="el.params.bulletIcon || ''"
          @update:model-value="updateParam('bulletIcon', $event || null)"
        />
      </div>
      <div class="field-row" style="margin-top:6px">
        <label>Case vide</label>
        <MediaPicker
          :model-value="el.params.checkboxIcon || ''"
          @update:model-value="updateParam('checkboxIcon', $event || null)"
        />
      </div>
      <div class="field-row" style="margin-top:6px">
        <label>Case cochée</label>
        <MediaPicker
          :model-value="el.params.checkboxIconChecked || ''"
          @update:model-value="updateParam('checkboxIconChecked', $event || null)"
        />
      </div>
      <RichTextDocModal :open="rtDocOpen" @close="rtDocOpen = false" />
    </div>

    <!-- Type-specific params (toujours via defaults fusionnés, même si params absents) -->
    <div class="panel-section" v-if="el.type === 'atom' && Object.keys(effectiveParams).length">
      <div class="panel-section-title">{{ el.atomType === 'richText' ? 'Style' : `Paramètres — ${typeLabel}` }}</div>
      <!-- cellOverrides, stops, pens/strokes (drawing), params IA → gérés par sections dédiées -->
      <div
        v-for="(value, key) in effectiveParams" :key="key" class="param-block"
        v-show="key !== 'cellOverrides' && key !== 'rows' && !(isGradientAtom && key === 'stops') && key !== 'ai_prompt_template' && key !== 'ai_media_type' && !(el.atomType === 'drawing' && (key === 'pens' || key === 'strokes' || key === 'activePenIdx' || key === 'moveLocked')) && !(el.atomType === 'richText' && (key === 'content' || key === 'bulletIcon' || key === 'checkboxIcon' || key === 'checkboxIconChecked')) && !(el.atomType === 'picto' && (key === 'tag' || key === 'ref' || key === 'view')) && !isParamHidden(key)"
      >
        <div class="param-header">
          <label class="param-label" :title="key">{{ paramLabel(key) }}</label>
          <span v-if="isParamFixed(key)" class="param-help">Paramètre fixé dans Config &gt; Atomes</span>
          <span v-if="PARAM_HELP[key]" class="param-help">{{ PARAM_HELP[key] }}</span>
        </div>
        <div class="field-row">

        <!-- Color picker avec alpha -->
        <template v-if="isColorParam(key, value)">
          <ColorPickerAlpha
            :model-value="typeof value === 'string' ? value : null"
            @update:model-value="updateParam(key, $event)"
            :data-param-key="key"
          />
        </template>

        <!-- Number -->
        <template v-else-if="typeof value === 'number'">
          <input type="number" :value="value" @input="updateParam(key, +$event.target.value)" :step="paramStep(key)" :data-param-key="key" :disabled="isParamFixed(key)" />
        </template>

        <!-- Boolean -->
        <template v-else-if="typeof value === 'boolean'">
          <input type="checkbox" :checked="value" @change="updateParam(key, $event.target.checked)" :data-param-key="key" :disabled="isParamFixed(key)" />
        </template>

        <!-- Select for known enums -->
        <template v-else-if="getEnumOptions(key)">
          <select :value="value" @change="updateParam(key, $event.target.value)" :data-param-key="key" :disabled="isParamFixed(key)">
            <option v-for="opt in getEnumOptions(key)" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </template>

        <!-- iconMap / badge : value = liste des clés du tableau rows -->
        <template v-else-if="isMapValueSelect(key)">
          <select
            :value="value || ''"
            @change="updateParam(key, $event.target.value)"
            :data-param-key="key"
            :disabled="isParamFixed(key)"
            style="flex:1"
          >
            <option value="">— choisir —</option>
            <option
              v-for="opt in mapValueOptions"
              :key="opt.value"
              :value="opt.value"
            >{{ opt.label }}</option>
            <option
              v-if="value && !mapValueOptions.some(o => o.value === String(value))"
              :value="value"
            >{{ value }}</option>
          </select>
          <span v-if="!mapValueOptions.length" class="param-help" style="flex-basis:100%">
            Aucune entrée : définissez le catalogue dans Config → Atomes (paramètre rows), ou ajoutez des lignes ci-dessous.
          </span>
        </template>

        <!-- Media ID param — text + picker button -->
        <template v-else-if="isMediaParam(key)">
          <input :value="value || ''" @input="updateParam(key, $event.target.value || null)" :data-param-key="key" style="flex:1; font-family:var(--font-mono); font-size:10px" placeholder="ID media" :disabled="isParamFixed(key)" />
          <MediaPicker v-if="!isParamFixed(key)" :model-value="value" @update:model-value="updateParam(key, $event)" />
        </template>

        <!-- Multiline text (textarea) -->
        <template v-else-if="typeof value === 'string' && MULTILINE_PARAMS.has(key)">
          <textarea
            :value="value"
            @input="updateParam(key, $event.target.value)"
            :data-param-key="key"
            :disabled="isParamFixed(key)"
            rows="4"
            style="flex:1; resize:vertical; font-size:11px; font-family:inherit; background:var(--bg-secondary); border:1px solid var(--border-subtle); color:var(--text-primary); padding:4px 6px; border-radius:var(--radius-sm)"
          />
        </template>

        <!-- Text (supports {{binding}} syntax) -->
        <template v-else-if="typeof value === 'string'">
          <input :value="value" @input="updateParam(key, $event.target.value)" :data-param-key="key" :disabled="isParamFixed(key)" />
        </template>

        <!-- Object / other (JSON editor) — hidden if it's the stops array shown above -->
        <template v-else>
          <input :value="JSON.stringify(value)" @change="updateParamJson(key, $event.target.value)" class="json-input" :data-param-key="key" :disabled="isParamFixed(key)" />
        </template>
        </div><!-- /.field-row -->
      </div><!-- /.param-block -->
    </div>

    <!-- ── Section drawing : édition des 5 plumes ──────────────────────── -->
    <div class="panel-section" v-if="el.type === 'atom' && el.atomType === 'drawing'">
      <div class="panel-section-title">Plumes (double-clic pour dessiner)</div>
      <div
        v-for="(pen, i) in (el.params.pens || [])"
        :key="i"
        class="pen-editor"
      >
        <div class="pen-editor-header">
          <span class="pen-editor-idx">{{ i + 1 }}</span>
          <input
            :value="pen.name"
            @input="updatePen(i, 'name', $event.target.value)"
            style="flex:1; font-size:10px; font-weight:600"
            placeholder="Nom"
          />
          <ColorPickerAlpha
            :model-value="pen.color"
            @update:model-value="updatePen(i, 'color', $event)"
          />
        </div>
        <div class="pen-editor-row">
          <label>Opacité</label>
          <input type="range" min="0" max="1" step="0.05"
            :value="pen.opacity ?? 1"
            @input="updatePen(i, 'opacity', +$event.target.value)" style="flex:1" />
          <span class="unit">{{ Math.round((pen.opacity ?? 1) * 100) }}%</span>
        </div>
        <div class="pen-editor-row">
          <label>Largeur</label>
          <input type="number" min="0.1" max="10" step="0.1"
            :value="pen.nibWidth ?? 1"
            @input="updatePen(i, 'nibWidth', +$event.target.value)" style="width:52px" />
          <span class="unit">mm</span>
        </div>
        <div class="pen-editor-row">
          <label>Angle bec</label>
          <input type="range" min="0" max="90" step="1"
            :value="pen.nibAngle ?? 45"
            @input="updatePen(i, 'nibAngle', +$event.target.value)" style="flex:1" />
          <span class="unit">{{ pen.nibAngle ?? 45 }}°</span>
        </div>
        <div class="pen-editor-row">
          <label>Pression</label>
          <input type="range" min="0" max="1" step="0.05"
            :value="pen.pressureScale ?? 0.5"
            @input="updatePen(i, 'pressureScale', +$event.target.value)" style="flex:1" />
          <span class="unit">{{ pen.pressureScale ?? 0.5 }}</span>
        </div>
        <div class="pen-editor-row">
          <label>Lissage</label>
          <input type="range" min="0" max="1" step="0.05"
            :value="pen.smoothing ?? 0.5"
            @input="updatePen(i, 'smoothing', +$event.target.value)" style="flex:1" />
          <span class="unit">{{ pen.smoothing ?? 0.5 }}</span>
        </div>
      </div>
      <div class="field-row" style="margin-top:8px">
        <label>Traits</label>
        <span style="flex:1; color:var(--text-muted); font-family:var(--font-mono)">{{ (el.params.strokes || []).length }}</span>
        <button class="clear-btn" @click="updateParam('strokes', [])" :disabled="!(el.params.strokes || []).length">
          🗑 Tout effacer
        </button>
      </div>
    </div>

    <!-- ── Section image : cadrage + IA prompt ──────────────────────────── -->
    <div class="panel-section" v-if="el.type === 'atom' && el.atomType === 'image'">
      <div class="panel-section-title">Cadrage (cover)</div>
      <div class="field-row">
        <label>Pos X</label>
        <input type="range" min="0" max="100" step="1"
          :value="el.params.posX ?? 50"
          @input="updateParam('posX', +$event.target.value)" style="flex:1" />
        <span class="unit">{{ el.params.posX ?? 50 }}%</span>
      </div>
      <div class="field-row">
        <label>Pos Y</label>
        <input type="range" min="0" max="100" step="1"
          :value="el.params.posY ?? 50"
          @input="updateParam('posY', +$event.target.value)" style="flex:1" />
        <span class="unit">{{ el.params.posY ?? 50 }}%</span>
      </div>

      <div class="panel-section-title" style="margin-top:10px">IA — Génération</div>

      <!-- Warning if AI not configured -->
      <div v-if="!aiConfigured" class="ai-warning">
        ⚠ Provider IA non configuré.
        <a href="/config" class="ai-warning-link">Config &gt; IA Provider →</a>
      </div>

      <div class="field-row">
        <label>Type</label>
        <select :value="el.params.ai_media_type || aiMediaTypes[0]?.type || 'illustration'"
          @change="updateParam('ai_media_type', $event.target.value)" style="flex:1">
          <option v-for="mt in aiMediaTypes" :key="mt.type" :value="mt.type">{{ mt.label }}</option>
        </select>
      </div>
      <div class="param-block">
        <div class="param-header">
          <label class="param-label">Prompt template</label>
          <span class="param-help" v-pre>Variables : {{card_name.text}}, {{card_type}}…</span>
        </div>
        <textarea
          :value="el.params.ai_prompt_template || ''"
          @input="updateParam('ai_prompt_template', $event.target.value)"
          placeholder="Illustration d'un {{card_name.text}}, carte {{card_type}}, style médiéval"
          style="width:100%;height:56px;resize:vertical;font-size:10px;font-family:var(--font-mono);background:var(--bg-secondary);border:1px solid var(--border-subtle);color:var(--text-primary);padding:4px 6px;border-radius:var(--radius-sm)"
        ></textarea>
        <!-- Warning if prompt template is empty -->
        <div v-if="!el.params.ai_prompt_template" class="ai-warning" style="margin-top:4px">
          ⚠ Prompt vide — la génération sera désactivée pour cet élément.
        </div>
      </div>
    </div>

    <!-- ── Section iconMap / badge : tableau valeur -> image (± label) ───── -->
    <div class="panel-section" v-if="el.type === 'atom' && (el.atomType === 'iconMap' || el.atomType === 'badge')">
      <div class="panel-section-title">
        {{ el.atomType === 'badge' ? 'Checklist valeur → image + label' : 'Tableau valeur → image' }}
      </div>
      <div v-if="mapRowsFromAtom" class="param-help" style="margin-bottom:8px">
        Catalogue défini dans <strong>Config → Atomes</strong> ({{ mapValueOptions.length }} entrée{{ mapValueOptions.length > 1 ? 's' : '' }}).
        Le select <code>value</code> utilise cette liste.
      </div>
      <template v-else>
      <div
        v-for="(row, idx) in mapRows"
        :key="`row-${idx}`"
        class="map-row"
        :class="{ 'map-row--badge': el.atomType === 'badge' }"
      >
        <input
          :value="row.value || ''"
          @input="updateMapRow(idx, 'value', $event.target.value)"
          placeholder="valeur (ex: belle)"
          class="map-row-value"
        />
        <input
          v-if="el.atomType === 'badge'"
          :value="row.label || ''"
          @input="updateMapRow(idx, 'label', $event.target.value)"
          placeholder="label affiché"
          class="map-row-value"
        />
        <input
          v-if="el.atomType === 'badge'"
          type="number"
          step="0.1"
          min="0.1"
          :value="row.fontSize ?? ''"
          @input="updateMapRow(idx, 'fontSize', $event.target.value === '' ? null : +$event.target.value)"
          :placeholder="String(el.params.fontSize ?? 2.5)"
          class="map-row-fontsize"
          title="Taille police (mm) — vide = taille de l’atome"
        />
        <div class="map-row-media">
          <input
            :value="row.mediaId || ''"
            @input="updateMapRow(idx, 'mediaId', $event.target.value || null)"
            placeholder="media ID"
            class="map-row-media-id"
          />
          <MediaPicker :model-value="row.mediaId || null" @update:model-value="updateMapRow(idx, 'mediaId', $event || null)" />
          <button class="map-row-remove" @click="removeMapRow(idx)">✕</button>
        </div>
      </div>

      <div class="field-row" style="margin-top:6px">
        <button class="clear-btn" @click="addMapRow">+ Ajouter une ligne</button>
      </div>
      </template>
      <div class="param-help" style="margin-top:4px">
        Astuce: liez <code>value</code> (ex: <code v-pre>{{card.guilde}}</code>) —
        l’atome affichera {{ el.atomType === 'badge' ? 'l’image et le label' : 'l’image' }} de la ligne correspondante.
        Définissez le catalogue dans <strong>Config → Atomes → {{ el.atomType === 'badge' ? 'Badge' : 'Icône (valeur → image)' }}</strong> (paramètre rows + Fixer).
      </div>
    </div>
  </div>

  <!-- Group selected -->
  <div class="properties-panel" v-else-if="selectedGroup">
    <div class="panel-section">
      <div class="panel-section-title">Groupe</div>
      <div class="field-row">
        <label>Nom</label>
        <input :value="selectedGroup.name" @input="store.updateItem(selectedGroup.id, { name: $event.target.value })" style="flex:1" />
      </div>
      <div class="field-row">
        <label>Verrouillé</label>
        <input type="checkbox" :checked="selectedGroup.locked" @change="store.updateItem(selectedGroup.id, { locked: $event.target.checked })" />
      </div>
      <div class="field-row">
        <label>Opacité</label>
        <input type="number" step="5" min="0" max="100"
          :value="Math.round((selectedGroup.opacity ?? 1) * 100)"
          @input="store.updateItem(selectedGroup.id, { opacity: +$event.target.value / 100 })"
        />
        <span class="unit">%</span>
      </div>
    </div>
    <div class="panel-section">
      <div class="panel-section-title">Déplacer le groupe</div>
      <div class="field-row">
        <label>Δ X</label>
        <input type="number" step="0.5" :value="0" @change="store.moveGroupBy(selectedGroup.id, +$event.target.value, 0); $event.target.value = 0" />
        <span class="unit">mm</span>
      </div>
      <div class="field-row">
        <label>Δ Y</label>
        <input type="number" step="0.5" :value="0" @change="store.moveGroupBy(selectedGroup.id, 0, +$event.target.value); $event.target.value = 0" />
        <span class="unit">mm</span>
      </div>
    </div>
  </div>

  <div class="properties-empty" v-else>
    <p>Sélectionnez un élément pour voir ses propriétés.</p>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { useEditorStore } from '@/stores/editor.js'
import { ATOM_PARAM_RULES_KEY, useConfigStore } from '@/stores/config.js'
import { useFontsStore } from '@/stores/fonts.js'
import { usePictosStore } from '@/stores/pictos.js'
import { ATOM_TYPES } from '@/atoms/index.js'
import { PARAM_HELP } from '@/atoms/paramHelp.js'
import { getMapValueOptionsFromRows, resolveMapRows, hasAtomLevelMapRows } from '@/utils/binding.js'
import { parseSlashContext } from '@/utils/richTextRegistry.js'
import GradientStopEditor from './GradientStopEditor.vue'
import MediaPicker from './MediaPicker.vue'
import ColorPickerAlpha from './ColorPickerAlpha.vue'
import RichTextSlashMenu from './RichTextSlashMenu.vue'
import RichTextDocModal from './RichTextDocModal.vue'
import { api } from '@/utils/api.js'

// ── AI config (media types + configured state) ──────────────────────────────
const aiMediaTypes = ref([
  { type: 'illustration', label: 'Illustration' },
  { type: 'icon',         label: 'Icône' },
  { type: 'fond',         label: 'Fond' },
  { type: 'texte_graphique', label: 'Texte graphique' },
])
const aiConfigured = ref(false)

onMounted(async () => {
  try {
    const cfg = await api.getAIConfig()
    if (cfg.media_type_presets?.length) aiMediaTypes.value = cfg.media_type_presets
    aiConfigured.value = cfg.api_key_set && !!cfg.global_prompt
  } catch {}
})

const store = useEditorStore()
const configStore = useConfigStore()
const el = computed(() => {
  if (store.selectedElement) return store.selectedElement
  const item = store.selectedItem
  return item && item.kind !== 'group' ? item : null
})
const selectedGroup = computed(() => {
  const item = store.selectedItem
  return item?.kind === 'group' ? item : null
})
const fontsStore = useFontsStore()
const pictosStore = usePictosStore()

watch(
  () => el.value?.atomType,
  (atomType) => {
    if (atomType === 'picto' || atomType === 'richText') pictosStore.load()
  },
  { immediate: true },
)

// ── RichText slash + doc ────────────────────────────────────────────────────
const rtDocOpen = ref(false)
const rtSlashOpen = ref(false)
const rtSlashContext = ref(null)
const rtSlashAnchor = ref({ top: 0, left: 0 })
const rtTextarea = ref(null)
const rtSlash = ref(null)

function syncSlashFromTextarea(ta) {
  if (!ta) return
  const val = ta.value
  const pos = ta.selectionStart ?? val.length
  const before = val.slice(0, pos)
  const ctx = parseSlashContext(before)
  if (ctx) {
    const wasOpen = rtSlashOpen.value
    rtSlashContext.value = ctx
    rtSlashOpen.value = true
    rtSlashAnchor.value = { top: ta.offsetHeight + 4, left: 8 }
    if (!wasOpen) {
      nextTick(() => rtSlash.value?.focusSearch?.())
    }
  } else {
    closeRtSlash({ restoreFocus: false })
  }
}

function closeRtSlash({ restoreFocus = true } = {}) {
  rtSlashOpen.value = false
  rtSlashContext.value = null
  if (restoreFocus) {
    nextTick(() => {
      const ta = rtTextarea.value
      if (!ta) return
      ta.focus()
    })
  }
}

function onRtInput(e) {
  const ta = e.target
  const val = ta.value
  const pos = ta.selectionStart ?? val.length
  updateParam('content', val)
  nextTick(() => {
    const elTa = rtTextarea.value || ta
    try { elTa.setSelectionRange(pos, pos) } catch { /* ignore */ }
    syncSlashFromTextarea(elTa)
    if (!rtSlashOpen.value) {
      elTa.focus()
    }
  })
}

function onRtKeydown(e) {
  if (rtSlashOpen.value && rtSlash.value?.onKey(e)) return
}

function replaceRtSlash({ start, text, close }) {
  const ta = rtTextarea.value
  if (!ta) return
  const val = el.value?.params?.content || ''
  const pos = ta.selectionStart ?? val.length
  const from = typeof start === 'number' ? start : pos
  const next = val.slice(0, from) + text + val.slice(pos)
  updateParam('content', next)
  const caret = from + text.length
  if (close) {
    rtSlashOpen.value = false
    rtSlashContext.value = null
    nextTick(() => {
      ta.focus()
      ta.setSelectionRange(caret, caret)
    })
    return
  }
  nextTick(() => {
    ta.setSelectionRange(caret, caret)
    syncSlashFromTextarea(ta)
    nextTick(() => rtSlash.value?.focusSearch?.())
  })
}

const pictoRefOptions = computed(() =>
  pictosStore.pictosForTag(el.value?.params?.tag).map((p) => ({
    value: p.picto_ref,
    label: `${p.picto_ref} - ${p.picto_label || '—'}`,
  })),
)

function isPictoParamBinding(value) {
  return typeof value === 'string' && value.includes('{{')
}

const typeLabel = computed(() => {
  if (!el.value) return ''
  if (el.value.type === 'atom' && ATOM_TYPES[el.value.atomType]) {
    return ATOM_TYPES[el.value.atomType].label
  }
  return el.value.type
})

const isGradientAtom = computed(() =>
  el.value?.type === 'atom' &&
  (el.value.atomType === 'backgroundGradientLinear' || el.value.atomType === 'backgroundGradientRadial')
)

// Merge stored params with atom defaults so newly-added default keys always appear
// (même si `params` est null/absent sur l’élément)
const effectiveParams = computed(() => {
  if (!el.value || el.value.type !== 'atom') return {}
  const defaults = ATOM_TYPES[el.value.atomType]?.defaultParams || {}
  return { ...defaults, ...(el.value.params || {}) }
})

const atomParamRules = computed(() => configStore.config?.[ATOM_PARAM_RULES_KEY] || {})

const mapRowsFromAtom = computed(() =>
  hasAtomLevelMapRows(el.value?.atomType, atomParamRules.value)
)

/** Rows pour le select value : priorité Config Atomes, sinon élément */
const mapValueOptions = computed(() => {
  if (!isMapValueSelect('value')) return []
  const rows = resolveMapRows(el.value?.atomType, el.value?.params, atomParamRules.value)
  return getMapValueOptionsFromRows(rows)
})

/** Rows éditables sur l’élément (seulement si pas de catalogue atome) */
const mapRows = computed(() => {
  if (mapRowsFromAtom.value) {
    return resolveMapRows(el.value?.atomType, null, atomParamRules.value)
  }
  const live = el.value?.params?.rows
  if (Array.isArray(live)) return live
  const defaults = ATOM_TYPES[el.value?.atomType]?.defaultParams?.rows
  return Array.isArray(defaults) ? defaults : []
})

function isMapValueSelect(key) {
  if (key !== 'value') return false
  const t = el.value?.atomType
  return t === 'iconMap' || t === 'badge'
}

function update(key, value) {
  store.updateElement(el.value.id, { [key]: value })
}

function updateParam(key, value) {
  const newParams = { ...(el.value.params || {}), [key]: value }
  store.updateElement(el.value.id, { params: newParams })
}

function updateParamJson(key, raw) {
  try {
    const parsed = JSON.parse(raw)
    updateParam(key, parsed)
  } catch { /* ignore invalid JSON */ }
}

function updateMapRow(index, key, value) {
  const rows = [...mapRows.value]
  rows[index] = { ...(rows[index] || {}), [key]: value }
  updateParam('rows', rows)
}

function addMapRow() {
  const blank = el.value?.atomType === 'badge'
    ? { value: '', mediaId: null, label: '', fontSize: null }
    : { value: '', mediaId: null }
  updateParam('rows', [...mapRows.value, blank])
}

function removeMapRow(index) {
  const rows = [...mapRows.value]
  rows.splice(index, 1)
  updateParam('rows', rows)
}

// ── Gestion des overrides par case (CardTrack) ─────────────────────────────
const activeCellOverride = computed(() => {
  if (store.activeCellIdx === null || !el.value) return {}
  return el.value.params?.cellOverrides?.[store.activeCellIdx] ?? {}
})

function setCellProp(prop, value) {
  const overrides = { ...(el.value.params.cellOverrides || {}) }
  const cellData  = { ...(overrides[store.activeCellIdx] || {}) }
  if (value === undefined || value === '') {
    delete cellData[prop]
  } else {
    cellData[prop] = value
  }
  if (Object.keys(cellData).length === 0) {
    delete overrides[store.activeCellIdx]
  } else {
    overrides[store.activeCellIdx] = cellData
  }
  updateParam('cellOverrides', overrides)
}

// ── Gestion des plumes (AtomDrawing) ──────────────────────────────────────
function updatePen(penIdx, prop, value) {
  const pens = [...(el.value.params.pens || [])]
  pens[penIdx] = { ...pens[penIdx], [prop]: value }
  updateParam('pens', pens)
}

function clearCellOverride() {
  const overrides = { ...(el.value.params.cellOverrides || {}) }
  delete overrides[store.activeCellIdx]
  updateParam('cellOverrides', overrides)
  store.activeCellIdx = null
}

function paramLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

function isColorParam(key, value) {
  if (value !== null && typeof value !== 'string') return false
  if (key.toLowerCase().includes('color')) return true
  if (typeof value === 'string') return /^#[0-9a-fA-F]{6,8}$/.test(value)
  return false
}

// Params whose value is always a media ID
const MEDIA_PARAMS = new Set(['mediaId', 'svgMediaId', 'iconMediaId', 'textureMediaId', 'overlayMediaId', 'fallbackMediaId'])
const MULTILINE_PARAMS = new Set(['text', 'description', 'content', 'body', 'notes'])

function isMediaParam(key) {
  return MEDIA_PARAMS.has(key)
}

// Params dont la valeur est toujours un entier → step="1"
const INTEGER_PARAMS = new Set([
  'n_start', 'n_end', 'reverse', 'cells_top', 'cells_left',
  'fontWeight', 'borderRadius', 'cornerTextAngle',
  'value', 'n', 'posX', 'posY',
])

function paramStep(key) {
  if (INTEGER_PARAMS.has(key)) return 1
  if (key === 'fontSize' || key === 'maxFontSize' || key === 'cornerSize') return 0.1
  return 0.5
}

const ENUM_MAPS = {
  // CardTrack enums
  startCorner:     ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'],
  roundMode:       ['round', 'floor', 'ceil'],
  textOrientation: ['parallel', 'perpendicular'],
  cornerTextMode:  ['bisect', 'parallel', 'perpendicular', 'custom'],
  textAlign:       ['left', 'center', 'right', 'justify'],
  align:           ['left', 'center', 'right', 'justify'],
  titleAlign:      ['left', 'center', 'right'],
  textTransform:   ['none', 'uppercase', 'capitalize', 'lowercase'],
  overflow:        ['hidden', 'visible', 'ellipsis'],
  fit:             ['cover', 'contain', 'fill', 'none'],
  layout:          ['horizontal', 'vertical', 'grid'],
  borderStyle:     ['solid', 'dashed', 'dotted'],
  style:           ['solid', 'dashed', 'dotted'],
  fontFamily:      ['Outfit', 'JetBrains Mono', 'serif', 'sans-serif'],
  resourceType:    ['pieces', 'essence', 'pierre', 'mithril', 'cristaux', 'fragment'],
  cardType:        ['equipement', 'classe', 'quete', 'bricabrac', 'cestpasjuste', 'buff', 'faveur', 'epopee'],
  // Background enums
  blendMode:       ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-burn', 'color-dodge'],
  shape:           ['ellipse', 'circle'],
  direction:       ['horizontal', 'vertical'],
  stat:            ['FOR', 'DEX', 'INI', 'CHA', 'MAG', 'DEV', 'VIE'],
  svgPosition:     ['front', 'behind'],
  tier:            ['fin', 'basic', 'rare', 'epic', 'mythique', 'legendaire'],
  view:            ['icon', 'horizontal', 'vertical', 'horizontal-inverse', 'vertical-inverse', 'text'],
  cornerShape:     ['none', 'star4', 'star5', 'circle', 'square', 'triangle'],
}

function getEnumOptions(key) {
  if (key === 'fontFamily') {
    return [...ENUM_MAPS.fontFamily, ...fontsStore.familyNames]
  }
  return ENUM_MAPS[key] || null
}

function atomParamRule(paramKey) {
  if (!el.value || el.value.type !== 'atom') return { hidden: false, fixedEnabled: false }
  const allRules = configStore.config?.[ATOM_PARAM_RULES_KEY] || {}
  const atomRules = allRules[el.value.atomType] || {}
  return atomRules[paramKey] || { hidden: false, fixedEnabled: false }
}

function isParamHidden(paramKey) {
  return !!atomParamRule(paramKey).hidden
}

function isParamFixed(paramKey) {
  const rule = atomParamRule(paramKey)
  return !!(rule.fixedEnabled && Object.prototype.hasOwnProperty.call(rule || {}, 'fixedValue'))
}
</script>

<style scoped>
.properties-panel {
  font-size: 11px;
}

.pos-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.pos-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pos-field label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  width: 14px;
  flex-shrink: 0;
}

.pos-field input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 3px 4px;
}

.unit {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.color-input {
  width: 28px;
  height: 24px;
  padding: 1px;
  border: 1px solid var(--border-default);
  cursor: pointer;
  flex-shrink: 0;
}

.color-text {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 10px;
}

.json-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent-info);
}

.param-block {
  margin-bottom: 6px;
}

.param-header {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 2px;
}

.param-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary, #a0a8c0);
  text-transform: none;
}

.param-help {
  font-size: 9px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.3;
  white-space: normal;
}

.ct-hint {
  color: var(--text-muted);
  font-size: 10px;
  font-style: italic;
  padding: 4px 0;
}

.clear-btn {
  margin-left: auto;
  background: none;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 6px;
}
.clear-btn:hover { color: #ef4444; border-color: #ef4444; }

.map-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.map-row-value {
  flex: 1;
  min-width: 0;
}
.map-row-fontsize {
  width: 44px;
  flex-shrink: 0;
  font-size: 10px;
}
.map-row-media {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}
.map-row-media-id {
  width: 72px;
  font-family: var(--font-mono);
  font-size: 10px;
}
.map-row-remove {
  background: none;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 10px;
  padding: 2px 6px;
}
.map-row-remove:hover { color: #ef4444; border-color: #ef4444; }
.map-row--badge .map-row-value {
  flex: 1;
}

.properties-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}

.pen-editor {
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 6px 8px;
  margin-bottom: 6px;
  background: var(--bg-primary);
}

.pen-editor-header {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
}

.pen-editor-idx {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary, #6c7aff);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pen-editor-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 3px;
  font-size: 10px;
  color: var(--text-secondary);
}

.pen-editor-row label {
  width: 52px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 9px;
}

.rt-syntax-hint {
  font-size: 9px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  line-height: 1.6;
  padding: 4px 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  margin-bottom: 6px;
}

.rt-textarea {
  width: 100%;
  resize: vertical;
  font-size: 11px;
  font-family: var(--font-mono);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 5px 7px;
  border-radius: var(--radius-sm);
  line-height: 1.5;
}

.rt-editor-wrap {
  position: relative;
}

.ai-warning {
  font-size: 9px;
  color: #ca8a04;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 3px;
  padding: 3px 6px;
  line-height: 1.4;
}
.ai-warning-link { color: inherit; font-weight: 600; text-decoration: underline; }
</style>
