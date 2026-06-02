import os from 'node:os';
import path from 'node:path';

/** Absolute path to ~/.claude/projects */
export const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/** Where we persist the parsed index between runs. */
export const CACHE_DIR = path.join(process.cwd(), '.cache');
export const CACHE_FILE = path.join(CACHE_DIR, 'session-index.json');

/** Server port (see plan). */
export const PORT = 37702;

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
