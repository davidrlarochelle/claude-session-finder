import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { PROJECTS_DIR, decodeProjectDir } from './paths.js';
import { loadCache, saveCache } from './cache.js';

// Bound work on pathological files. Most sessions are a few hundred lines.
const MAX_LINES = 4000;
const PREVIEW_CHARS = 300;

/** Strip system/command wrappers and collapse whitespace for a human preview. */
function cleanText(s) {
  if (!s) return '';
  return s
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, ' ')
    .replace(/<command-[a-z-]+>[\s\S]*?<\/command-[a-z-]+>/gi, ' ')
    .replace(/<local-command-[a-z-]+>[\s\S]*?<\/local-command-[a-z-]+>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pull plain human/assistant text out of a message.content (string or block array). */
function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n');
  }
  return '';
}

/** True when a user line is a tool result rather than a real human turn. */
function isToolResult(content) {
  return (
    Array.isArray(content) &&
    content.some((b) => b && b.type === 'tool_result')
  );
}

/**
 * Stream-parse one .jsonl session file into lightweight metadata.
 * Reads line by line and stops at MAX_LINES.
 */
export async function parseSessionFile(filePath, stat) {
  const id = path.basename(filePath, '.jsonl');
  const meta = {
    id,
    title: null,
    preview: '',
    cwd: null,
    projectDir: path.basename(path.dirname(filePath)),
    gitBranch: null,
    model: null,
    version: null,
    messageCount: 0,
    countCapped: false,
    mtimeMs: stat.mtimeMs,
    sizeBytes: stat.size,
    firstTs: null,
    lastTs: null,
  };

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lines = 0;
  try {
    for await (const line of rl) {
      if (!line) continue;
      if (++lines > MAX_LINES) {
        meta.countCapped = true;
        break;
      }
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue; // skip malformed line
      }

      const t = obj.type;

      if (t === 'ai-title' && obj.aiTitle) {
        meta.title = obj.aiTitle; // last one wins
        continue;
      }

      if (obj.cwd && !meta.cwd) meta.cwd = obj.cwd;
      if (obj.gitBranch && !meta.gitBranch) meta.gitBranch = obj.gitBranch;
      if (obj.version && !meta.version) meta.version = obj.version;
      if (obj.timestamp) {
        if (!meta.firstTs) meta.firstTs = obj.timestamp;
        meta.lastTs = obj.timestamp;
      }

      if (t === 'user') {
        meta.messageCount++;
        const content = obj.message?.content;
        if (!meta.preview && !isToolResult(content)) {
          const cleaned = cleanText(extractText(content));
          if (cleaned) meta.preview = cleaned.slice(0, PREVIEW_CHARS);
        }
      } else if (t === 'assistant') {
        meta.messageCount++;
        if (!meta.model && obj.message?.model) meta.model = obj.message.model;
      }
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  if (!meta.title) {
    meta.title = meta.preview ? meta.preview.slice(0, 80) : '(untitled session)';
  }
  meta.project = meta.cwd ? path.basename(meta.cwd) : decodeProjectDir(meta.projectDir).split('/').pop();
  return meta;
}

/** Longer, lazily-loaded preview: first `limit` human/assistant text turns. */
export async function readTurns(filePath, limit = 20) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const turns = [];
  let lines = 0;
  try {
    for await (const line of rl) {
      if (!line) continue;
      if (++lines > MAX_LINES) break;
      if (turns.length >= limit) break;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      if (obj.type !== 'user' && obj.type !== 'assistant') continue;
      const content = obj.message?.content;
      if (obj.type === 'user' && isToolResult(content)) continue;
      const text = cleanText(extractText(content));
      if (!text) continue;
      turns.push({ role: obj.type, text: text.slice(0, 2000), ts: obj.timestamp || null });
    }
  } finally {
    rl.close();
    stream.destroy();
  }
  return turns;
}

/** List every session .jsonl file across all project dirs. */
function listSessionFiles() {
  const files = [];
  let projectDirs;
  try {
    projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return files; // PROJECTS_DIR missing
  }
  for (const d of projectDirs) {
    if (!d.isDirectory()) continue;
    const dirPath = path.join(PROJECTS_DIR, d.name);
    let entries;
    try {
      entries = fs.readdirSync(dirPath);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name.endsWith('.jsonl')) files.push(path.join(dirPath, name));
    }
  }
  return files;
}

/**
 * Build (or incrementally refresh) the full session index.
 * Reuses cached metadata for files whose mtime+size are unchanged.
 */
export async function buildIndex({ force = false } = {}) {
  const started = Date.now();
  const cache = force ? {} : loadCache();
  const nextCache = {};
  const sessions = [];
  let parsed = 0;
  let reused = 0;
  let errors = 0;

  const files = listSessionFiles();
  for (const filePath of files) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    const cached = cache[filePath];
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.sizeBytes === stat.size) {
      nextCache[filePath] = cached;
      sessions.push(cached);
      reused++;
      continue;
    }
    try {
      const meta = await parseSessionFile(filePath, stat);
      nextCache[filePath] = meta;
      sessions.push(meta);
      parsed++;
    } catch (err) {
      errors++;
      console.warn('[indexer] failed to parse', filePath, err.message);
    }
  }

  saveCache(nextCache);
  const ms = Date.now() - started;
  console.log(
    `[indexer] ${sessions.length} sessions (parsed ${parsed}, reused ${reused}, errors ${errors}) in ${ms}ms`
  );
  return { sessions, stats: { parsed, reused, errors, ms, total: sessions.length } };
}

/** Resolve a session id back to its file path (searches all project dirs). */
export function findSessionFile(id) {
  if (!/^[a-f0-9-]{8,}$/i.test(id)) return null; // guard against traversal
  let projectDirs;
  try {
    projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const d of projectDirs) {
    if (!d.isDirectory()) continue;
    const candidate = path.join(PROJECTS_DIR, d.name, `${id}.jsonl`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
