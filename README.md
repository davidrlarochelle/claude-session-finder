# 🔍 Claude Session Finder

> A fast, local webapp to **browse, search, and resume** your past Claude Code conversations.

Claude Code stores every conversation as a `<session-uuid>.jsonl` file under `~/.claude/projects/`.
This tool indexes them all and gives you a searchable, sortable list — then lets you copy the exact
`cd … && claude --resume <id>` command to your clipboard in one click.

<p>
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A518-339933?logo=node.js&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white">
</p>

---

## ✨ Features

### Find any conversation
- **Instant search** across title, preview, project, git branch, skill, or session id — sortable by
  date, size, project, **tokens, duration, or tool calls**.
- **Full-text content search** — flip on *Search contents* and the query runs against an embedded
  SQLite **FTS5** index of every conversation, ranked by **BM25** relevance with highlighted snippets.
- **Advanced filters** — narrow by model, git branch, *has tool errors*, or a date range, with an
  active-filter badge and one-click clear.
- **Project sidebar** — filter sessions by working directory, with per-project counts.
- **Observer toggle** — [claude-mem](https://github.com/thedotmack/claude-mem) background observer
  runs are hidden by default and revealed on demand.

### Understand your usage
- **Analytics dashboard** — KPI cards (sessions, tokens in/out, estimated cost, tool calls, total
  time, tool errors), a GitHub-style **activity heatmap**, and ranked breakdowns by project, model,
  and most-used tools. Scopes to the selected project; cost is an estimate from per-model list prices.
- **Rich metadata badges** — every row shows duration, token totals, top tool, and tool-error count;
  the detail panel adds a per-tool breakdown, stop reason, skill attribution, and a thinking indicator.
- **Conversation preview** — the detail panel lazily loads the first ~20 human/assistant turns.

### Resume in one click
- **Copy-paste resume command** — `cd <cwd> && claude --resume <id>` straight to your clipboard,
  from any row or the detail panel.

### Fast, local, polished
- **Virtualized list** that stays smooth with 1000+ sessions.
- **Incremental indexing** — sessions are stream-parsed once into an embedded SQLite database
  (better-sqlite3, WAL); on refresh only changed files (by `mtime`+size) are re-parsed.
- **100 % local & read-only** — nothing leaves your machine; your sessions are never modified.
- **Themes & design styles** — light/dark toggle plus four looks: flat, skeuomorphic, neumorphic,
  liquid glass.

---

## 🚀 Quick start

### Prerequisites

- **Node.js ≥ 18** (Node 22 recommended) and npm
- An existing `~/.claude/projects/` directory (i.e. you've used Claude Code before)

### Install

```bash
git clone https://github.com/davidrlarochelle/claude-session-finder.git
cd claude-session-finder
npm install
```

### Development

Runs Vite (client) on `:5173` and the Express API on `:37702`, with a proxy between them.

```bash
npm run dev
```

→ open **http://localhost:5173**

### Production

Builds the client and serves everything from a single Express server.

```bash
npm run build
npm start
```

→ open **http://localhost:37702**

### Docker (optional)

Mounts your `~/.claude/projects` read-only and serves the app on `:37702`.

```bash
docker compose up
```

→ open **http://localhost:37702**

---

## 🧪 Testing

End-to-end tests run with [Playwright](https://playwright.dev/) against the app in production mode
(a single Express server serving both the client and the API).

```bash
npx playwright install chromium   # one-time browser download
npm run test:e2e                  # run the full suite (headless)
npm run test:e2e:ui               # interactive UI mode
npm run test:e2e:report           # open the last HTML report
```

The suite **never touches your real `~/.claude/projects`**. Before the server boots, a generator
([`tests/setup/prepare-fixtures.ts`](tests/setup/prepare-fixtures.ts)) writes a deterministic tree of
synthetic `.jsonl` sessions that faithfully replicate the on-disk shape of real conversations —
`ai-title` lines, the full user/assistant envelope, `thinking`/`text`/`tool_use`/`tool_result`
blocks, observer runs, and even a malformed line — then points the server at it via the
`CLAUDE_PROJECTS_DIR`, `CACHE_DIR`, and `PORT` env vars. Coverage spans loading, search, sorting, the
project sidebar, the observer toggle, the detail panel, metric badges & advanced filters, the
analytics dashboard, full-text content search, copy-to-clipboard, theming/design styles, and the
REST API (including the path-traversal guard).

---

## 📁 Project structure

```
claude-session-finder/
├── server/                 # Express API (TypeScript, run via tsx — no build step)
│   ├── index.ts            #   routes + static serving in production
│   ├── indexer.ts          #   stream-parses .jsonl files into enriched metadata
│   ├── db.ts               #   SQLite store (better-sqlite3) + FTS5 schema
│   └── paths.ts            #   PROJECTS_DIR, PORT, CACHE_DIR (env-overridable)
├── client/                 # React + Vite + Tailwind (TypeScript)
│   └── src/
│       ├── App.tsx
│       ├── analytics.ts     #   client-side aggregation + cost estimate for the dashboard
│       ├── components/      #   Toolbar, SessionList, SessionRow, DetailPanel, Filters,
│       │                    #   Dashboard, Heatmap, …
│       └── hooks/           #   useSessions, useTheme, useStyle
├── shared/
│   └── types.ts            #   the Session shape shared by server + client
├── tests/                  # Playwright E2E (TypeScript)
│   ├── e2e/                #   spec files
│   ├── fixtures/sessions.ts#   synthetic, real-shaped session fixtures
│   └── setup/              #   fixture generator run before the test server
├── playwright.config.ts
├── tsconfig*.json          #   strict base + server / client / tests projects
└── docker-compose.yml
```

---

## 🔌 API reference

| Method | Endpoint                     | Description                                                      |
| ------ | ---------------------------- | ---------------------------------------------------------------- |
| `GET`  | `/api/health`                | Health check + resolved projects directory                       |
| `GET`  | `/api/sessions`              | All session metadata + index stats                               |
| `GET`  | `/api/search?q=…`            | Full-text search over conversation content (FTS5 + BM25), each hit with a highlighted snippet |
| `GET`  | `/api/sessions/:id/preview`  | First ~20 human/assistant text turns of a session                |
| `POST` | `/api/refresh`               | Re-scan the projects directory (incremental)                     |

---

## ⚙️ How it works

- **`indexer.ts`** stream-parses each `.jsonl` line by line, extracting lightweight metadata
  (title, first-message preview, `cwd`, git branch, model, message count, timestamps, size, plus
  token totals, tool usage, duration, and error/thinking/skill signals). It early-stops and bounds
  the line scan, so even pathological files stay cheap.
- **`db.ts`** persists the parsed index to an embedded SQLite database (`.cache/sessions.db`) via
  better-sqlite3 — a `sessions` table plus a `sessions_fts` FTS5 content index — keyed by each
  file's `mtime`+size. On refresh, unchanged sessions are reused and only modified ones re-parsed.
- **Full-text search** is served from the same database: `GET /api/search` builds a safe FTS5
  `MATCH` expression (tokenized prefix terms — no operators can leak in), orders hits by `bm25()`,
  and returns `snippet()` excerpts whose matches are wrapped in control-char sentinels that the
  client renders as `<mark>` highlights — user content is never interpreted as HTML.
- **`client/`** renders a virtualized list (via `@tanstack/react-virtual`) so large histories scroll
  smoothly, with search/sort/filters, a project sidebar, and a detail panel that fetches the
  conversation preview on demand. The analytics dashboard is computed entirely client-side
  ([`analytics.ts`](client/src/analytics.ts)) from the same `/api/sessions` payload the list uses.

The server port is defined in [`server/paths.ts`](server/paths.ts) (`37702`), and sessions are read
from `~/.claude/projects/`. A shared `Session` type in [`shared/types.ts`](shared/types.ts) keeps the
server, API and client in lock-step.

---

## 📝 Notes

- The **session id is the filename UUID** — that's exactly what `claude --resume` needs.
- The resume `cd` path comes from each session's `cwd` field. The encoded directory name (where path
  separators become `-`) is ambiguous, so it's only used as a display fallback.
- This app is **read-only** and runs **entirely locally** — it never modifies your sessions or sends
  data anywhere. Session ids are validated against path traversal before any file lookup.
