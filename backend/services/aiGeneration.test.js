import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, it } from 'node:test'
import {
  interpolateTemplate,
  imageNameFromBindingPath,
  findImageElement,
  mapSizeForModel,
  bufferFromOpenAIImage,
  buildOpenAIImageBody,
  resolveOpenAIModel,
  callOpenAI,
  callProvider,
  resolveApiKey,
  buildPrompt,
  generateOne,
} from './aiGeneration.js'

describe('interpolateTemplate', () => {
  it('replaces binding tokens from flat data', () => {
    const out = interpolateTemplate(
      'Portrait de {{card_name.text}}, type {{type}}',
      { 'card_name.text': 'Épée de feu', type: 'équipement' },
    )
    assert.equal(out, 'Portrait de Épée de feu, type équipement')
  })

  it('keeps unknown tokens', () => {
    assert.equal(interpolateTemplate('{{missing}}', {}), '{{missing}}')
  })

  it('trims token names and treats empty template as empty string', () => {
    assert.equal(interpolateTemplate('  {{ card_name.text }}  ', { 'card_name.text': 'Épée' }), '  Épée  ')
    assert.equal(interpolateTemplate('', { a: '1' }), '')
    assert.equal(interpolateTemplate(null, { a: '1' }), '')
  })
})

describe('imageNameFromBindingPath', () => {
  it('uses the segment before mediaId', () => {
    assert.equal(imageNameFromBindingPath('illustration.mediaId'), 'illustration')
    assert.equal(imageNameFromBindingPath('header.icon.mediaId'), 'icon')
  })

  it('handles empty, bare mediaId and a single segment', () => {
    assert.equal(imageNameFromBindingPath(''), '')
    assert.equal(imageNameFromBindingPath('mediaId'), '')
    assert.equal(imageNameFromBindingPath('art'), 'art')
  })
})

describe('findImageElement', () => {
  it('finds an image atom by nameInLayout inside groups', () => {
    const layers = [{
      kind: 'group',
      children: [
        { type: 'atom', atomType: 'image', nameInLayout: 'icon', params: { ai_prompt_template: 'un picto' } },
      ],
    }]
    const el = findImageElement(layers, 'icon')
    assert.equal(el.params.ai_prompt_template, 'un picto')
  })

  it('returns null when the name is missing or not an image atom', () => {
    const layers = [{ type: 'atom', atomType: 'title', nameInLayout: 'icon' }]
    assert.equal(findImageElement(layers, 'icon'), null)
    assert.equal(findImageElement(layers, ''), null)
    assert.equal(findImageElement([], 'icon'), null)
  })
})

describe('mapSizeForModel', () => {
  it('maps tiny sizes to 1024x1024 for dall-e-3', () => {
    assert.equal(mapSizeForModel('dall-e-3', '512x512'), '1024x1024')
    assert.equal(mapSizeForModel('dall-e-3', '256x256'), '1024x1024')
    assert.equal(mapSizeForModel('dall-e-3', '1024x1792'), '1024x1792')
    assert.equal(mapSizeForModel('dall-e-3', '1792x1024'), '1792x1024')
  })

  it('maps portrait/landscape to gpt-image sizes', () => {
    assert.equal(mapSizeForModel('gpt-image-1', '1024x1792'), '1024x1536')
    assert.equal(mapSizeForModel('gpt-image-1', '1792x1024'), '1536x1024')
    assert.equal(mapSizeForModel('gpt-image-1', '1024x1024'), '1024x1024')
    assert.equal(mapSizeForModel('gpt-image-1', '512x512'), '1024x1024')
    assert.equal(mapSizeForModel('gpt-image-1', '1024x512'), '1024x1536')
  })
})

describe('resolveOpenAIModel', () => {
  it('maps provider aliases to API model ids', () => {
    assert.equal(resolveOpenAIModel('openai'), 'gpt-image-1')
    assert.equal(resolveOpenAIModel('dalle3'), 'dall-e-3')
    assert.equal(resolveOpenAIModel('openai-dalle3'), 'dall-e-3')
    assert.equal(resolveOpenAIModel('gpt-image-1.5'), 'gpt-image-1.5')
    assert.equal(resolveOpenAIModel('gpt-image-2'), 'gpt-image-2')
    assert.equal(resolveOpenAIModel(''), 'gpt-image-1')
  })
})

describe('buildOpenAIImageBody', () => {
  it('uses b64_json and style for dall-e-3', () => {
    const body = buildOpenAIImageBody({
      model: 'dall-e-3',
      prompt: 'heroic sword',
      size: '1024x1024',
      stylePreset: 'natural',
    })
    assert.equal(body.model, 'dall-e-3')
    assert.equal(body.response_format, 'b64_json')
    assert.equal(body.style, 'natural')
    assert.equal(body.n, 1)
  })

  it('omits style for gpt-image-1', () => {
    const body = buildOpenAIImageBody({
      model: 'gpt-image-1',
      prompt: 'heroic sword',
      size: '1024x1024',
      stylePreset: 'vivid',
    })
    assert.equal(body.model, 'gpt-image-1')
    assert.equal(body.style, undefined)
    assert.equal(body.response_format, undefined)
  })
})

describe('bufferFromOpenAIImage', () => {
  it('decodes b64_json', async () => {
    const buf = await bufferFromOpenAIImage({ data: [{ b64_json: Buffer.from('PNGDATA').toString('base64') }] })
    assert.equal(buf.toString(), 'PNGDATA')
  })

  it('downloads url when b64 is absent', async () => {
    const fetchImpl = async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    })
    const buf = await bufferFromOpenAIImage(
      { data: [{ url: 'https://example.com/img.png' }] },
      fetchImpl,
    )
    assert.deepEqual([...buf], [1, 2, 3])
  })

  it('throws when the payload has no image payload', async () => {
    await assert.rejects(() => bufferFromOpenAIImage({ data: [] }), /sans image/)
    await assert.rejects(() => bufferFromOpenAIImage({ data: [{}] }), /sans url ni b64_json/)
  })

  it('throws when the download URL fails', async () => {
    await assert.rejects(
      () => bufferFromOpenAIImage({ data: [{ url: 'https://example.com/x.png' }] }, async () => ({ ok: false })),
      /Téléchargement/,
    )
  })
})

describe('callOpenAI', () => {
  it('posts gpt-image-1 body and decodes b64_json', async () => {
    let captured
    const fetchImpl = async (url, init) => {
      captured = { url, init }
      return {
        ok: true,
        json: async () => ({ data: [{ b64_json: Buffer.from('IMG').toString('base64') }] }),
      }
    }
    const buf = await callOpenAI('sk-test', 'a sword', '512x512', 'vivid', {
      model: 'gpt-image-1',
      fetchImpl,
    })
    assert.equal(captured.url, 'https://api.openai.com/v1/images/generations')
    assert.equal(captured.init.headers.Authorization, 'Bearer sk-test')
    const body = JSON.parse(captured.init.body)
    assert.equal(body.model, 'gpt-image-1')
    assert.equal(body.size, '1024x1024')
    assert.equal(body.prompt, 'a sword')
    assert.equal(buf.toString(), 'IMG')
  })

  it('maps dalle3 sizes and sets style + b64_json', async () => {
    let body
    const fetchImpl = async (_url, init) => {
      body = JSON.parse(init.body)
      return {
        ok: true,
        json: async () => ({ data: [{ b64_json: Buffer.from('D3').toString('base64') }] }),
      }
    }
    await callOpenAI('sk-test', 'portrait', '512x512', 'natural', { model: 'dall-e-3', fetchImpl })
    assert.equal(body.model, 'dall-e-3')
    assert.equal(body.size, '1024x1024')
    assert.equal(body.style, 'natural')
    assert.equal(body.response_format, 'b64_json')
  })

  it('surfaces 429 as a quota error', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate limited' } }),
    })
    await assert.rejects(
      () => callOpenAI('sk-test', 'x', '1024x1024', 'vivid', { fetchImpl }),
      /Quota \/ rate-limit OpenAI/,
    )
  })

  it('surfaces other API errors', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'invalid size' } }),
    })
    await assert.rejects(
      () => callOpenAI('sk-test', 'x', '1024x1024', 'vivid', { fetchImpl }),
      /invalid size/,
    )
  })
})

describe('callProvider', () => {
  it('rejects stability and fal', async () => {
    await assert.rejects(() => callProvider('stability', 'k', 'p', '1024x1024', 'vivid'), /not yet implemented/)
    await assert.rejects(() => callProvider('fal', 'k', 'p', '1024x1024', 'vivid'), /not yet implemented/)
  })
})

function createFakeDb(state) {
  state.media ||= {}
  return {
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim()
      return {
        async get(...params) {
          if (/FROM missing_media/.test(normalized)) return state.missingMedia[params[0]] || null
          if (/SELECT name FROM card_instances/.test(normalized)) {
            const row = state.cardInstances[params[0]]
            return row ? { name: row.name } : null
          }
          if (/FROM card_instances/.test(normalized)) return state.cardInstances[params[0]] || null
          if (/FROM layouts/.test(normalized)) return state.layouts[params[0]] || null
          if (/ai_generation_config/.test(normalized)) return state.config || null
          if (/FROM media/.test(normalized)) return state.media[params[0]] || null
          return null
        },
        async run(...params) {
          if (/status='error'/.test(normalized)) {
            const id = params.at(-1)
            Object.assign(state.missingMedia[id] || (state.missingMedia[id] = { id }), {
              status: 'error',
              error_message: params[0],
            })
          } else if (/status='generating'/.test(normalized)) {
            Object.assign(state.missingMedia[params[1]] || {}, {
              status: 'generating',
              generation_prompt: params[0],
            })
          } else if (/status='resolved'/.test(normalized)) {
            Object.assign(state.missingMedia[params.at(-1)] || {}, {
              status: 'resolved',
              resolved_media_id: params[0],
              error_message: null,
            })
          } else if (/UPDATE card_instances SET data/.test(normalized)) {
            if (state.cardInstances[params[1]]) state.cardInstances[params[1]].data = params[0]
          } else if (/INTO media/.test(normalized)) {
            state.media[params[0]] = { id: params[0], filename: params[1] }
          }
        },
      }
    },
  }
}

function pipelineState(extra = {}) {
  return {
    missingMedia: {
      mm1: {
        id: 'mm1',
        card_instance_id: 'card1',
        binding_path: 'art.mediaId',
        media_type: 'illustration',
        status: 'pending',
      },
    },
    cardInstances: {
      card1: {
        id: 'card1',
        layout_id: 'lay1',
        name: 'Épée',
        data: JSON.stringify({ 'art.mediaId': 'missing-art', 'card_name.text': 'Épée' }),
      },
    },
    layouts: {
      lay1: {
        id: 'lay1',
        definition: JSON.stringify({
          layers: [{
            type: 'atom',
            atomType: 'image',
            nameInLayout: 'art',
            params: {
              ai_prompt_template: 'Portrait de {{card_name.text}}',
              ai_media_type: 'illustration',
            },
          }],
        }),
      },
    },
    config: {
      api_key: 'sk-test',
      global_prompt: 'style fantasy',
      provider: 'openai',
      media_type_presets: [{
        type: 'illustration',
        resolution: '1024x1024',
        style_preset: 'vivid',
        provider: 'openai',
        model: 'gpt-image-1',
      }],
    },
    media: {},
    ...extra,
  }
}

function pngFetchImpl(bytes = 'PNG') {
  return async () => ({
    ok: true,
    json: async () => ({ data: [{ b64_json: Buffer.from(bytes).toString('base64') }] }),
  })
}

describe('resolveApiKey', () => {
  let previous

  beforeEach(() => {
    previous = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    if (previous === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previous
  })

  it('prefers the DB key over the environment', () => {
    process.env.OPENAI_API_KEY = 'sk-env'
    assert.equal(resolveApiKey({ api_key: 'sk-db' }), 'sk-db')
  })

  it('falls back to OPENAI_API_KEY', () => {
    process.env.OPENAI_API_KEY = 'sk-env'
    assert.equal(resolveApiKey({ api_key: '  ' }), 'sk-env')
    assert.equal(resolveApiKey(null), 'sk-env')
  })
})

describe('buildPrompt', () => {
  it('joins global prompt and interpolated template', async () => {
    const state = pipelineState()
    const out = await buildPrompt(state.missingMedia.mm1, createFakeDb(state))
    assert.equal(out.hasTemplate, true)
    assert.equal(out.mediaType, 'illustration')
    assert.equal(out.prompt, 'style fantasy\n\nPortrait de Épée')
  })

  it('throws when the card instance is missing', async () => {
    const state = pipelineState({ cardInstances: {} })
    await assert.rejects(
      () => buildPrompt(state.missingMedia.mm1, createFakeDb(state)),
      /Card instance not found/,
    )
  })
})

describe('generateOne', () => {
  let previousKey

  beforeEach(() => {
    previousKey = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previousKey
  })

  it('skips already resolved entries', async () => {
    const state = pipelineState()
    state.missingMedia.mm1.status = 'resolved'
    const mediaId = await generateOne('mm1', createFakeDb(state), {
      fetchImpl: async () => { throw new Error('should not call OpenAI') },
    })
    assert.equal(mediaId, undefined)
    assert.equal(state.missingMedia.mm1.status, 'resolved')
  })

  it('records an error when the API key is missing', async () => {
    const state = pipelineState()
    state.config.api_key = ''
    await assert.rejects(() => generateOne('mm1', createFakeDb(state)), /API key not configured/)
    assert.equal(state.missingMedia.mm1.status, 'error')
    assert.match(state.missingMedia.mm1.error_message, /Clé API non configurée/)
  })

  it('records an error when the prompt is empty', async () => {
    const state = pipelineState()
    state.config.global_prompt = ''
    state.layouts.lay1.definition = JSON.stringify({
      layers: [{ type: 'atom', atomType: 'image', nameInLayout: 'art', params: {} }],
    })
    await assert.rejects(() => generateOne('mm1', createFakeDb(state)), /Empty prompt/)
    assert.equal(state.missingMedia.mm1.status, 'error')
    assert.match(state.missingMedia.mm1.error_message, /Prompt vide/)
  })

  it('saves the image, resolves the entry and writes the mediaId', async () => {
    const state = pipelineState()
    const png = 'PNG'
    const mediaId = await generateOne('mm1', createFakeDb(state), { fetchImpl: pngFetchImpl(png) })
    const expected = `${createHash('sha1').update(png).digest('hex')}.png`
    assert.equal(mediaId, expected)
    assert.equal(state.missingMedia.mm1.status, 'resolved')
    assert.equal(state.missingMedia.mm1.resolved_media_id, expected)
    assert.match(state.missingMedia.mm1.generation_prompt, /Portrait de Épée/)
    const data = JSON.parse(state.cardInstances.card1.data)
    assert.equal(data['art.mediaId'], expected)
    assert.ok(state.media[expected])
  })

  it('stores quota errors without resolving', async () => {
    const state = pipelineState()
    const fetchImpl = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate limited' } }),
    })
    await assert.rejects(() => generateOne('mm1', createFakeDb(state), { fetchImpl }), /Quota/)
    assert.equal(state.missingMedia.mm1.status, 'error')
    assert.match(state.missingMedia.mm1.error_message, /rate limited/)
    assert.equal(JSON.parse(state.cardInstances.card1.data)['art.mediaId'], 'missing-art')
  })
})

