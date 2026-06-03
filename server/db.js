import fs from 'node:fs';
import Database from 'better-sqlite3';
import { CACHE_DIR, DB_FILE } from './paths.js';

/**
 * SQLite-backed index store. Replaces the old JSON cache: one embedded DB file
 * (`.cache/sessions.db`) holds the enriched per-session metadata in `sessions`
 * plus an FTS5 content index in `sessions_fts` (populated now, queried in a
 * later phase). Incremental refresh revalidates rows by mtime+size, exactly as
 * the JSON cache did, so unchanged files are never re-parsed.
 */

/** Columns persisted per session. `path` (the .jsonl absolute path) is the PK. */
const COLUMNS = [
  'path', 'id', 'title', 'preview', 'cwd', 'projectDir', 'project', 'gitBranch',
  'model', 'version', 'messageCount', 'countCapped', 'mtimeMs', 'sizeBytes',
  'firstTs', 'lastTs', 'durationMs', 'tokensIn', 'tokensOut', 'toolCounts',
  'toolCallCount', 'topTool', 'errorCount', 'hasThinking', 'skill', 'stopReason',
];

let db = null;

function getDb() {
  if (db) return db;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      path TEXT PRIMARY KEY,
      id TEXT, title TEXT, preview TEXT, cwd TEXT, projectDir TEXT, project TEXT,
      gitBranch TEXT, model TEXT, version TEXT, messageCount INTEGER, countCapped INTEGER,
      mtimeMs REAL, sizeBytes INTEGER, firstTs TEXT, lastTs TEXT, durationMs INTEGER,
      tokensIn INTEGER, tokensOut INTEGER, toolCounts TEXT, toolCallCount INTEGER,
      topTool TEXT, errorCount INTEGER, hasThinking INTEGER, skill TEXT, stopReason TEXT
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
      id UNINDEXED, content, tokenize='unicode61 remove_diacritics 2'
    );
  `);
  return db;
}

/** SQLite integers/JSON → the in-memory session shape the API and UI expect. */
function rowToSession(row) {
  return {
    ...row,
    countCapped: !!row.countCapped,
    hasThinking: !!row.hasThinking,
    toolCounts: row.toolCounts ? JSON.parse(row.toolCounts) : {},
  };
}

/** Bind object covering every column (better-sqlite3 rejects `undefined`). */
function toRow(entry) {
  const r = {};
  for (const c of COLUMNS) r[c] = entry[c] ?? null;
  r.countCapped = entry.countCapped ? 1 : 0;
  r.hasThinking = entry.hasThinking ? 1 : 0;
  r.toolCounts = JSON.stringify(entry.toolCounts || {});
  return r;
}

/** Current index keyed by file path, for incremental mtime+size revalidation. */
export function loadIndex() {
  const rows = getDb().prepare('SELECT * FROM sessions').all();
  const map = new Map();
  for (const row of rows) map.set(row.path, rowToSession(row));
  return map;
}

/**
 * Upsert freshly-parsed sessions (and their FTS content) in one transaction.
 * Each entry is a parsed meta object plus `path` and optional `contentText`.
 */
export function upsertSessions(entries) {
  if (!entries.length) return;
  const conn = getDb();
  const cols = COLUMNS.join(', ');
  const placeholders = COLUMNS.map((c) => `@${c}`).join(', ');
  const updates = COLUMNS.filter((c) => c !== 'path')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ');
  const upsert = conn.prepare(
    `INSERT INTO sessions (${cols}) VALUES (${placeholders})
     ON CONFLICT(path) DO UPDATE SET ${updates}`
  );
  const delFts = conn.prepare('DELETE FROM sessions_fts WHERE id = ?');
  const insFts = conn.prepare('INSERT INTO sessions_fts (id, content) VALUES (?, ?)');

  const tx = conn.transaction((items) => {
    for (const entry of items) {
      upsert.run(toRow(entry));
      delFts.run(entry.id);
      insFts.run(entry.id, entry.contentText || '');
    }
  });
  tx(entries);
}

/** Drop rows (and FTS content) for files that no longer exist on disk. */
export function pruneMissing(existingPaths) {
  const conn = getDb();
  const known = conn.prepare('SELECT path, id FROM sessions').all();
  const del = conn.prepare('DELETE FROM sessions WHERE path = ?');
  const delFts = conn.prepare('DELETE FROM sessions_fts WHERE id = ?');
  const tx = conn.transaction(() => {
    for (const r of known) {
      if (!existingPaths.has(r.path)) {
        del.run(r.path);
        delFts.run(r.id);
      }
    }
  });
  tx();
}

/** All indexed sessions in API/UI shape (the .jsonl `path` is kept internal). */
export function allSessions() {
  const rows = getDb().prepare('SELECT * FROM sessions ORDER BY mtimeMs DESC').all();
  return rows.map((row) => {
    const { path: _path, ...rest } = rowToSession(row);
    return rest;
  });
}
