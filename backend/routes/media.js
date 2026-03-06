import { Router } from 'express';
import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', 'data', 'uploads');

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

// === Folders ===
router.get('/folders', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM media_folders ORDER BY name').all();
  res.json(rows);
});

router.post('/folders', (req, res) => {
  const db = getDb();
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = randomUUID();
  db.prepare('INSERT INTO media_folders (id, name, parent_id) VALUES (?, ?, ?)').run(id, name, parent_id || 'root');
  res.status(201).json({ id, name, parent_id: parent_id || 'root' });
});

router.patch('/folders/:id', (req, res) => {
  const db = getDb();
  const { name, parent_id } = req.body;
  db.prepare('UPDATE media_folders SET name = COALESCE(?, name), parent_id = COALESCE(?, parent_id) WHERE id = ?').run(name, parent_id, req.params.id);
  const row = db.prepare('SELECT * FROM media_folders WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/folders/:id', (req, res) => {
  const db = getDb();
  if (req.params.id === 'root' || req.params.id === 'default') {
    return res.status(400).json({ error: 'Cannot delete system folders' });
  }
  db.prepare('DELETE FROM media_folders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// === Files ===
router.get('/', (req, res) => {
  const db = getDb();
  const { folder_id } = req.query;
  let rows;
  if (folder_id) {
    rows = db.prepare('SELECT * FROM media WHERE folder_id = ? ORDER BY original_name').all(folder_id);
  } else {
    rows = db.prepare('SELECT * FROM media ORDER BY original_name').all();
  }
  res.json(rows);
});

router.post('/upload', upload.array('files', 20), (req, res) => {
  const db = getDb();
  const folder_id = req.body.folder_id || 'default';
  const results = [];

  const stmt = db.prepare('INSERT INTO media (id, filename, original_name, mime_type, width_px, height_px, folder_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  for (const file of req.files) {
    const id = randomUUID();
    stmt.run(id, file.filename, file.originalname, file.mimetype, null, null, folder_id);
    results.push({ id, filename: file.filename, original_name: file.originalname, mime_type: file.mimetype, folder_id });
  }

  res.status(201).json(results);
});

router.patch('/:id', (req, res) => {
  const db = getDb();
  const { folder_id, original_name } = req.body;
  db.prepare('UPDATE media SET folder_id = COALESCE(?, folder_id), original_name = COALESCE(?, original_name) WHERE id = ?').run(
    folder_id, original_name, req.params.id
  );
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT filename FROM media WHERE id = ?').get(req.params.id);
  if (row) {
    const filepath = join(UPLOADS_DIR, row.filename);
    if (existsSync(filepath)) unlinkSync(filepath);
  }
  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
