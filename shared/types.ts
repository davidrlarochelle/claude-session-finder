/**
 * Types shared across the server and the client. Imported type-only on both
 * sides (`import type { ... }`) so nothing here ends up in a runtime bundle.
 *
 * `Session` is the single shape that flows server (indexer) → SQLite → API →
 * `useSessions` → components. Keep it in sync with `COLUMNS` in server/db.ts.
 */

/** Per-tool invocation counts, keyed by tool name (e.g. { Read: 12, Bash: 3 }). */
export type ToolCounts = Record<string, number>;

/** Enriched per-session metadata as exposed to the client (the .jsonl `path` is dropped). */
export interface Session {
  id: string;
  title: string;
  preview: string;
  cwd: string | null;
  projectDir: string;
  project: string;
  gitBranch: string | null;
  model: string | null;
  version: string | null;
  messageCount: number;
  countCapped: boolean;
  mtimeMs: number;
  sizeBytes: number;
  firstTs: string | null;
  lastTs: string | null;
  durationMs: number | null;
  tokensIn: number;
  tokensOut: number;
  toolCounts: ToolCounts;
  toolCallCount: number;
  topTool: string | null;
  errorCount: number;
  hasThinking: boolean;
  skill: string | null;
  stopReason: string | null;
}

/**
 * Server-internal record: a `Session` plus the absolute .jsonl `path` (primary
 * key, kept out of API responses) and the capped, searchable `contentText`
 * fed to the FTS index.
 */
export interface SessionRecord extends Session {
  path: string;
  contentText?: string;
}

/** Stats returned alongside the session list after an index build/refresh. */
export interface IndexStats {
  parsed: number;
  reused: number;
  errors: number;
  ms: number;
  total: number;
}

/** Response of `GET /api/sessions` and `POST /api/refresh`. */
export interface SessionsResponse {
  sessions: Session[];
  stats: IndexStats;
}

/**
 * A search hit: a full `Session` plus an FTS `snippet`. Matched terms in the
 * snippet are wrapped in the sentinel chars U+0001 (open) / U+0002 (close) so
 * the client can render highlights without any HTML injection.
 */
export interface SearchResult extends Session {
  snippet: string;
}

/** Response of `GET /api/search?q=…`. */
export interface SearchResponse {
  q: string;
  results: SearchResult[];
}

/** A session as rendered in the list — optionally carrying a search snippet. */
export type ListSession = Session & { snippet?: string };

/** A single rendered conversation turn in the detail preview. */
export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  ts: string | null;
}

/** Response of `GET /api/sessions/:id/preview`. */
export interface PreviewResponse {
  id: string;
  turns: Turn[];
}

/** Health probe response of `GET /api/health`. */
export interface HealthResponse {
  ok: boolean;
  projectsDir: string;
  projectsDirExists: boolean;
}

/** Keys of the sort functions offered in the toolbar. */
export type SortKey = 'recent' | 'oldest' | 'size' | 'project' | 'tokens' | 'duration' | 'tools';

/** The main content view: the session list or the analytics dashboard. */
export type ViewKey = 'list' | 'dashboard';
