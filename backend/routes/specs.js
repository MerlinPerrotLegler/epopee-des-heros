import express from 'express'
import { readdir, readFile, realpath, stat } from 'fs/promises'
import { join, basename, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()
const __dirname = dirname(fileURLToPath(import.meta.url))
const SPECS_DIR = join(__dirname, '..', '..', 'specs')

function parseMeta(filename, content) {
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const id = filename.replace(/\.md$/i, '')
  const tsdMatch = id.match(/^TSD-(\d+)/i)

  let kind = 'doc'
  if (/^TSD-/i.test(id)) kind = 'tsd'
  else if (/^WORKPLAN$/i.test(id)) kind = 'workplan'
  else if (/^README$/i.test(id)) kind = 'readme'

  let status = null
  let updated = null
  if (kind === 'tsd') {
    const statusMatch = content.match(/\|\s*Status\s*\|\s*([^|\n]+)\|/i)
    const updatedMatch = content.match(/\|\s*Last update\s*\|\s*([^|\n]+)\|/i)
    const createdMatch = content.match(/\|\s*Created\s*\|\s*([^|\n]+)\|/i)
    status = statusMatch ? statusMatch[1].trim() : null
    updated = (updatedMatch || createdMatch)?.[1]?.trim() || null
  }

  return {
    id,
    filename,
    kind,
    number: tsdMatch ? Number(tsdMatch[1]) : null,
    title: titleMatch ? titleMatch[1].trim() : id,
    status,
    updated,
  }
}

async function resolveSafeSpec(id) {
  const safeName = basename(String(id || '')).replace(/\.md$/i, '')
  if (!safeName || safeName.includes('..')) return null

  const specsRoot = await realpath(SPECS_DIR)
  const candidate = join(SPECS_DIR, `${safeName}.md`)
  let resolved
  try {
    resolved = await realpath(candidate)
  } catch {
    return null
  }
  if (!resolved.startsWith(specsRoot + '/') && resolved !== specsRoot) return null
  if (extname(resolved).toLowerCase() !== '.md') return null
  return { safeName, resolved }
}

// GET /api/specs → liste des documents
router.get('/', async (_req, res) => {
  let entries
  try {
    entries = await readdir(SPECS_DIR)
  } catch {
    return res.status(404).json({ error: 'Dossier specs introuvable' })
  }

  const docs = []
  for (const name of entries) {
    if (!name.toLowerCase().endsWith('.md')) continue
    const full = join(SPECS_DIR, name)
    const st = await stat(full).catch(() => null)
    if (!st?.isFile()) continue
    const content = await readFile(full, 'utf8')
    docs.push(parseMeta(name, content))
  }

  docs.sort((a, b) => {
    const order = { readme: 0, workplan: 1, tsd: 2, doc: 3 }
    const ka = order[a.kind] ?? 9
    const kb = order[b.kind] ?? 9
    if (ka !== kb) return ka - kb
    if (a.kind === 'tsd' && b.kind === 'tsd') return (a.number || 0) - (b.number || 0)
    return a.title.localeCompare(b.title, 'fr')
  })

  res.json(docs)
})

// GET /api/specs/:id → contenu markdown d'un document
router.get('/:id', async (req, res) => {
  const safe = await resolveSafeSpec(req.params.id)
  if (!safe) return res.status(404).json({ error: 'Spec introuvable' })

  const content = await readFile(safe.resolved, 'utf8')
  const meta = parseMeta(`${safe.safeName}.md`, content)
  res.json({ ...meta, content })
})

export default router
