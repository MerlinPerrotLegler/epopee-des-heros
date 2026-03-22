import Database from 'better-sqlite3'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { DATA_DIR } from '../paths.js'
import { useMysql } from './sqlDialect.js'
import { createMysqlPool } from './mysqlPool.js'
import { createMysqlAdapter, createSqliteAdapter } from './adapter.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
const DB_PATH = join(DATA_DIR, 'card-designer.db')

/** better-sqlite3 direct (sync) — import pipeline & restore SQLite */
let sqliteDb = null
/** mysql2 pool */
let mysqlPool = null
/** Interface async unifiée pour les routes */
let adapter = null

export function getSqliteSync() {
  if (useMysql()) throw new Error('getSqliteSync: mode MySQL actif')
  if (!sqliteDb) throw new Error('Base non initialisée')
  return sqliteDb
}

export function getDb() {
  if (!adapter) throw new Error('Base non initialisée — appeler initDatabase() au démarrage')
  return adapter
}

async function runMysqlSchema(pool) {
  const sqlPath = join(__dirname, 'schema.mysql.sql')
  const raw = readFileSync(sqlPath, 'utf-8')
  try {
    await pool.query(raw)
  } catch (e) {
    if (String(e.code) === 'ER_DUP_KEYNAME' || String(e.message).includes('Duplicate key name')) {
      /* index déjà créé */
    } else {
      console.error('[db mysql] schema:', e.message)
      throw e
    }
  }
}

async function runMysqlMigrations(pool) {
  const tryAlter = async (sql) => {
    try {
      await pool.query(sql)
    } catch {
      /* colonne existe déjà */
    }
  }
  await tryAlter('ALTER TABLE layouts ADD COLUMN thumbnail TEXT')
  await tryAlter('ALTER TABLE components ADD COLUMN thumbnail TEXT')
  await tryAlter('ALTER TABLE layouts ADD COLUMN is_back TINYINT(1) NOT NULL DEFAULT 0')
  await tryAlter("UPDATE layouts SET is_back = 1 WHERE card_type = 'dos' AND is_back = 0")
  await tryAlter('ALTER TABLE layouts ADD COLUMN sheets_url TEXT')
  await tryAlter(`CREATE TABLE IF NOT EXISTS import_jobs (
    id VARCHAR(64) PRIMARY KEY,
    label TEXT NULL,
    source_url TEXT NOT NULL,
    mode VARCHAR(32) NOT NULL DEFAULT 'single',
    layout_id VARCHAR(64) NULL,
    layout_column TEXT NULL,
    id_column VARCHAR(255) NOT NULL,
    mappings JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_synced_at DATETIME NULL,
    last_sync_stats JSON NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  await tryAlter('ALTER TABLE card_instances ADD COLUMN import_job_id VARCHAR(64) NULL')
  await tryAlter(`CREATE TABLE IF NOT EXISTS missing_media (
    id VARCHAR(64) PRIMARY KEY,
    card_instance_id VARCHAR(64) NOT NULL,
    binding_path VARCHAR(512) NOT NULL,
    media_type VARCHAR(64) NULL,
    media_id_ref VARCHAR(64) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    resolved_media_id VARCHAR(64) NULL,
    error_message TEXT NULL,
    detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    generation_prompt TEXT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  await tryAlter(`CREATE TABLE IF NOT EXISTS ai_generation_config (
    id VARCHAR(32) PRIMARY KEY,
    provider VARCHAR(64) NOT NULL DEFAULT 'openai',
    api_key TEXT NULL,
    global_prompt TEXT NOT NULL,
    media_type_presets JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  await tryAlter("UPDATE missing_media SET status = 'pending' WHERE status = 'generating'")
  await tryAlter('ALTER TABLE layouts ADD COLUMN shape VARCHAR(32) NOT NULL DEFAULT \'rectangle\'')
  await tryAlter(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  await tryAlter(`CREATE TABLE IF NOT EXISTS layout_locks (
    layout_id VARCHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(128) NOT NULL,
    holder_username VARCHAR(255) NOT NULL,
    expires_at BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
}

function initSqliteSync() {
  sqliteDb = new Database(DB_PATH)
  sqliteDb.pragma('journal_mode = WAL')
  sqliteDb.pragma('foreign_keys = ON')
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
  sqliteDb.exec(schema)
  try {
    sqliteDb.exec('ALTER TABLE layouts ADD COLUMN thumbnail TEXT')
  } catch {}
  try {
    sqliteDb.exec('ALTER TABLE components ADD COLUMN thumbnail TEXT')
  } catch {}
  try {
    sqliteDb.exec('ALTER TABLE layouts ADD COLUMN is_back INTEGER NOT NULL DEFAULT 0')
  } catch {}
  try {
    sqliteDb.exec("UPDATE layouts SET is_back = 1 WHERE card_type = 'dos' AND is_back = 0")
  } catch {}
  try {
    sqliteDb.exec('ALTER TABLE layouts ADD COLUMN sheets_url TEXT')
  } catch {}
  try {
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS import_jobs (
      id TEXT PRIMARY KEY,
      label TEXT,
      source_url TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'single',
      layout_id TEXT REFERENCES layouts(id) ON DELETE SET NULL,
      layout_column TEXT,
      id_column TEXT NOT NULL,
      mappings JSON NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      last_synced_at TEXT,
      last_sync_stats JSON
    )`)
  } catch {}
  try {
    sqliteDb.exec('ALTER TABLE card_instances ADD COLUMN import_job_id TEXT REFERENCES import_jobs(id) ON DELETE SET NULL')
  } catch {}
  try {
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS missing_media (
      id TEXT PRIMARY KEY,
      card_instance_id TEXT NOT NULL REFERENCES card_instances(id) ON DELETE CASCADE,
      binding_path TEXT NOT NULL,
      media_type TEXT,
      media_id_ref TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      resolved_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
      error_message TEXT,
      detected_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      generation_prompt TEXT
    )`)
  } catch {}
  try {
    sqliteDb.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_missing_media_uniq ON missing_media(card_instance_id, binding_path)')
  } catch {}
  try {
    sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_missing_media_status ON missing_media(status)')
  } catch {}
  try {
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS ai_generation_config (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT,
      global_prompt TEXT NOT NULL DEFAULT '',
      media_type_presets TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`)
  } catch {}
  try {
    const builtinPresets = JSON.stringify([
      { type: 'illustration', label: 'Illustration', resolution: '1024x1024', style_preset: 'vivid', provider: 'openai', negative_prompt: '' },
      { type: 'icon', label: 'Icône', resolution: '512x512', style_preset: 'natural', provider: 'openai', negative_prompt: 'photorealistic, photo' },
      { type: 'fond', label: 'Fond', resolution: '1024x1792', style_preset: 'natural', provider: 'openai', negative_prompt: '' },
      { type: 'texte_graphique', label: 'Texte graphique', resolution: '1024x512', style_preset: 'natural', provider: 'openai', negative_prompt: '' },
    ])
    sqliteDb.prepare("INSERT OR IGNORE INTO ai_generation_config (id, media_type_presets) VALUES ('singleton', ?)").run(builtinPresets)
  } catch {}
  try {
    sqliteDb.exec("UPDATE missing_media SET status = 'pending' WHERE status = 'generating'")
  } catch {}
  try {
    sqliteDb.exec("ALTER TABLE layouts ADD COLUMN shape TEXT NOT NULL DEFAULT 'rectangle'")
  } catch {}
  try {
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
  } catch {}
  try {
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS layout_locks (
      layout_id TEXT NOT NULL PRIMARY KEY REFERENCES layouts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      holder_username TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )`)
  } catch {}
  seedInitialAdminIfNeededSync(sqliteDb)
  adapter = createSqliteAdapter(sqliteDb)
}

async function initMysql() {
  mysqlPool = createMysqlPool()
  await runMysqlSchema(mysqlPool)
  await runMysqlMigrations(mysqlPool)
  adapter = createMysqlAdapter(mysqlPool)
  await seedInitialAdminIfNeededAsync(adapter)
}

function seedInitialAdminIfNeededSync(db) {
  try {
    const n = db.prepare('SELECT COUNT(*) AS c FROM users').get()
    if (n && n.c > 0) return
    const adminUser = process.env.ADMIN_USER || process.env.AUTH_USER || 'admin'
    const adminPass = process.env.ADMIN_PASSWORD || process.env.AUTH_PASS || 'changeme'
    const id = randomUUID()
    const hash = bcrypt.hashSync(adminPass, 10)
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, adminUser, hash, 'admin')
    console.log('[db] Compte admin initial créé (login:', adminUser + ')')
  } catch (e) {
    console.warn('[db] seed admin:', e.message)
  }
}

async function seedInitialAdminIfNeededAsync(db) {
  try {
    const n = await db.prepare('SELECT COUNT(*) AS c FROM users').get()
    const c = n?.c ?? n?.['COUNT(*)']
    if (c > 0) return
    const adminUser = process.env.ADMIN_USER || process.env.AUTH_USER || 'admin'
    const adminPass = process.env.ADMIN_PASSWORD || process.env.AUTH_PASS || 'changeme'
    const id = randomUUID()
    const hash = bcrypt.hashSync(adminPass, 10)
    await db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, adminUser, hash, 'admin')
    console.log('[db] MySQL — compte admin initial créé (login:', adminUser + ')')
  } catch (e) {
    console.warn('[db] seed admin mysql:', e.message)
  }
}

export async function initDatabase() {
  if (useMysql()) {
    console.log('[db] Mode MySQL (DATABASE_URL ou MYSQL_*)')
    await initMysql()
  } else {
    console.log('[db] Mode SQLite:', DB_PATH)
    initSqliteSync()
  }
}

export async function createSnapshot(label, codeVersion) {
  const db = getDb()
  const tables = ['card_types', 'media_folders', 'media', 'molecules', 'components', 'layouts', 'import_jobs', 'card_instances', 'import_mappings', 'users']
  const dump = {}
  for (const table of tables) {
    dump[table] = await db.prepare(`SELECT * FROM ${table}`).all()
  }
  const id = randomUUID()
  await db.prepare(`INSERT INTO snapshots (id, label, code_version, dump) VALUES (?, ?, ?, ?)`).run(
    id,
    label,
    codeVersion,
    JSON.stringify(dump),
  )
  return { id, label, codeVersion, created_at: new Date().toISOString() }
}

export async function restoreSnapshot(snapshotId) {
  const db = getDb()
  const snapshot = await db.prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotId)
  if (!snapshot) throw new Error('Snapshot not found')
  const dump = typeof snapshot.dump === 'string' ? JSON.parse(snapshot.dump) : snapshot.dump
  const tables = ['layout_locks', 'card_instances', 'import_mappings', 'import_jobs', 'layouts', 'components', 'molecules', 'media', 'media_folders', 'card_types', 'users']

  if (useMysql()) {
    await db.transaction(async (tx) => {
      for (const table of tables) {
        await tx.prepare(`DELETE FROM ${table}`).run()
      }
      for (const table of [...tables].reverse()) {
        const rows = dump[table] || []
        if (rows.length === 0) continue
        const cols = Object.keys(rows[0])
        const placeholders = cols.map(() => '?').join(', ')
        const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
        for (const row of rows) {
          await tx.prepare(sql).run(...cols.map((c) => row[c]))
        }
      }
    })()
  } else {
    const raw = getSqliteSync()
    const restore = raw.transaction(() => {
      for (const table of tables) {
        raw.prepare(`DELETE FROM ${table}`).run()
      }
      for (const table of [...tables].reverse()) {
        const rows = dump[table] || []
        if (rows.length === 0) continue
        const cols = Object.keys(rows[0])
        const placeholders = cols.map(() => '?').join(', ')
        const stmt = raw.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
        for (const row of rows) {
          stmt.run(...cols.map((c) => row[c]))
        }
      }
    })
    restore()
  }
  return { restored: snapshotId, code_version: snapshot.code_version }
}

export function closeDb() {
  if (sqliteDb) {
    sqliteDb.close()
    sqliteDb = null
  }
  if (mysqlPool) {
    mysqlPool.end().catch(() => {})
    mysqlPool = null
  }
  adapter = null
}
