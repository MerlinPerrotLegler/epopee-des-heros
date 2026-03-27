import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { DATA_DIR, UPLOADS_DIR } from './paths.js';

import { requireAuth, requireAdmin } from './middleware/sessionAuth.js';
import { closeDb, initDatabase } from './db/database.js';
import { seedBuiltins } from './db/seedBuiltins.js';

import authRouter from './routes/auth.js';
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
import locksRouter from './routes/locks.js';
import adminUsersRouter from './routes/adminUsers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DIST_DIR = join(__dirname, '..', 'frontend', 'dist');
const DEBUG_HTTP = process.env.DEBUG_HTTP === '1' || process.env.BACKEND_DEBUG === '1';
const DEBUG_ERRORS = process.env.DEBUG_ERRORS === '1' || process.env.BACKEND_DEBUG === '1';
// Ensure data directories exist
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();

// Derrière le proxy Vite (dev) ou un reverse proxy : cookies / X-Forwarded-* corrects
app.set('trust proxy', 1);

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret-change-in-production';

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

if (DEBUG_HTTP) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });
    next();
  });
}

app.use(session({
  name: 'cardDesigner.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    path: '/',
  },
}));

// Serve uploaded media files (pas d'auth — les <img> du navigateur n'envoient pas de session)
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes publiques
app.use('/api/auth', authRouter);

// Sous-routes API (avant le préfixe /api générique)
app.use('/api/locks', requireAuth, locksRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminUsersRouter);

// API protégée par session
app.use('/api', requireAuth);
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
  app.use(express.static(DIST_DIR, {
    // index.html toujours à jour (références vers les bons hashes de chunks)
    // fichiers sous /assets/ : noms hashés → cache long
    setHeaders: (res, filepath) => {
      if (filepath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (/[/\\]assets[/\\]/.test(filepath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    // Chunk JS/CSS manquant : ne pas envoyer index.html (sinon erreur MIME / import dynamique)
    if (req.path.startsWith('/assets/')) {
      return res.status(404).type('text/plain').send('Asset not found');
    }
    res.sendFile(join(DIST_DIR, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  const base = `[error] ${req.method} ${req.originalUrl} -> ${err.message}`;
  if (DEBUG_ERRORS) {
    // Evite de logguer les mots de passe en clair
    const safeBody = req.originalUrl.includes('/api/auth/login')
      ? { ...(req.body || {}), password: '***' }
      : req.body;
    console.error(base, '\nbody:', safeBody, '\nstack:', err.stack);
  } else {
    console.error(base);
  }
  res.status(500).json({ error: err.message });
});

// Graceful shutdown
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

async function main() {
  await initDatabase();
  await seedBuiltins();

  app.listen(PORT, () => {
    console.log(`Card Designer API running on http://localhost:${PORT}`);
    const admin = process.env.ADMIN_USER || process.env.AUTH_USER || 'admin';
    console.log(`Auth: session login (admin: ${admin})`);
    console.log(`[server] DATA_DIR=${DATA_DIR}`);
    console.log(`[server] UPLOADS_DIR=${UPLOADS_DIR}`);
    if (DEBUG_HTTP) console.log('[debug] HTTP logs enabled (DEBUG_HTTP=1)');
    if (DEBUG_ERRORS) console.log('[debug] Detailed error logs enabled (DEBUG_ERRORS=1)');
  });
}

main().catch((err) => {
  console.error('[server] Fatal:', err);
  process.exit(1);
});
