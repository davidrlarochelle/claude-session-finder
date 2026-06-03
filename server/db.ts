import fs from 'node:fs';
import Database from 'better-sqlite3';
import type { SessionRecord, Session, SearchResult } from '../shared/types.js';
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
] as const;

/**
 * Raw column shape as stored in SQLite. Booleans are stored as 0|1 integers,
 * toolCounts is a JSON string, everything else maps directly.
 */
interface SessionRow {
  path: string;
  id: string;
  title: string | null;
  preview: string | null;
  cwd: string | null;
  projectDir: string;
  project: string | null;
  gitBranch: string | null;
  model: string | null;
  version: string | null;
  messageCount: number;
  countCapped: 0 | 1;
  mtimeMs: number;
  sizeBytes: number;
  firstTs: string | null;
  lastTs: string | null;
  durationMs: number | null;
  tokensIn: number;
  tokensOut: number;
  toolCounts: string;       // JSON-encoded ToolCounts
  toolCallCount: number;
  topTool: string | null;
  errorCount: number;
  hasThinking: 0 | 1;
  skill: string | null;
  stopReason: string | null;
}

/** Minimal row shape returned from the prune query (path + id only). */
interface PruneRow {
  path: string;
  id: string;
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
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
function rowToSession(row: SessionRow): SessionRecord {
  return {
    ...row,
    // Session requires title/preview/project/projectDir as non-nullable strings;
    // guard against NULL values that SQLite may return for legacy rows.
    title: row.title ?? '',
    preview: row.preview ?? '',
    project: row.project ?? '',
    countCapped: !!row.countCapped,
    hasThinking: !!row.hasThinking,
    toolCounts: row.toolCounts ? (JSON.parse(row.toolCounts) as Record<string, number>) : {},
  };
}

/** Bind object covering every column (better-sqlite3 rejects `undefined`). */
function toRow(entry: SessionRecord): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const c of COLUMNS) r[c] = (entry as unknown as Record<string, unknown>)[c] ?? null;
  r['countCapped'] = entry.countCapped ? 1 : 0;
  r['hasThinking'] = entry.hasThinking ? 1 : 0;
  r['toolCounts'] = JSON.stringify(entry.toolCounts || {});
  return r;
}

/** Current index keyed by file path, for incremental mtime+size revalidation. */
export function loadIndex(): Map<string, SessionRecord> {
  const rows = getDb().prepare('SELECT * FROM sessions').all() as SessionRow[];
  const map = new Map<string, SessionRecord>();
  for (const row of rows) map.set(row.path, rowToSession(row));
  return map;
}

/**
 * Upsert freshly-parsed sessions (and their FTS content) in one transaction.
 * Each entry is a parsed meta object plus `path` and optional `contentText`.
 */
export function upsertSessions(entries: SessionRecord[]): void {
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

  const tx = conn.transaction((items: SessionRecord[]) => {
    for (const entry of items) {
      upsert.run(toRow(entry));
      delFts.run(entry.id);
      insFts.run(entry.id, entry.contentText ?? '');
    }
  });
  tx(entries);
}

/** Drop rows (and FTS content) for files that no longer exist on disk. */
export function pruneMissing(existingPaths: Set<string>): void {
  const conn = getDb();
  const known = conn.prepare('SELECT path, id FROM sessions').all() as PruneRow[];
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
export function allSessions(): Session[] {
  const rows = getDb().prepare('SELECT * FROM sessions ORDER BY mtimeMs DESC').all() as SessionRow[];
  return rows.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { path: _path, contentText: _contentText, ...rest } = rowToSession(row);
    return rest;
  });
}

/**
 * Turn free-text into a safe FTS5 MATCH expression: lowercase, keep only
 * letter/number/underscore tokens (so no FTS operators can leak in), and
 * prefix-match each so search behaves as-you-type. Returns null when empty.
 */
function buildMatch(query: string): string | null {
  const terms = query.toLowerCase().match(/[\p{L}\p{N}_]+/gu);
  if (!terms || terms.length === 0) return null;
  return terms.map((t) => `${t}*`).join(' ');
}

// snippet() col 1 = `content`. Matched terms are wrapped in the literal U+0001
// (open) / U+0002 (close) control chars below, so the client can render
// highlights without HTML injection. Keep the sentinels in sync with the
// renderSnippet() parser in SessionRow.tsx.
const SEARCH_SQL = `
  SELECT s.*, snippet(sessions_fts, 1, '', '', '…', 12) AS snippet
  FROM sessions_fts
  JOIN sessions s ON s.id = sessions_fts.id
  WHERE sessions_fts MATCH ?
  ORDER BY bm25(sessions_fts)
  LIMIT ?
`;

/** Full-text search over conversation content, ranked by BM25 relevance. */
export function searchSessions(query: string, limit = 100): SearchResult[] {
  const match = buildMatch(query);
  if (!match) return [];
  const rows = getDb().prepare(SEARCH_SQL).all(match, limit) as (SessionRow & { snippet: string })[];
  return rows.map((row) => {
    const { snippet, ...rawRow } = row;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { path: _path, contentText: _contentText, ...session } = rowToSession(rawRow);
    return { ...session, snippet };
  });
}
