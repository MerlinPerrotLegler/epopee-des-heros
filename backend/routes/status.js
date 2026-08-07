import { Router } from 'express'
import { useMysql } from '../db/sqlDialect.js'
import { getDb } from '../db/database.js'
import { DATA_DIR } from '../paths.js'

const router = Router()
const startedAt = new Date()

/** État du boot (rempli par server.js) */
export const bootState = {
  dbReady: false,
  dbError: null,
  seeded: false,
}

function maskMysqlTarget() {
  const urlStr = process.env.DATABASE_URL?.trim()
  if (urlStr) {
    try {
      const u = new URL(urlStr)
      const user = decodeURIComponent(u.username || '') || '(sans user)'
      const host = u.hostname || '?'
      const port = u.port || '3306'
      const db = (u.pathname || '').replace(/^\//, '') || '(sans db)'
      return `mysql://${user}@${host}:${port}/${db}`
    } catch {
      return 'DATABASE_URL invalide'
    }
  }
  if (process.env.MYSQL_HOST) {
    return `mysql://${process.env.MYSQL_USER || '?'}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || '3306'}/${process.env.MYSQL_DATABASE || '?'}`
  }
  return null
}

async function probeDatabase() {
  if (!bootState.dbReady) {
    return {
      ok: false,
      error: bootState.dbError || 'Base non initialisée au démarrage',
    }
  }
  try {
    const db = getDb()
    await db.prepare('SELECT 1 AS ok').get()
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export async function buildStatusPayload() {
  const mysql = useMysql()
  const dbProbe = await probeDatabase()
  const uptimeSec = Math.round((Date.now() - startedAt.getTime()) / 1000)
  const overallOk = dbProbe.ok

  return {
    ok: overallOk,
    service: 'card-designer',
    time: new Date().toISOString(),
    uptime_sec: uptimeSec,
    node: process.version,
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3001',
    data_dir: DATA_DIR,
    database: {
      mode: mysql ? 'mysql' : 'sqlite',
      ready_at_boot: bootState.dbReady,
      boot_error: bootState.dbError,
      live_ok: dbProbe.ok,
      live_error: dbProbe.error,
      target: mysql ? maskMysqlTarget() : DATA_DIR,
      seeded: bootState.seeded,
      database_url_set: Boolean(process.env.DATABASE_URL?.trim()),
      mysql_vars_set: Boolean(
        process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD !== undefined && process.env.MYSQL_DATABASE,
      ),
    },
    hints: overallOk
      ? []
      : [
          mysql
            ? 'Vérifier le mot de passe MySQL / DATABASE_URL dans hPanel → Variables d’environnement.'
            : 'Mode SQLite : better-sqlite3 doit être installé (local). Sur Hostinger, définir DATABASE_URL (MySQL).',
          'Après correction des variables, redémarrer ou redéployer l’application.',
        ],
  }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderStatusHtml(payload) {
  const ok = payload.ok
  const color = ok ? '#1a7f37' : '#b42318'
  const label = ok ? 'OK — service opérationnel' : 'KO — problème détecté'
  const rows = [
    ['Service', payload.service],
    ['Heure', payload.time],
    ['Uptime', `${payload.uptime_sec}s`],
    ['Node', payload.node],
    ['ENV', payload.env],
    ['PORT', payload.port],
    ['DATA_DIR', payload.data_dir],
    ['Mode DB', payload.database.mode],
    ['Cible DB', payload.database.target || '—'],
    ['DB au boot', payload.database.ready_at_boot ? 'OK' : 'ÉCHEC'],
    ['Erreur boot', payload.database.boot_error || '—'],
    ['DB live (ping)', payload.database.live_ok ? 'OK' : 'ÉCHEC'],
    ['Erreur live', payload.database.live_error || '—'],
    ['DATABASE_URL défini', payload.database.database_url_set ? 'oui' : 'non'],
    ['MYSQL_* définis', payload.database.mysql_vars_set ? 'oui' : 'non'],
    ['Seed builtins', payload.database.seeded ? 'oui' : 'non'],
  ]
  const hints = (payload.hints || [])
    .map((h) => `<li>${escapeHtml(h)}</li>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="30" />
  <title>Status — Card Designer</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 2rem; line-height: 1.45; }
    main { max-width: 52rem; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    .badge { display: inline-block; padding: 0.4rem 0.75rem; border-radius: 0.4rem; color: #fff; background: ${color}; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 1.25rem 0; }
    th, td { text-align: left; padding: 0.55rem 0.4rem; border-bottom: 1px solid #ccc3; vertical-align: top; word-break: break-word; }
    th { width: 11rem; color: #666; font-weight: 600; }
    .meta { color: #666; font-size: 0.9rem; }
    ul { padding-left: 1.2rem; }
    a { color: inherit; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
  </style>
</head>
<body>
  <main>
    <h1>Status serveur</h1>
    <p class="badge">${escapeHtml(label)}</p>
    <p class="meta">Page publique · rafraîchissement auto 30s · aussi <a href="/api/health"><code>/api/health</code></a> (JSON)</p>
    <table>
      <tbody>
        ${rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('\n')}
      </tbody>
    </table>
    ${hints ? `<h2>Que faire</h2><ul>${hints}</ul>` : ''}
  </main>
</body>
</html>`
}

/** HTML clair — pas d’auth */
router.get('/status', async (_req, res) => {
  const payload = await buildStatusPayload()
  res.status(payload.ok ? 200 : 503).type('html').send(renderStatusHtml(payload))
})

/** JSON pour monitoring */
router.get('/api/health', async (_req, res) => {
  const payload = await buildStatusPayload()
  res.status(payload.ok ? 200 : 503).json(payload)
})

export default router
