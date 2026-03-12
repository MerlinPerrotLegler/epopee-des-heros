import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

import { basicAuth } from './middleware/auth.js';
import { closeDb, getDb } from './db/database.js';
import { seedBuiltins } from './db/seedBuiltins.js';

import layoutsRouter from './routes/layouts.js';
import componentsRouter from './routes/components.js';
import cardsRouter from './routes/cards.js';
import mediaRouter from './routes/media.js';
import snapshotsRouter from './routes/snapshots.js';
import cardTypesRouter from './routes/cardTypes.js';
import exportRouter from './routes/export.js';
import configRouter from './routes/config.js';
import fontsRouter from './routes/fonts.js';
import importJobsRouter from './routes/importJobs.js';
import missingMediaRouter from './routes/missingMedia.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DIST_DIR = join(__dirname, '..', 'frontend', 'dist');
const DATA_DIR = join(__dirname, 'data');
const UPLOADS_DIR = join(DATA_DIR, 'uploads');

// Ensure data directories exist
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

// Seed built-in assets (runs once per asset, idempotent)
getDb()           // initialise la DB + schema
seedBuiltins()

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded media files (pas d'auth — les <img> du navigateur n'envoient pas d'en-tête)
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth + API routes
app.use('/api', basicAuth);
app.use('/api/layouts', layoutsRouter);
app.use('/api/components', componentsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/card-types', cardTypesRouter);
app.use('/api/export', exportRouter);
app.use('/api/config', configRouter);
app.use('/api/fonts', fontsRouter);
app.use('/api/import-jobs', importJobsRouter);
app.use('/api/missing-media', missingMediaRouter);

// Serve Vue frontend in production
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(join(DIST_DIR, 'index.html'));
    }
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// Graceful shutdown
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

app.listen(PORT, () => {
  console.log(`Card Designer API running on http://localhost:${PORT}`);
  console.log(`Auth: ${process.env.AUTH_USER || 'admin'} / ${process.env.AUTH_PASS ? '****' : 'changeme'}`);
});
