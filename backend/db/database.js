import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  }
  return db;
}

// Create a full snapshot of the database
export function createSnapshot(label, codeVersion) {
  const db = getDb();
  const tables = ['card_types', 'media_folders', 'media', 'molecules', 'components', 'layouts', 'card_instances', 'import_mappings'];
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
  const tables = ['card_instances', 'import_mappings', 'layouts', 'components', 'molecules', 'media', 'media_folders', 'card_types'];
  
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
