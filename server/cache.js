import fs from 'node:fs';
import { CACHE_DIR, CACHE_FILE } from './paths.js';

/**
 * On-disk cache keyed by absolute file path. Each entry stores the parsed
 * session metadata plus the `mtimeMs` and `sizeBytes` it was parsed from, so
 * we can cheaply revalidate via fs.stat and skip re-parsing unchanged files.
 */
export function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && data.entries) return data.entries;
  } catch {
    // missing or corrupt cache → start fresh
  }
  return {};
}

export function saveCache(entries) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ version: 1, entries }), 'utf8');
  } catch (err) {
    console.warn('[cache] failed to persist index:', err.message);
  }
}
