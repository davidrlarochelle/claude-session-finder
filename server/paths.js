import os from 'node:os';
import path from 'node:path';

/**
 * Absolute path to ~/.claude/projects.
 * Overridable via CLAUDE_PROJECTS_DIR — used by the E2E suite to point the
 * server at a deterministic fixtures directory instead of the user's real data.
 */
export const PROJECTS_DIR =
  process.env.CLAUDE_PROJECTS_DIR || path.join(os.homedir(), '.claude', 'projects');

/**
 * Where we persist the parsed index between runs.
 * Overridable via CACHE_DIR so tests can use an isolated, disposable cache.
 */
export const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), '.cache');
export const CACHE_FILE = path.join(CACHE_DIR, 'session-index.json');

/** Server port (see plan). Overridable via PORT. */
export const PORT = Number(process.env.PORT) || 37702;

/**
 * Encoded project dir names replace path separators with "-", but project
 * names themselves can contain "-", so this is ambiguous and only used as a
 * display fallback when a session has no `cwd`. The real path comes from the
 * session's `cwd` field.
 */
export function decodeProjectDir(name) {
  // Leading dash represents the root "/". Best-effort only.
  const withSlashes = name.replace(/-/g, '/');
  return withSlashes.startsWith('/') ? withSlashes : '/' + withSlashes;
}
