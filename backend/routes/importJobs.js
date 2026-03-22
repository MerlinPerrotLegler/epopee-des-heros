import { Router } from 'express';
import { getDb, getSqliteSync } from '../db/database.js';
import { useMysql } from '../db/sqlDialect.js';
import { runImportPipeline, runImportPipelineAsync, normalizeGoogleSheetsUrl, parseCsvText } from './cards.js';

const router = Router();

// List all import jobs
router.get('/', async (req, res) => {
  const db = getDb();
  const rows = await db.prepare(`
    SELECT ij.*, l.name AS layout_name,
      (SELECT COUNT(*) FROM card_instances WHERE import_job_id = ij.id) AS instance_count
    FROM import_jobs ij
    LEFT JOIN layouts l ON l.id = ij.layout_id
    ORDER BY ij.created_at DESC
  `).all();
  rows.forEach((r) => {
    if (r.mappings) r.mappings = typeof r.mappings === 'string' ? JSON.parse(r.mappings) : r.mappings;
    if (r.last_sync_stats) r.last_sync_stats = typeof r.last_sync_stats === 'string' ? JSON.parse(r.last_sync_stats) : r.last_sync_stats;
  });
  res.json(rows);
});

// Get single import job
router.get('/:id', async (req, res) => {
  const db = getDb();
  const row = await db.prepare(`
    SELECT ij.*, l.name AS layout_name,
      (SELECT COUNT(*) FROM card_instances WHERE import_job_id = ij.id) AS instance_count
    FROM import_jobs ij
    LEFT JOIN layouts l ON l.id = ij.layout_id
    WHERE ij.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.mappings) row.mappings = typeof row.mappings === 'string' ? JSON.parse(row.mappings) : row.mappings;
  if (row.last_sync_stats) row.last_sync_stats = typeof row.last_sync_stats === 'string' ? JSON.parse(row.last_sync_stats) : row.last_sync_stats;
  res.json(row);
});

// Re-sync an import job (re-fetch source URL and upsert instances)
router.post('/:id/sync', async (req, res) => {
  const db = getDb();
  const job = await db.prepare('SELECT * FROM import_jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });

  const mappings = typeof job.mappings === 'string' ? JSON.parse(job.mappings) : job.mappings;

  try {
    const url = normalizeGoogleSheetsUrl(job.source_url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching source URL`);
    const csvText = await response.text();
    const rows = parseCsvText(csvText);
    if (!rows.length) throw new Error('CSV vide ou sans données');

    const stats = useMysql()
      ? await runImportPipelineAsync(db, {
        rows,
        mode: job.mode,
        layoutId: job.layout_id,
        layoutColumn: job.layout_column,
        idColumn: job.id_column,
        mappings,
        jobId: job.id,
      })
      : runImportPipeline(getSqliteSync(), {
        rows,
        mode: job.mode,
        layoutId: job.layout_id,
        layoutColumn: job.layout_column,
        idColumn: job.id_column,
        mappings,
        jobId: job.id,
      });

    await db.prepare(`UPDATE import_jobs SET last_synced_at = CURRENT_TIMESTAMP, last_sync_stats = ? WHERE id = ?`)
      .run(JSON.stringify(stats), job.id);

    res.json({ ok: true, jobId: job.id, ...stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete import job (does NOT delete instances)
router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM import_jobs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
