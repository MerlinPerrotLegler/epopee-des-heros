-- ============================================
-- Card Designer - Database Schema
-- ============================================

-- Card types enum table
CREATE TABLE IF NOT EXISTS card_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO card_types (code, label) VALUES
  ('equipement', 'Équipement'),
  ('classe', 'Classe'),
  ('quete', 'Quête'),
  ('bricabrac', 'Bric à Brac'),
  ('cestpasjuste', 'C''est pas juste'),
  ('buff', 'Buff'),
  ('faveur', 'Faveur Royale'),
  ('epopee', 'Épopée'),
  ('enchantement', 'Enchantement'),
  ('rune', 'Rune'),
  ('dos', 'Dos de carte');

-- ============================================
-- Media library
-- ============================================
CREATE TABLE IF NOT EXISTS media_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES media_folders(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO media_folders (id, name, parent_id) VALUES
  ('root', 'Bibliothèque', NULL),
  ('default', 'Non classé', 'root');

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width_px INTEGER,
  height_px INTEGER,
  folder_id TEXT NOT NULL DEFAULT 'default' REFERENCES media_folders(id) ON DELETE SET DEFAULT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Molecules (reusable atom groups)
-- ============================================
CREATE TABLE IF NOT EXISTS molecules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  -- JSON: { width_mm, height_mm, atoms: [{ id, atomType, x_mm, y_mm, width_mm, height_mm, params: {} }] }
  definition JSON NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Components (reusable blocks of atoms/molecules with placeholders)
-- ============================================
CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  width_mm REAL,
  height_mm REAL,
  -- JSON: { elements: [{ id, type: 'atom'|'molecule', ref, x_mm, y_mm, width_mm, height_mm, params: {} }] }
  definition JSON NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Layouts (card templates)
-- ============================================
CREATE TABLE IF NOT EXISTS layouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  card_type TEXT NOT NULL REFERENCES card_types(code),
  width_mm REAL NOT NULL,
  height_mm REAL NOT NULL,
  back_layout_id TEXT REFERENCES layouts(id) ON DELETE SET NULL,
  -- JSON: full layout definition with layers, elements, bindings schema
  definition JSON NOT NULL DEFAULT '{"layers":[{"id":"default","name":"Fond","locked":false,"visible":true,"elements":[]}],"dataSchema":{}}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Card instances (layout + data)
-- ============================================
CREATE TABLE IF NOT EXISTS card_instances (
  id TEXT PRIMARY KEY,
  layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- JSON: key-value pairs for data binding { "nameInLayout.param": "value" }
  data JSON NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Versioning / Snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  label TEXT,
  code_version TEXT NOT NULL,
  -- JSON: full dump of all tables
  dump JSON NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Import templates (CSV mappings)
-- ============================================
CREATE TABLE IF NOT EXISTS import_mappings (
  id TEXT PRIMARY KEY,
  layout_id TEXT NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- JSON: { csvColumn: "bindingPath" }
  mapping JSON NOT NULL DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder_id);
CREATE INDEX IF NOT EXISTS idx_card_instances_layout ON card_instances(layout_id);
CREATE INDEX IF NOT EXISTS idx_layouts_type ON layouts(card_type);
