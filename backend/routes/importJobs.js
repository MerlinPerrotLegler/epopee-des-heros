import { Router } from 'express';
import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';
import { runImportPipeline, normalizeGoogleSheetsUrl, parseCsvText } from './cards.js';

const router = Router();

// List all import jobs
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT ij.*, l.name AS layout_name,
      (SELECT COUNT(*) FROM card_instances WHERE import_job_id = ij.id) AS instance_count
    FROM import_jobs ij
    LEFT JOIN layouts l ON l.id = ij.layout_id
    ORDER BY ij.created_at DESC
  `).all();
  rows.forEach(r => {
    if (r.mappings) r.mappings = JSON.parse(r.mappings);
    if (r.last_sync_stats) r.last_sync_stats = JSON.parse(r.last_sync_stats);
  });
  res.json(rows);
});

// Get single import job
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(`
    SELECT ij.*, l.name AS layout_name,
      (SELECT COUNT(*) FROM card_instances WHERE import_job_id = ij.id) AS instance_count
    FROM import_jobs ij
    LEFT JOIN layouts l ON l.id = ij.layout_id
    WHERE ij.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.mappings) row.mappings = JSON.parse(row.mappings);
  if (row.last_sync_stats) row.last_sync_stats = JSON.parse(row.last_sync_stats);
  res.json(row);
});

// Re-sync an import job (re-fetch source URL and upsert instances)
router.post('/:id/sync', async (req, res) => {
  const db = getDb();
  const job = db.prepare('SELECT * FROM import_jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  const mappings = JSON.parse(job.mappings);

  try {
    const url = normalizeGoogleSheetsUrl(job.source_url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching source URL`);
    const csvText = await response.text();
    const rows = parseCsvText(csvText);
    if (!rows.length) throw new Error('CSV vide ou sans données');

    const stats = runImportPipeline(db, {
      rows,
      mode: job.mode,
      layoutId: job.layout_id,
      layoutColumn: job.layout_column,
      idColumn: job.id_column,
      mappings,
      jobId: job.id,
    });

    db.prepare(`UPDATE import_jobs SET last_synced_at = datetime('now'), last_sync_stats = ? WHERE id = ?`)
      .run(JSON.stringify(stats), job.id);

    res.json({ ok: true, jobId: job.id, ...stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete import job (does NOT delete instances)
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM import_jobs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
