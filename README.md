# Claude Session Finder

A small local webapp to browse, search, and resume past Claude Code conversations.

It scans `~/.claude/projects/` (where Claude Code stores each conversation as a
`<session-uuid>.jsonl` file), shows a fast searchable/sortable list with each session's
title, first-message preview, project, git branch, date, and size, and lets you **copy the
`cd … && claude --resume <id>` command** to your clipboard in one click.

## Run it

```bash
npm install

# Dev (Vite on :5173 + API on :37702, with proxy)
npm run dev
# open http://localhost:5173

# Production (single server on :37702)
npm run build
npm start
# open http://localhost:37702
```

## How it works

- **server/** — Express API. `indexer.js` stream-parses each `.jsonl` for metadata only
  (early-stops, bounded line scan), `cache.js` persists a `.cache/session-index.json` keyed
  by file mtime+size so only changed sessions are re-parsed on refresh.
- **client/** — React + Vite + Tailwind. Virtualized list (handles 1000+ sessions),
  project sidebar, search/sort, and a detail panel with a lazily-loaded conversation preview.

### API

- `GET /api/sessions` — all session metadata + index stats
- `GET /api/sessions/:id/preview` — first ~20 human/assistant text turns
- `POST /api/refresh` — re-scan (incremental)

## Notes

- The **session id is the filename UUID** — that's what `claude --resume` needs.
- The resume `cd` path comes from each session's `cwd` field (the encoded directory name is
  ambiguous and only used as a display fallback).
