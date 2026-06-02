import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT, PROJECTS_DIR } from './paths.js';
import { buildIndex, readTurns, findSessionFile } from './indexer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');
const isProd = process.env.NODE_ENV === 'production';

const app = express();

// In-memory snapshot of the last build, refreshed on demand.
let indexState = { sessions: [], stats: null };
async function refresh(force = false) {
  indexState = await buildIndex({ force });
  return indexState;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, projectsDir: PROJECTS_DIR, projectsDirExists: fs.existsSync(PROJECTS_DIR) });
});

app.get('/api/sessions', async (_req, res) => {
  try {
    if (!indexState.stats) await refresh();
    res.json({ sessions: indexState.sessions, stats: indexState.stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/refresh', async (_req, res) => {
  try {
    await refresh(false);
    res.json({ sessions: indexState.sessions, stats: indexState.stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:id/preview', async (req, res) => {
  try {
    const file = findSessionFile(req.params.id);
    if (!file) return res.status(404).json({ error: 'session not found' });
    const turns = await readTurns(file, 20);
    res.json({ id: req.params.id, turns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the built client in production.
if (isProd && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] reading sessions from ${PROJECTS_DIR}`);
  // Warm the index at startup so the first request is fast.
  refresh().catch((e) => console.warn('[server] initial index failed:', e.message));
});
