import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'card-designer.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Run schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);

    // Migrations (idempotent — SQLite ne supporte pas IF NOT EXISTS sur ALTER TABLE)
    try { db.exec('ALTER TABLE layouts ADD COLUMN thumbnail TEXT') } catch {}
    try { db.exec('ALTER TABLE components ADD COLUMN thumbnail TEXT') } catch {}
    try { db.exec('ALTER TABLE layouts ADD COLUMN is_back INTEGER NOT NULL DEFAULT 0') } catch {}
    // Migrate existing back layouts (card_type = 'dos') to is_back = 1
    try { db.exec("UPDATE layouts SET is_back = 1 WHERE card_type = 'dos' AND is_back = 0") } catch {}
    // TSD-006: sheets_url for Google Sheets sync
    try { db.exec('ALTER TABLE layouts ADD COLUMN sheets_url TEXT') } catch {}
    // TSD-007: ImportJobs table
    try { db.exec(`CREATE TABLE IF NOT EXISTS import_jobs (
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
    )`) } catch {}
    // TSD-007: import_job_id on card instances
    try { db.exec('ALTER TABLE card_instances ADD COLUMN import_job_id TEXT REFERENCES import_jobs(id) ON DELETE SET NULL') } catch {}
    // TSD-012: missing_media table (non-blocking detection during import)
    try { db.exec(`CREATE TABLE IF NOT EXISTS missing_media (
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
    )`) } catch {}
    try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_missing_media_uniq ON missing_media(card_instance_id, binding_path)') } catch {}
    try { db.exec('CREATE INDEX IF NOT EXISTS idx_missing_media_status ON missing_media(status)') } catch {}
    // TSD-012: ai_generation_config table
    try { db.exec(`CREATE TABLE IF NOT EXISTS ai_generation_config (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT,
      global_prompt TEXT NOT NULL DEFAULT '',
      media_type_presets TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`) } catch {}
    // Seed built-in media types (illustration, icon, fond, texte_graphique)
    try {
      const builtinPresets = JSON.stringify([
        { type: 'illustration', label: 'Illustration', resolution: '1024x1024', style_preset: 'vivid', provider: 'openai', negative_prompt: '' },
        { type: 'icon', label: 'Icône', resolution: '512x512', style_preset: 'natural', provider: 'openai', negative_prompt: 'photorealistic, photo' },
        { type: 'fond', label: 'Fond', resolution: '1024x1792', style_preset: 'natural', provider: 'openai', negative_prompt: '' },
        { type: 'texte_graphique', label: 'Texte graphique', resolution: '1024x512', style_preset: 'natural', provider: 'openai', negative_prompt: '' },
      ])
      db.prepare("INSERT OR IGNORE INTO ai_generation_config (id, media_type_presets) VALUES ('singleton', ?)").run(builtinPresets)
    } catch {}
    // Reset any 'generating' entries stuck from previous crash
    try { db.exec("UPDATE missing_media SET status = 'pending' WHERE status = 'generating'") } catch {}
    // TSD-013: hexagonal layout shape
    try { db.exec("ALTER TABLE layouts ADD COLUMN shape TEXT NOT NULL DEFAULT 'rectangle'") } catch {}
    // Multi-utilisateurs + verrous layout
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`)
    } catch {}
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS layout_locks (
        layout_id TEXT NOT NULL PRIMARY KEY REFERENCES layouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        holder_username TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )`)
    } catch {}
    seedInitialAdminIfNeeded(db)
  }
  return db;
}

function seedInitialAdminIfNeeded(db) {
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

// Create a full snapshot of the database
export function createSnapshot(label, codeVersion) {
  const db = getDb();
  const tables = ['card_types', 'media_folders', 'media', 'molecules', 'components', 'layouts', 'import_jobs', 'card_instances', 'import_mappings', 'users'];
  const dump = {};
  
  for (const table of tables) {
    dump[table] = db.prepare(`SELECT * FROM ${table}`).all();
  }
  
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO snapshots (id, label, code_version, dump) VALUES (?, ?, ?, ?)`).run(
    id, label, codeVersion, JSON.stringify(dump)
  );
  
  return { id, label, codeVersion, created_at: new Date().toISOString() };
}

// Restore from a snapshot
export function restoreSnapshot(snapshotId) {
  const db = getDb();
  const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotId);
  if (!snapshot) throw new Error('Snapshot not found');
  
  const dump = JSON.parse(snapshot.dump);
  const tables = ['layout_locks', 'card_instances', 'import_mappings', 'import_jobs', 'layouts', 'components', 'molecules', 'media', 'media_folders', 'card_types', 'users'];
  
  const restore = db.transaction(() => {
    // Delete in reverse dependency order
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    // Insert in dependency order
    for (const table of [...tables].reverse()) {
      const rows = dump[table] || [];
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
      for (const row of rows) {
        stmt.run(...cols.map(c => row[c]));
      }
    }
  });
  
  restore();
  return { restored: snapshotId, code_version: snapshot.code_version };
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
