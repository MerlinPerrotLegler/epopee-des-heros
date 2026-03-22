/**
 * TSD-012 — AI Generation Service
 * Handles prompt construction, OpenAI call, image download/save, DB resolution.
 */
import { createHash, randomUUID } from 'crypto'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { insertOrIgnoreInto, parseJsonColumn } from '../db/sqlDialect.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = join(__dirname, '..', 'data', 'uploads')

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

// ── Prompt construction ──────────────────────────────────────────────────────

/**
 * Interpolate {{path}} tokens against flat card data.
 */
function interpolateTemplate(template, data) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const t = path.trim()
    return t in data ? data[t] : match
  })
}

/**
 * Find an image atom element in the layout definition by nameInLayout.
 */
function findImageElement(layers, nameInLayout) {
  for (const item of layers || []) {
    if (item.kind === 'group') {
      const found = findImageElement(item.children || [], nameInLayout)
      if (found) return found
    } else if (item.nameInLayout === nameInLayout && item.type === 'atom' && item.atomType === 'image') {
      return item
    }
  }
  return null
}

/**
 * Build the final prompt for a missing_media entry.
 * Returns { prompt, template, globalPrompt } or throws.
 */
export async function buildPrompt(entry, db) {
  const instance = await db.prepare('SELECT * FROM card_instances WHERE id = ?').get(entry.card_instance_id)
  if (!instance) throw new Error('Card instance not found')
  const data = parseJsonColumn(instance.data || '{}')

  const layout = await db.prepare('SELECT * FROM layouts WHERE id = ?').get(instance.layout_id)
  if (!layout) throw new Error('Layout not found')
  const def = parseJsonColumn(layout.definition || '{}')

  const nameInLayout = entry.binding_path.split('.')[0]
  const element = findImageElement(def.layers || [], nameInLayout)
  const template = element?.params?.ai_prompt_template || ''

  const config = await db.prepare("SELECT * FROM ai_generation_config WHERE id = 'singleton'").get()
  const globalPrompt = config?.global_prompt || ''

  const interpolated = template ? interpolateTemplate(template, data) : ''
  const parts = [globalPrompt, interpolated].filter((s) => s.trim())

  return {
    prompt: parts.join('\n\n'),
    template,
    globalPrompt,
    hasTemplate: !!template,
  }
}

// ── OpenAI DALL-E 3 call ─────────────────────────────────────────────────────

export async function callOpenAI(apiKey, prompt, resolution, stylePreset) {
  const validSizes = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']
  const size = validSizes.includes(resolution) ? resolution : '1024x1024'

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size,
      style: stylePreset || 'vivid',
      n: 1,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI error ${res.status}`)
  }

  const data = await res.json()
  const imageUrl = data.data[0].url

  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error('Failed to download generated image from OpenAI')
  return Buffer.from(await imgRes.arrayBuffer())
}

// ── Image save → media record ────────────────────────────────────────────────

/**
 * Save buffer to uploads dir, create media record in DB.
 * Returns the media id (= filename, sha1-based, compatible with params.mediaId).
 */
export async function saveGeneratedImage(buffer, label, db) {
  const sha1 = createHash('sha1').update(buffer).digest('hex')
  const filename = `${sha1}.png`
  const filepath = join(UPLOADS_DIR, filename)

  if (!existsSync(filepath)) {
    writeFileSync(filepath, buffer)
  }

  const existing = await db.prepare('SELECT id FROM media WHERE id = ?').get(filename)
  if (!existing) {
    const sql = `${insertOrIgnoreInto()} media (id, filename, original_name, mime_type, folder_id) VALUES (?, ?, ?, ?, ?)`
    await db.prepare(sql).run(filename, filename, `${label}_ai_generated.png`, 'image/png', 'default')
  }

  return filename // = media.id
}

// ── Full generation pipeline ─────────────────────────────────────────────────

/**
 * Run generation for one missing_media entry (async, resolves/rejects).
 * Updates DB status throughout.
 */
export async function generateOne(entryId, db) {
  const entry = await db.prepare('SELECT * FROM missing_media WHERE id = ?').get(entryId)
  if (!entry) throw new Error('Entry not found')
  if (entry.status === 'resolved') return // already done

  const config = await db.prepare("SELECT * FROM ai_generation_config WHERE id = 'singleton'").get()
  if (!config?.api_key) {
    await db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?")
      .run('Clé API non configurée — rendez-vous dans Config > IA Provider', entryId)
    throw new Error('API key not configured')
  }

  let promptData
  try {
    promptData = await buildPrompt(entry, db)
  } catch (e) {
    await db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?").run(e.message, entryId)
    throw e
  }

  if (!promptData.prompt.trim()) {
    await db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?")
      .run('Prompt vide — configurez ai_prompt_template sur l\'élément image dans le layout', entryId)
    throw new Error('Empty prompt')
  }

  const presetsRaw = config.media_type_presets
  const presets = Array.isArray(presetsRaw)
    ? presetsRaw
    : parseJsonColumn(config.media_type_presets || '[]')
  const preset = presets.find((p) => p.type === entry.media_type) || presets[0] || {}
  const provider = preset.provider || config.provider || 'openai'
  const resolution = preset.resolution || '1024x1024'
  const stylePreset = preset.style_preset || 'vivid'

  await db.prepare("UPDATE missing_media SET status='generating', generation_prompt=? WHERE id=?")
    .run(promptData.prompt, entryId)

  try {
    let buffer
    if (provider === 'openai') {
      buffer = await callOpenAI(config.api_key, promptData.prompt, resolution, stylePreset)
    } else {
      throw new Error(`Provider '${provider}' not yet implemented`)
    }

    const instance = await db.prepare('SELECT name FROM card_instances WHERE id = ?').get(entry.card_instance_id)
    const label = instance?.name || 'generated'
    const mediaId = await saveGeneratedImage(buffer, label, db)

    await db.prepare(`UPDATE missing_media SET
      status='resolved', resolved_media_id=?, resolved_at=CURRENT_TIMESTAMP, error_message=NULL
      WHERE id=?`).run(mediaId, entryId)

    const cardInstance = await db.prepare('SELECT * FROM card_instances WHERE id = ?').get(entry.card_instance_id)
    if (cardInstance) {
      const data = parseJsonColumn(cardInstance.data || '{}')
      data[entry.binding_path] = mediaId
      await db.prepare('UPDATE card_instances SET data=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(JSON.stringify(data), entry.card_instance_id)
    }

    return mediaId
  } catch (e) {
    await db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?")
      .run(e.message, entryId)
    throw e
  }
}
