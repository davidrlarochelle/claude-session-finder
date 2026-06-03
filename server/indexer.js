import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { PROJECTS_DIR, decodeProjectDir } from './paths.js';
import { loadIndex, upsertSessions, pruneMissing, allSessions } from './db.js';

// Bound work on pathological files. Most sessions are a few hundred lines.
const MAX_LINES = 4000;
const PREVIEW_CHARS = 300;
// Cap the searchable text we keep per session so the FTS index stays bounded.
const CONTENT_CAP = 200_000;

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

/** True when a tool result reports a failure (errored, interrupted, or wrote stderr). */
function isToolError(obj) {
  const r = obj.toolUseResult;
  if (r && (r.interrupted === true || (typeof r.stderr === 'string' && r.stderr.trim() !== ''))) {
    return true;
  }
  const content = obj.message?.content;
  return Array.isArray(content) && content.some((b) => b && b.type === 'tool_result' && b.is_error === true);
}

/**
 * Stream-parse one .jsonl session file into enriched metadata.
 * Reads line by line and stops at MAX_LINES. In the same pass it accumulates
 * token totals, tool-usage counts, error/thinking/skill signals, and a capped
 * searchable text blob for the FTS index.
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
    durationMs: null,
    tokensIn: 0,
    tokensOut: 0,
    toolCounts: {},
    toolCallCount: 0,
    topTool: null,
    errorCount: 0,
    hasThinking: false,
    skill: null,
    stopReason: null,
  };

  // Searchable text, accumulated then cleaned/capped once at the end.
  const contentParts = [];
  let contentLen = 0;
  const pushContent = (s) => {
    if (!s || contentLen >= CONTENT_CAP) return;
    contentParts.push(s);
    contentLen += s.length;
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
      if (obj.attributionSkill) meta.skill = obj.attributionSkill; // last non-null wins
      if (obj.timestamp) {
        if (!meta.firstTs) meta.firstTs = obj.timestamp;
        meta.lastTs = obj.timestamp;
      }

      if (t === 'user') {
        meta.messageCount++;
        const content = obj.message?.content;
        if (isToolResult(content)) {
          if (isToolError(obj)) meta.errorCount++;
        } else {
          const text = extractText(content);
          if (!meta.preview) {
            const cleaned = cleanText(text);
            if (cleaned) meta.preview = cleaned.slice(0, PREVIEW_CHARS);
          }
          pushContent(text);
        }
      } else if (t === 'assistant') {
        meta.messageCount++;
        const msg = obj.message;
        if (msg) {
          if (!meta.model && msg.model) meta.model = msg.model;
          if (msg.usage) {
            meta.tokensIn += msg.usage.input_tokens || 0;
            meta.tokensOut += msg.usage.output_tokens || 0;
          }
          if (msg.stop_reason) meta.stopReason = msg.stop_reason;
          const content = msg.content;
          if (Array.isArray(content)) {
            for (const b of content) {
              if (!b) continue;
              if (b.type === 'tool_use') {
                meta.toolCounts[b.name] = (meta.toolCounts[b.name] || 0) + 1;
                meta.toolCallCount++;
              } else if (b.type === 'thinking') {
                meta.hasThinking = true;
              } else if (b.type === 'text' && typeof b.text === 'string') {
                pushContent(b.text);
              }
            }
          } else if (typeof content === 'string') {
            pushContent(content);
          }
        }
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

  // Derived fields.
  let topTool = null;
  let topN = 0;
  for (const [name, n] of Object.entries(meta.toolCounts)) {
    if (n > topN) {
      topN = n;
      topTool = name;
    }
  }
  meta.topTool = topTool;
  if (meta.firstTs && meta.lastTs) {
    const d = Date.parse(meta.lastTs) - Date.parse(meta.firstTs);
    meta.durationMs = Number.isFinite(d) && d >= 0 ? d : null;
  }
  meta.contentText = cleanText(contentParts.join('\n')).slice(0, CONTENT_CAP);

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
 * Build (or incrementally refresh) the full session index, backed by SQLite.
 * Files whose mtime+size are unchanged are reused without re-parsing; changed
 * files are re-parsed and upserted; rows for deleted files are pruned. The
 * returned list is read back from the DB so it always reflects current state.
 */
export async function buildIndex({ force = false } = {}) {
  const started = Date.now();
  const existing = force ? new Map() : loadIndex();
  const seen = new Set();
  const toUpsert = [];
  let parsed = 0;
  let reused = 0;
  let errors = 0;

  for (const filePath of listSessionFiles()) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    seen.add(filePath);
    const cached = existing.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.sizeBytes === stat.size) {
      reused++;
      continue;
    }
    try {
      const meta = await parseSessionFile(filePath, stat);
      toUpsert.push({ ...meta, path: filePath });
      parsed++;
    } catch (err) {
      errors++;
      console.warn('[indexer] failed to parse', filePath, err.message);
    }
  }

  upsertSessions(toUpsert);
  pruneMissing(seen);
  const sessions = allSessions();

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
