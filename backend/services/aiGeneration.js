/**
 * TSD-012 — AI Generation Service
 * Prompt construction, OpenAI Images API (gpt-image-1 / DALL-E 3), save + resolve.
 */
import { createHash, randomUUID } from 'crypto'
import { parseJsonColumn } from '../db/sqlDialect.js'
import { insertMediaRecord } from './mediaStorage.js'

const DALLE3_SIZES = new Set(['1024x1024', '1024x1792', '1792x1024'])
const GPT_IMAGE_SIZES = new Set(['1024x1024', '1536x1024', '1024x1536'])

export function interpolateTemplate(template, data) {
  if (!template) return ''
  return String(template).replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const t = path.trim()
    return data && t in data ? data[t] : match
  })
}

export function imageNameFromBindingPath(bindingPath) {
  const parts = String(bindingPath || '').split('.').filter(Boolean)
  if (parts[parts.length - 1] === 'mediaId') parts.pop()
  return parts[parts.length - 1] || ''
}

export function findImageElement(layers, nameInLayout) {
  if (!nameInLayout) return null
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

export function resolveOpenAIModel(providerOrModel) {
  const id = String(providerOrModel || 'openai').trim()
  if (id === 'dalle3' || id === 'dall-e-3' || id === 'openai-dalle3') return 'dall-e-3'
  if (id === 'gpt-image-1.5' || id === 'gpt-image-2' || id === 'gpt-image-1' || id === 'dall-e-3') return id
  return 'gpt-image-1'
}

export function mapSizeForModel(model, resolution) {
  const size = String(resolution || '1024x1024')
  if (model === 'dall-e-3') {
    if (DALLE3_SIZES.has(size)) return size
    if (size === '1024x512' || size.startsWith('1792')) return '1792x1024'
    if (size.startsWith('1024x') && size !== '1024x1024') return '1024x1792'
    return '1024x1024'
  }
  if (GPT_IMAGE_SIZES.has(size)) return size
  if (size === '1024x1792' || size === '1024x512') return '1024x1536'
  if (size === '1792x1024') return '1536x1024'
  return '1024x1024'
}

export function buildOpenAIImageBody({ model, prompt, size, stylePreset }) {
  const body = {
    model,
    prompt,
    n: 1,
    size,
  }
  if (model === 'dall-e-3') {
    body.style = stylePreset === 'natural' ? 'natural' : 'vivid'
    body.response_format = 'b64_json'
  }
  return body
}

export async function bufferFromOpenAIImage(payload, fetchImpl = fetch) {
  const item = payload?.data?.[0]
  if (!item) throw new Error('Réponse OpenAI sans image')
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64')
  if (item.url) {
    const imgRes = await fetchImpl(item.url)
    if (!imgRes.ok) throw new Error('Téléchargement de l\'image OpenAI échoué')
    return Buffer.from(await imgRes.arrayBuffer())
  }
  throw new Error('Réponse OpenAI sans url ni b64_json')
}

export async function buildPrompt(entry, db) {
  const instance = await db.prepare('SELECT * FROM card_instances WHERE id = ?').get(entry.card_instance_id)
  if (!instance) throw new Error('Card instance not found')
  const data = parseJsonColumn(instance.data || '{}')

  const layout = await db.prepare('SELECT * FROM layouts WHERE id = ?').get(instance.layout_id)
  if (!layout) throw new Error('Layout not found')
  const def = parseJsonColumn(layout.definition || '{}')

  const nameInLayout = imageNameFromBindingPath(entry.binding_path)
  const element = findImageElement(def.layers || [], nameInLayout)
  const template = element?.params?.ai_prompt_template || ''

  const config = await db.prepare("SELECT * FROM ai_generation_config WHERE id = 'singleton'").get()
  const globalPrompt = config?.global_prompt || ''

  const interpolated = template ? interpolateTemplate(template, data) : ''
  const parts = [globalPrompt, interpolated].filter((s) => String(s).trim())

  return {
    prompt: parts.join('\n\n'),
    template,
    globalPrompt,
    hasTemplate: !!template,
    mediaType: element?.params?.ai_media_type || entry.media_type || 'illustration',
  }
}

export function resolveApiKey(config) {
  const fromDb = String(config?.api_key || '').trim()
  if (fromDb) return fromDb
  return String(process.env.OPENAI_API_KEY || '').trim()
}

/**
 * Call OpenAI Images API. Default model: gpt-image-1 (b64).
 * DALL-E 3 still supported (b64_json + style).
 */
export async function callProvider(provider, apiKey, prompt, resolution, stylePreset, options = {}) {
  const id = String(provider || 'openai')
  if (id === 'stability' || id === 'fal') {
    throw new Error(`Provider '${id}' not yet implemented — choisissez OpenAI`)
  }
  return callOpenAI(apiKey, prompt, resolution, stylePreset, {
    ...options,
    model: options.model || resolveOpenAIModel(id),
  })
}

export async function callOpenAI(apiKey, prompt, resolution, stylePreset, options = {}) {
  const fetchImpl = options.fetchImpl || fetch
  const model = resolveOpenAIModel(options.model || 'gpt-image-1')
  const size = mapSizeForModel(model, resolution)
  const body = buildOpenAIImageBody({ model, prompt, size, stylePreset })

  const res = await fetchImpl('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message || `OpenAI error ${res.status}`
    if (res.status === 429) throw new Error(`Quota / rate-limit OpenAI : ${msg}`)
    throw new Error(msg)
  }

  const data = await res.json()
  return bufferFromOpenAIImage(data, fetchImpl)
}

export async function saveGeneratedImage(buffer, label, db) {
  const sha1 = createHash('sha1').update(buffer).digest('hex')
  const filename = `${sha1}.png`

  const existing = await db.prepare('SELECT id FROM media WHERE id = ?').get(filename)
  if (!existing) {
    await insertMediaRecord(db, {
      id: filename,
      filename,
      original_name: `${label}_ai_generated.png`,
      mime_type: 'image/png',
      folder_id: 'default',
      buffer,
    })
  }

  return filename
}

export async function generateOne(entryId, db, options = {}) {
  const entry = await db.prepare('SELECT * FROM missing_media WHERE id = ?').get(entryId)
  if (!entry) throw new Error('Entry not found')
  if (entry.status === 'resolved') return

  const config = await db.prepare("SELECT * FROM ai_generation_config WHERE id = 'singleton'").get()
  const apiKey = resolveApiKey(config)
  if (!apiKey) {
    await db.prepare("UPDATE missing_media SET status='error', error_message=? WHERE id=?")
      .run('Clé API non configurée — Config > IA, ou variable OPENAI_API_KEY', entryId)
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

  const presetsRaw = config?.media_type_presets
  const presets = Array.isArray(presetsRaw)
    ? presetsRaw
    : parseJsonColumn(config?.media_type_presets || '[]')
  const mediaType = promptData.mediaType || entry.media_type
  const preset = presets.find((p) => p.type === mediaType) || presets[0] || {}
  const provider = preset.provider || config?.provider || 'openai'
  const resolution = preset.resolution || '1024x1024'
  const stylePreset = preset.style_preset || 'vivid'
  const model = preset.model || resolveOpenAIModel(provider)

  await db.prepare("UPDATE missing_media SET status='generating', generation_prompt=? WHERE id=?")
    .run(promptData.prompt, entryId)

  try {
    const buffer = await callProvider(provider, apiKey, promptData.prompt, resolution, stylePreset, {
      model,
      fetchImpl: options.fetchImpl,
    })

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
