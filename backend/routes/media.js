import { Router } from 'express';
import { getDb } from '../db/database.js';
import multer from 'multer';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import {
  MEDIA_LIST_COLUMNS,
  insertMediaRecord,
} from '../services/mediaStorage.js';
import { allocateTrackId, defaultTrackMeta } from './trackTextures.js';

// Use memory storage so we can compute SHA1 before writing to disk
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

// === Folders ===
router.get('/folders', async (req, res) => {
  const db = getDb();
  const rows = await db.prepare('SELECT * FROM media_folders ORDER BY name').all();
  res.json(rows);
});

router.post('/folders', async (req, res) => {
  const db = getDb();
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = randomUUID();
  await db.prepare('INSERT INTO media_folders (id, name, parent_id) VALUES (?, ?, ?)').run(id, name, parent_id || 'root');
  res.status(201).json({ id, name, parent_id: parent_id || 'root' });
});

router.patch('/folders/:id', async (req, res) => {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM media_folders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (req.params.id === 'root' || req.params.id === 'default' || req.params.id === 'builtin') {
    return res.status(400).json({ error: 'Cannot rename system folders' });
  }

  const { name, parent_id } = req.body;
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Name required' });
  }
  await db.prepare('UPDATE media_folders SET name = ?, parent_id = ? WHERE id = ?').run(
    name !== undefined ? String(name).trim() : existing.name,
    parent_id !== undefined ? parent_id : existing.parent_id,
    req.params.id,
  );
  const row = await db.prepare('SELECT * FROM media_folders WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/folders/:id', async (req, res) => {
  const db = getDb();
  if (req.params.id === 'root' || req.params.id === 'default' || req.params.id === 'builtin') {
    return res.status(400).json({ error: 'Cannot delete system folders' });
  }
  const existing = await db.prepare('SELECT * FROM media_folders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  // MySQL: FK ON DELETE RESTRICT — déplacer les médias vers Non classé avant suppression
  await db.prepare("UPDATE media SET folder_id = 'default' WHERE folder_id = ?").run(req.params.id);
  // Sous-dossiers → rattacher à root
  await db.prepare("UPDATE media_folders SET parent_id = 'root' WHERE parent_id = ?").run(req.params.id);
  await db.prepare('DELETE FROM media_folders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// === Files ===
const MEDIA_KIND_FILTER = "(kind = 'media' OR kind IS NULL OR kind = '')";

router.get('/', async (req, res) => {
  const db = getDb();
  const { folder_id } = req.query;
  let rows;
  if (folder_id) {
    rows = await db.prepare(`SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE ${MEDIA_KIND_FILTER} AND folder_id = ? ORDER BY original_name`).all(folder_id);
  } else {
    rows = await db.prepare(`SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE ${MEDIA_KIND_FILTER} ORDER BY original_name`).all();
  }
  res.json(rows);
});

router.post('/upload', upload.array('files', 20), async (req, res) => {
  const db = getDb();
  const folder_id = req.body.folder_id || 'default';
  const results = [];

  const selectStmt = db.prepare(`SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ?`);

  for (const file of req.files) {
    // id = filename (with ext) so /uploads/${mediaId} works directly in atom renderers
    const sha1 = createHash('sha1').update(file.buffer).digest('hex');
    const ext = extname(file.originalname).toLowerCase();
    const filename = `${sha1}${ext}`;

    // Dedup by id=filename
    const existing = await selectStmt.get(filename);
    if (existing) {
      results.push({ ...existing, duplicate: true });
      continue;
    }

    const kind = folder_id === 'chemin-track' ? 'track' : 'media';
    const track_meta = kind === 'track'
      ? JSON.stringify(defaultTrackMeta(await allocateTrackId(db)))
      : null;

    await insertMediaRecord(db, {
      id: filename,
      filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      folder_id,
      buffer: file.buffer,
      kind,
      track_meta,
    });
    results.push({
      id: filename,
      filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      folder_id,
      kind,
      track_meta: track_meta ? JSON.parse(track_meta) : null,
    });
  }

  res.status(201).json(results);
});

router.patch('/:id', async (req, res) => {
  const db = getDb();
  const existing = await db.prepare(`SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { folder_id, original_name } = req.body;
  await db.prepare('UPDATE media SET folder_id = ?, original_name = ? WHERE id = ?').run(
    folder_id !== undefined ? folder_id : existing.folder_id,
    original_name !== undefined ? original_name : existing.original_name,
    req.params.id,
  );
  const row = await db.prepare(`SELECT ${MEDIA_LIST_COLUMNS} FROM media WHERE id = ?`).get(req.params.id);
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
