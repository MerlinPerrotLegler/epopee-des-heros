-- MySQL / MariaDB (Hostinger) — aligné sur schema.sql SQLite
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS card_types (
  code VARCHAR(64) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO card_types (code, label) VALUES
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

CREATE TABLE IF NOT EXISTS media_folders (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(64) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mf_parent FOREIGN KEY (parent_id) REFERENCES media_folders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO media_folders (id, name, parent_id) VALUES
  ('root', 'Bibliothèque', NULL),
  ('default', 'Non classé', 'root');

CREATE TABLE IF NOT EXISTS media (
  id VARCHAR(64) PRIMARY KEY,
  filename VARCHAR(512) NOT NULL,
  original_name VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  width_px INT NULL,
  height_px INT NULL,
  folder_id VARCHAR(64) NOT NULL DEFAULT 'default',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_media_folder FOREIGN KEY (folder_id) REFERENCES media_folders(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS molecules (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  definition JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS components (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  width_mm DOUBLE NULL,
  height_mm DOUBLE NULL,
  definition JSON NOT NULL,
  thumbnail TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS layouts (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  card_type VARCHAR(64) NOT NULL,
  width_mm DOUBLE NOT NULL,
  height_mm DOUBLE NOT NULL,
  back_layout_id VARCHAR(64) NULL,
  definition JSON NOT NULL,
  thumbnail TEXT NULL,
  is_back TINYINT(1) NOT NULL DEFAULT 0,
  sheets_url TEXT NULL,
  shape VARCHAR(32) NOT NULL DEFAULT 'rectangle',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_layouts_card_type FOREIGN KEY (card_type) REFERENCES card_types(code),
  CONSTRAINT fk_layouts_back FOREIGN KEY (back_layout_id) REFERENCES layouts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS import_jobs (
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
  last_sync_stats JSON NULL,
  CONSTRAINT fk_ij_layout FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS layout_locks (
  layout_id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  session_id VARCHAR(128) NOT NULL,
  holder_username VARCHAR(255) NOT NULL,
  expires_at BIGINT NOT NULL,
  CONSTRAINT fk_ll_layout FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ll_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS card_instances (
  id VARCHAR(64) PRIMARY KEY,
  layout_id VARCHAR(64) NOT NULL,
  name VARCHAR(512) NOT NULL,
  data JSON NOT NULL,
  sort_order INT DEFAULT 0,
  import_job_id VARCHAR(64) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_layout FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_job FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS missing_media (
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
  generation_prompt TEXT NULL,
  CONSTRAINT fk_mm_card FOREIGN KEY (card_instance_id) REFERENCES card_instances(id) ON DELETE CASCADE,
  CONSTRAINT fk_mm_media FOREIGN KEY (resolved_media_id) REFERENCES media(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_generation_config (
  id VARCHAR(32) PRIMARY KEY,
  provider VARCHAR(64) NOT NULL DEFAULT 'openai',
  api_key TEXT NULL,
  global_prompt TEXT NOT NULL,
  media_type_presets JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO ai_generation_config (id, media_type_presets, global_prompt) VALUES ('singleton', '[]', '');

CREATE TABLE IF NOT EXISTS snapshots (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(255) NULL,
  code_version VARCHAR(64) NOT NULL,
  dump JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS import_mappings (
  id VARCHAR(64) PRIMARY KEY,
  layout_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mapping JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_im_layout FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fonts (
  id VARCHAR(64) PRIMARY KEY,
  family VARCHAR(255) NOT NULL UNIQUE,
  url VARCHAR(1024) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY,
  design_config JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO settings (id, design_config) VALUES (1, '{}');

CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder_id);
CREATE INDEX IF NOT EXISTS idx_card_instances_layout ON card_instances(layout_id);
CREATE INDEX IF NOT EXISTS idx_layouts_type ON layouts(card_type);

SET FOREIGN_KEY_CHECKS = 1;
