/**
 * Deterministic test fixtures that replicate the on-disk shape of real
 * Claude Code conversations (`~/.claude/projects/<encoded>/<uuid>.jsonl`).
 *
 * The envelope of every line mirrors what the CLI actually writes — parentUuid,
 * isSidechain, uuid, timestamp, userType, entrypoint, cwd, sessionId, version,
 * gitBranch, slug, plus the noise line types (permission-mode, last-prompt,
 * file-history-snapshot, attachment) and the full block zoo (thinking, text,
 * tool_use, tool_result). The CONTENT is entirely synthetic so no private data
 * is committed, but the structure is real enough to exercise the indexer the
 * same way production data does.
 *
 * This module is the single source of truth: `prepare-fixtures.js` consumes
 * `SESSIONS` to write the files, and the spec files import the same constants
 * to assert against. Keep derived expectations (titles, ordering) here.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Disposable, git-ignored locations the test server is pointed at. */
export const TMP_DIR = path.join(__dirname, '..', '.tmp');
export const PROJECTS_DIR = path.join(TMP_DIR, 'projects');
export const CACHE_DIR = path.join(TMP_DIR, 'cache');

/** Port the production test server listens on (kept off the dev 37702). */
export const TEST_PORT = 37799;
export const BASE_URL = `http://localhost:${TEST_PORT}`;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

/**
 * Session specs. `dir` is the encoded project directory (path separators → "-",
 * exactly like the real CLI). `events` is the ordered list of JSONL lines.
 * `ageMs` drives the file mtime (set explicitly so "recent"/"oldest"/"size"
 * sorting is fully deterministic regardless of checkout time).
 */
export const SESSIONS = [
  {
    id: '1a111111-1111-4111-8111-111111111111',
    dir: '-Users-test-code-webapp',
    cwd: '/Users/test/code/webapp',
    project: 'webapp',
    gitBranch: 'main',
    version: '2.1.146',
    model: 'claude-opus-4-8',
    title: 'Add dark mode toggle to settings page',
    ageMs: 2 * MIN,
    firstUserText:
      'Add a dark mode toggle to the settings page, persisting the choice in localStorage.',
    events: [
      { kind: 'permission-mode' },
      { kind: 'ai-title', aiTitle: 'Add dark mode toggle to settings page' },
      {
        kind: 'user',
        text: 'Add a dark mode toggle to the settings page, persisting the choice in localStorage.',
      },
      {
        kind: 'assistant',
        blocks: [
          { type: 'thinking', thinking: 'They want a persisted theme toggle. Edit Settings.jsx and add a hook.' },
          { type: 'text', text: "I'll add a theme toggle backed by a useTheme hook and localStorage." },
        ],
      },
      { kind: 'assistant', blocks: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'src/Settings.jsx' } }] },
      { kind: 'tool_result', text: 'Error: EACCES writing src/Settings.jsx', error: true },
      { kind: 'malformed' },
      { kind: 'user', text: 'Looks great, can you also respect the OS preference on first load?' },
      { kind: 'assistant', blocks: [{ type: 'text', text: 'Done — it now falls back to prefers-color-scheme when nothing is stored.' }] },
    ],
  },
  {
    id: '2b222222-2222-4222-8222-222222222222',
    dir: '-Users-test-code-webapp',
    cwd: '/Users/test/code/webapp',
    project: 'webapp',
    gitBranch: 'fix/perf',
    version: '2.1.145',
    model: 'claude-sonnet-4-6',
    title: 'Investigate slow dashboard query',
    ageMs: 3 * HOUR,
    firstUserText: 'The dashboard takes 8 seconds to load. Can you profile the main query?',
    events: [
      { kind: 'ai-title', aiTitle: 'Investigate slow dashboard query' },
      { kind: 'user', text: 'The dashboard takes 8 seconds to load. Can you profile the main query?' },
      {
        kind: 'assistant',
        skill: 'performance-auditor',
        blocks: [
          { type: 'thinking', thinking: 'Likely an N+1. Check the widgets loop.' },
          { type: 'text', text: 'Let me look at the query plan for the dashboard endpoint.' },
        ],
      },
      { kind: 'assistant', blocks: [{ type: 'tool_use', name: 'Bash', input: { command: 'EXPLAIN ANALYZE ...' } }] },
      { kind: 'tool_result', text: 'Seq Scan on widgets ...' },
      { kind: 'assistant', blocks: [{ type: 'text', text: 'The N+1 was in the widgets loop; batching it cuts load to ~400ms.' }] },
    ],
  },
  {
    id: '3c333333-3333-4333-8333-333333333333',
    dir: '-Users-test-code-api-server',
    cwd: '/Users/test/code/api-server',
    project: 'api-server',
    gitBranch: 'feature/jwt',
    version: '2.1.146',
    model: 'claude-opus-4-8',
    title: 'Migrate auth to JWT refresh tokens',
    ageMs: 26 * HOUR,
    firstUserText: 'Migrate our cookie-session auth to JWT access + refresh tokens.',
    // Padded with many exchanges so this is reliably the LARGEST file (size sort).
    events: buildLongConversation('Migrate auth to JWT refresh tokens'),
  },
  {
    id: '4d444444-4444-4444-8444-444444444444',
    dir: '-Users-test-code-scripts',
    cwd: '/Users/test/code/scripts',
    project: 'scripts',
    gitBranch: 'main',
    version: '2.1.144',
    model: 'claude-haiku-4-5-20251001',
    // No ai-title line → title must fall back to the first user message.
    title: 'Write a bash script that rotates log files older than 7 days.',
    ageMs: 5 * HOUR,
    firstUserText: 'Write a bash script that rotates log files older than 7 days.',
    events: [
      { kind: 'user', text: 'Write a bash script that rotates log files older than 7 days.' },
      { kind: 'assistant', blocks: [{ type: 'text', text: 'Here is a script using find with -mtime and gzip.' }] },
    ],
  },
  {
    // claude-mem background observer run — hidden by default in the UI.
    id: '5e555555-5555-4555-8555-555555555555',
    dir: '-Users-test--claude-mem-observer-sessions',
    cwd: '/Users/test/.claude-mem/observer-sessions',
    project: 'observer-sessions',
    gitBranch: 'main',
    version: '2.1.146',
    model: 'claude-haiku-4-5-20251001',
    title: 'Observed: summarize recent changes',
    ageMs: 1 * HOUR,
    firstUserText: 'Summarize the observations from the latest session.',
    events: [
      { kind: 'ai-title', aiTitle: 'Observed: summarize recent changes' },
      { kind: 'user', text: 'Summarize the observations from the latest session.' },
      { kind: 'assistant', blocks: [{ type: 'text', text: 'Captured 4 observations across 2 files.' }] },
    ],
  },
];

/** Build a long, realistic exchange to inflate file size for the size-sort test. */
function buildLongConversation(_topic) {
  const events = [
    { kind: 'ai-title', aiTitle: 'Migrate auth to JWT refresh tokens' },
    { kind: 'user', text: 'Migrate our cookie-session auth to JWT access + refresh tokens.' },
  ];
  for (let i = 0; i < 30; i++) {
    events.push({
      kind: 'assistant',
      blocks: [
        { type: 'thinking', thinking: `Step ${i}: reasoning about token rotation, expiry windows and revocation lists in detail.` },
        { type: 'text', text: `Step ${i}: implemented part of the JWT flow — issuing, signing, verifying and rotating refresh tokens with a generous amount of explanatory detail so this conversation file is comfortably larger than the others on disk.` },
      ],
    });
    events.push({ kind: 'assistant', blocks: [{ type: 'tool_use', name: 'Edit', input: { file_path: `src/auth/step${i}.ts` } }] });
    events.push({ kind: 'tool_result', text: `Applied change ${i} to the auth module successfully with no errors reported.` });
    events.push({ kind: 'user', text: `Looks good for step ${i}, continue with the next part of the migration please.` });
  }
  return events;
}

/* ---- Derived expectations used by the specs (single source of truth) ---- */

const byId = Object.fromEntries(SESSIONS.map((s) => [s.id, s]));
export const session = (key) => byId[key] || SESSIONS.find((s) => s.title === key);

export const VISIBLE = SESSIONS.filter((s) => s.project !== 'observer-sessions');
export const OBSERVER = SESSIONS.filter((s) => s.project === 'observer-sessions');

const sortByAge = (asc) => [...VISIBLE].sort((a, b) => (asc ? a.ageMs - b.ageMs : b.ageMs - a.ageMs)).map((s) => s.id);
export const ORDER = {
  // Most recent first = smallest age first (ascending age).
  recent: sortByAge(true),
  // Oldest first = largest age first.
  oldest: sortByAge(false),
};

/** Total messages the indexer will count = every user/assistant line (incl. tool_result-user). */
export function expectedMessageCount(spec) {
  return spec.events.filter((e) => e.kind === 'user' || e.kind === 'assistant' || e.kind === 'tool_result').length;
}

/**
 * Token totals the indexer will sum. Mirrors renderEvent's synthetic usage
 * (`input = 1200 + n`, `output = 80 + n`, where n is the event's index).
 */
export function expectedTokens(spec) {
  let tokensIn = 0;
  let tokensOut = 0;
  spec.events.forEach((e, i) => {
    if (e.kind === 'assistant') {
      tokensIn += 1200 + i;
      tokensOut += 80 + i;
    }
  });
  return { tokensIn, tokensOut };
}

/** Tool-use counts by name across a session's assistant blocks. */
export function expectedToolCounts(spec) {
  const counts = {};
  for (const e of spec.events) {
    if (e.kind === 'assistant' && Array.isArray(e.blocks)) {
      for (const b of e.blocks) {
        if (b.type === 'tool_use') counts[b.name] = (counts[b.name] || 0) + 1;
      }
    }
  }
  return counts;
}

export function expectedToolCallCount(spec) {
  return Object.values(expectedToolCounts(spec)).reduce((a, b) => a + b, 0);
}

/** Number of tool_result lines flagged as errors. */
export function expectedErrorCount(spec) {
  return spec.events.filter((e) => e.kind === 'tool_result' && e.error).length;
}

/** Visible sessions that recorded at least one tool error. */
export const ERROR_SESSIONS = VISIBLE.filter((s) => expectedErrorCount(s) > 0);

/** The resume command the UI renders for a session. */
export function resumeCommand(spec) {
  return `cd "${spec.cwd}" && claude --resume ${spec.id}`;
}

/* ------------------------- JSONL line builders ------------------------- */

let _seq = 0;
const uuid = (id, n) => `${id.slice(0, 8)}-evt-${String(n).padStart(4, '0')}`;

/** Render one spec event into a real-shaped JSONL object (or `null` to drop). */
function renderEvent(spec, evt, n, prevUuid, tsIso) {
  const base = {
    parentUuid: prevUuid,
    isSidechain: false,
    uuid: uuid(spec.id, n),
    timestamp: tsIso,
    userType: 'external',
    entrypoint: 'cli',
    cwd: spec.cwd,
    sessionId: spec.id,
    version: spec.version,
    gitBranch: spec.gitBranch,
    slug: spec.project,
  };

  switch (evt.kind) {
    case 'permission-mode':
      return { type: 'permission-mode', permissionMode: 'default', sessionId: spec.id };
    case 'last-prompt':
      return { type: 'last-prompt', leafUuid: uuid(spec.id, n), sessionId: spec.id };
    case 'ai-title':
      return { type: 'ai-title', aiTitle: evt.aiTitle, sessionId: spec.id };
    case 'malformed':
      return { __raw: '{ this is intentionally not valid json' };
    case 'user':
      return { ...base, promptId: `prompt-${uuid(spec.id, n)}`, type: 'user', message: { role: 'user', content: evt.text } };
    case 'tool_result':
      return {
        ...base,
        promptId: `prompt-${uuid(spec.id, n)}`,
        type: 'user',
        toolUseResult: {
          stdout: evt.error ? '' : evt.text,
          stderr: evt.error ? evt.text : '',
          interrupted: false,
        },
        sourceToolAssistantUUID: uuid(spec.id, n - 1),
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: `toolu_${n}`, content: evt.text, is_error: !!evt.error }],
        },
      };
    case 'assistant':
      return {
        ...base,
        requestId: `req_${uuid(spec.id, n)}`,
        attributionSkill: evt.skill ?? null,
        type: 'assistant',
        message: {
          model: spec.model,
          id: `msg_${uuid(spec.id, n)}`,
          type: 'message',
          role: 'assistant',
          content: evt.blocks,
          stop_reason: 'end_turn',
          stop_sequence: null,
          stop_details: null,
          usage: { input_tokens: 1200 + n, output_tokens: 80 + n },
        },
      };
    default:
      return null;
  }
}

/** Serialize a session spec to .jsonl text (one JSON object per line). */
export function renderSessionJsonl(spec, nowMs) {
  const startMs = nowMs - spec.ageMs;
  let prevUuid = null;
  const lines = [];
  spec.events.forEach((evt, i) => {
    const obj = renderEvent(spec, evt, i, prevUuid, new Date(startMs + i * 1000).toISOString());
    if (!obj) return;
    if (obj.__raw !== undefined) {
      lines.push(obj.__raw);
      return;
    }
    if (obj.uuid) prevUuid = obj.uuid;
    lines.push(JSON.stringify(obj));
  });
  _seq++;
  return lines.join('\n') + '\n';
}
