/**
 * TSD-012 — AI Generation Service
 * Handles prompt construction, OpenAI call, image download/save, DB resolution.
 */
import { createHash, randomUUID } from 'crypto'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
export function buildPrompt(entry, db) {
  const instance = db.prepare('SELECT * FROM card_instances WHERE id = ?').get(entry.card_instance_id)
  if (!instance) throw new Error('Card instance not found')
  const data = JSON.parse(instance.data || '{}')

  const layout = db.prepare('SELECT * FROM layouts WHERE id = ?').get(instance.layout_id)
  if (!layout) throw new Error('Layout not found')
  const def = JSON.parse(layout.definition || '{}')

  // nameInLayout is the prefix of binding_path (e.g. "card_illustration" from "card_illustration.mediaId")
  const nameInLayout = entry.binding_path.split('.')[0]
  const element = findImageElement(def.layers || [], nameInLayout)
  const template = element?.params?.ai_prompt_template || ''

  const config = db.prepare("SELECT * FROM ai_generation_config WHERE id = 'singleton'").get()
  const globalPrompt = config?.global_prompt || ''

  const interpolated = template ? interpolateTemplate(template, data) : ''
  const parts = [globalPrompt, interpolated].filter(s => s.trim())

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

  // Download the generated image from OpenAI's CDN
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error('Failed to download generated image from OpenAI')
  return Buffer.from(await imgRes.arrayBuffer())
}

// ── Image save → media record ────────────────────────────────────────────────

/**
 * Save buffer to uploads dir, create media record in DB.
 * Returns the media id (= filename, sha1-based, compatible with params.mediaId).
 */
export function saveGeneratedImage(buffer, label, db) {
  const sha1 = createHash('sha1').update(buffer).digest('hex')
  const filename = `${sha1}.png`
  const filepath = join(UPLOADS_DIR, filename)

  if (!existsSync(filepath)) {
    writeFileSync(filepath, buffer)
  }

  // id = filename so /uploads/${mediaId} works in atoms
  const existing = db.prepare('SELECT id FROM media WHERE id = ?').get(filename)
  if (!existing) {
    db.prepare(
      'INSERT OR IGNORE INTO media (id, filename, original_name, mime_type, folder_id) VALUES (?, ?, ?, ?, ?)'
    ).run(filename, filename, `${label}_ai_generated.png`, 'image/png', 'default')
  }

  return filename // = media.id
}

// ── Full generation pipeline ─────────────────────────────────────────────────

/**
 * Run generation for one missing_media entry (async, resolves/rejects).
 * Updates DB status throughout.
 */
export async function generateOne(entryId, db) {
  const entry = db.prepare('SELECT * FROM missing_media WHERE id = ?').get(entryId)
  if (!entry) throw new Error('Entry not found')
  if (entry.status === 'resolved') return // already done

  // Get AI config
  const config = db.prepare("SELECT * FROM ai_generation_config WHERE id = 'singleton'").get()
  if (!config?.api_key) {
    db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?")
      .run('Clé API non configurée — rendez-vous dans Config > IA Provider', entryId)
    throw new Error('API key not configured')
  }

  // Build prompt
  let promptData
  try {
    promptData = buildPrompt(entry, db)
  } catch (e) {
    db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?").run(e.message, entryId)
    throw e
  }

  if (!promptData.prompt.trim()) {
    db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?")
      .run('Prompt vide — configurez ai_prompt_template sur l\'élément image dans le layout', entryId)
    throw new Error('Empty prompt')
  }

  // Get preset for media type
  const presets = JSON.parse(config.media_type_presets || '[]')
  const preset = presets.find(p => p.type === entry.media_type) || presets[0] || {}
  const provider = preset.provider || config.provider || 'openai'
  const resolution = preset.resolution || '1024x1024'
  const stylePreset = preset.style_preset || 'vivid'

  // Mark as generating
  db.prepare("UPDATE missing_media SET status='generating', generation_prompt=? WHERE id=?")
    .run(promptData.prompt, entryId)

  try {
    let buffer
    if (provider === 'openai') {
      buffer = await callOpenAI(config.api_key, promptData.prompt, resolution, stylePreset)
    } else {
      throw new Error(`Provider '${provider}' not yet implemented`)
    }

    // Save image and create media record
    const instance = db.prepare('SELECT name FROM card_instances WHERE id = ?').get(entry.card_instance_id)
    const label = instance?.name || 'generated'
    const mediaId = saveGeneratedImage(buffer, label, db)

    // Resolve the entry
    db.prepare(`UPDATE missing_media SET
      status='resolved', resolved_media_id=?, resolved_at=datetime('now'), error_message=NULL
      WHERE id=?`).run(mediaId, entryId)

    // Update the card instance data so the atom displays the new image
    const cardInstance = db.prepare('SELECT * FROM card_instances WHERE id = ?').get(entry.card_instance_id)
    if (cardInstance) {
      const data = JSON.parse(cardInstance.data || '{}')
      data[entry.binding_path] = mediaId
      db.prepare("UPDATE card_instances SET data=?, updated_at=datetime('now') WHERE id=?")
        .run(JSON.stringify(data), entry.card_instance_id)
    }

    return mediaId
  } catch (e) {
    db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?")
      .run(e.message, entryId)
    throw e
  }
}
