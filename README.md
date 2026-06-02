# 🔍 Claude Session Finder

> A fast, local webapp to **browse, search, and resume** your past Claude Code conversations.

Claude Code stores every conversation as a `<session-uuid>.jsonl` file under `~/.claude/projects/`.
This tool indexes them all and gives you a searchable, sortable list — then lets you copy the exact
`cd … && claude --resume <id>` command to your clipboard in one click.

<p>
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A518-339933?logo=node.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white">
</p>

---

## ✨ Features

- **Instant search & sort** across every session — by title, preview text, project, branch, date, or size.
- **Virtualized list** that stays smooth with 1000+ sessions.
- **Project sidebar** to filter sessions by working directory.
- **Detail panel** with a lazily-loaded conversation preview (first ~20 human/assistant turns).
- **One-click resume** — copies `cd <cwd> && claude --resume <id>` ready to paste in your terminal.
- **Incremental indexing** — only changed sessions are re-parsed on refresh (cached by file `mtime`+size).
- **Themes & design styles** — light/dark toggle plus four looks: flat, skeuomorphic, neumorphic, glass.

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

## 📁 Project structure

```
claude-session-finder/
├── server/                 # Express API
│   ├── index.js            #   routes + static serving in production
│   ├── indexer.js          #   stream-parses .jsonl files for metadata
│   ├── cache.js            #   persists .cache/session-index.json
│   └── paths.js            #   PROJECTS_DIR, PORT, dir decoding
├── client/                 # React + Vite + Tailwind
│   └── src/
│       ├── App.jsx
│       ├── components/      #   Toolbar, SessionList, SessionRow, DetailPanel, …
│       └── hooks/           #   useSessions, useTheme, useStyle
└── docker-compose.yml
```

---

## 🔌 API reference

| Method | Endpoint                     | Description                                            |
| ------ | ---------------------------- | ------------------------------------------------------ |
| `GET`  | `/api/health`                | Health check + resolved projects directory             |
| `GET`  | `/api/sessions`              | All session metadata + index stats                     |
| `GET`  | `/api/sessions/:id/preview`  | First ~20 human/assistant text turns of a session      |
| `POST` | `/api/refresh`               | Re-scan the projects directory (incremental)           |

---

## ⚙️ How it works

- **`indexer.js`** stream-parses each `.jsonl` line by line, extracting only lightweight metadata
  (title, first-message preview, `cwd`, git branch, model, message count, timestamps, size). It
  early-stops and bounds the line scan, so even pathological files stay cheap.
- **`cache.js`** persists the parsed index to `.cache/session-index.json`, keyed by each file's
  `mtime`+size. On refresh, unchanged sessions are reused and only modified ones re-parsed.
- **`client/`** renders a virtualized list (via `@tanstack/react-virtual`) so large histories scroll
  smoothly, with search/sort, a project sidebar, and a detail panel that fetches the conversation
  preview on demand.

The server port is defined in [`server/paths.js`](server/paths.js) (`37702`), and sessions are read
from `~/.claude/projects/`.

---

## 📝 Notes

- The **session id is the filename UUID** — that's exactly what `claude --resume` needs.
- The resume `cd` path comes from each session's `cwd` field. The encoded directory name (where path
  separators become `-`) is ambiguous, so it's only used as a display fallback.
- This app is **read-only** and runs **entirely locally** — it never modifies your sessions or sends
  data anywhere. Session ids are validated against path traversal before any file lookup.
