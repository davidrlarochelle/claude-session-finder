/**
 * (Re)build the fixture projects tree the E2E server reads from.
 *
 * Run before the test server starts (see playwright.config.ts `webServer`):
 *   - wipes any previous fixtures + cache so every run starts clean,
 *   - writes each session as a realistic .jsonl file under its encoded dir,
 *   - sets each file's mtime explicitly so sort order is deterministic.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  PROJECTS_DIR,
  CACHE_DIR,
  TMP_DIR,
  SESSIONS,
  renderSessionJsonl,
} from '../fixtures/sessions.js';
import type { SessionSpec } from '../fixtures/sessions.js';

function rmrf(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function main(): void {
  rmrf(TMP_DIR);
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const now = Date.now();
  for (const spec of SESSIONS) {
    const dir = path.join(PROJECTS_DIR, spec.dir);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${spec.id}.jsonl`);
    fs.writeFileSync(file, renderSessionJsonl(spec, now), 'utf8');

    // mtime drives "recent"/"oldest" sorting and the relative-time label.
    const when = new Date(now - spec.ageMs);
    fs.utimesSync(file, when, when);
  }

  console.log(`[fixtures] wrote ${SESSIONS.length} sessions to ${PROJECTS_DIR}`);
}

main();
