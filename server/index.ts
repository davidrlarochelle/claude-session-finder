import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SessionsResponse, PreviewResponse, HealthResponse, SearchResponse } from '../shared/types.js';
import { PORT, PROJECTS_DIR } from './paths.js';
import { buildIndex, readTurns, findSessionFile } from './indexer.js';
import { searchSessions } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');
const isProd = process.env.NODE_ENV === 'production';

const app = express();

// In-memory snapshot of the last build, refreshed on demand.
let indexState: SessionsResponse = { sessions: [], stats: { parsed: 0, reused: 0, errors: 0, ms: 0, total: 0 } };

async function refresh(force = false): Promise<SessionsResponse> {
  indexState = await buildIndex({ force });
  return indexState;
}

app.get('/api/health', (_req: Request, res: Response) => {
  const body: HealthResponse = {
    ok: true,
    projectsDir: PROJECTS_DIR,
    projectsDirExists: fs.existsSync(PROJECTS_DIR),
  };
  res.json(body);
});

app.get('/api/sessions', async (_req: Request, res: Response) => {
  try {
    if (!indexState.stats.total && !indexState.stats.parsed) await refresh();
    const body: SessionsResponse = { sessions: indexState.sessions, stats: indexState.stats };
    res.json(body);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/refresh', async (_req: Request, res: Response) => {
  try {
    await refresh(false);
    const body: SessionsResponse = { sessions: indexState.sessions, stats: indexState.stats };
    res.json(body);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/search', async (req: Request, res: Response) => {
  try {
    // Ensure the FTS index is built before the very first query.
    if (!indexState.stats.total && !indexState.stats.parsed) await refresh();
    const q = typeof req.query['q'] === 'string' ? req.query['q'] : '';
    const limit = Math.min(Number(req.query['limit']) || 100, 200);
    const body: SearchResponse = { q, results: searchSessions(q, limit) };
    res.json(body);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/sessions/:id/preview', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    if (!id) return void res.status(400).json({ error: 'missing id' });
    const file = findSessionFile(id);
    if (!file) return void res.status(404).json({ error: 'session not found' });
    const turns = await readTurns(file, 20);
    const body: PreviewResponse = { id, turns };
    res.json(body);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Serve the built client in production.
if (isProd && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] reading sessions from ${PROJECTS_DIR}`);
  // Warm the index at startup so the first request is fast.
  refresh().catch((e: unknown) => console.warn('[server] initial index failed:', (e as Error).message));
});
