import { test, expect } from '@playwright/test';
import { SESSIONS, session, expectedMessageCount } from '../fixtures/sessions.js';

test.describe('API', () => {
  test('GET /api/health reports the fixtures dir exists', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.projectsDirExists).toBe(true);
    expect(body.projectsDir).toContain('.tmp');
  });

  test('GET /api/sessions returns every indexed session with metadata', async ({ request }) => {
    const res = await request.get('/api/sessions');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.sessions).toHaveLength(SESSIONS.length);
    expect(body.stats.total).toBe(SESSIONS.length);
    expect(body.stats.errors).toBe(0); // the malformed line is skipped, not fatal

    const s = session('Add dark mode toggle to settings page');
    const got = body.sessions.find((x) => x.id === s.id);
    expect(got).toMatchObject({
      project: 'webapp',
      gitBranch: 'main',
      model: s.model,
      messageCount: expectedMessageCount(s),
      cwd: s.cwd,
    });
    expect(got.sizeBytes).toBeGreaterThan(0);
    expect(got.mtimeMs).toBeGreaterThan(0);
  });

  test('GET /api/sessions/:id/preview returns text turns (no tool noise)', async ({ request }) => {
    const s = session('Add dark mode toggle to settings page');
    const res = await request.get(`/api/sessions/${s.id}/preview`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.id).toBe(s.id);
    // user → assistant → (tool_use & tool_result skipped) → user → assistant
    expect(body.turns).toHaveLength(4);
    expect(body.turns[0]).toMatchObject({ role: 'user', text: s.firstUserText });
    expect(body.turns.every((t) => t.role === 'user' || t.role === 'assistant')).toBe(true);
  });

  test('GET /api/sessions/:id/preview 404s for an unknown (but well-formed) id', async ({ request }) => {
    const res = await request.get('/api/sessions/abcdef0123456789abcdef0123456789/preview');
    expect(res.status()).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
  });

  test('GET /api/sessions/:id/preview rejects malformed ids (path-traversal guard)', async ({ request }) => {
    for (const bad of ['short', 'zzzzzzzzzzzz', 'not_valid_id']) {
      const res = await request.get(`/api/sessions/${bad}/preview`);
      expect(res.status()).toBe(404);
    }
  });

  test('GET /favicon.svg is served as an SVG', async ({ request }) => {
    const res = await request.get('/favicon.svg');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('image/svg+xml');
    expect(await res.text()).toContain('<svg');
  });

  test('POST /api/refresh reuses the cache on a no-op rebuild', async ({ request }) => {
    const res = await request.post('/api/refresh');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.stats.total).toBe(SESSIONS.length);
    expect(body.stats.reused).toBe(SESSIONS.length);
  });
});
