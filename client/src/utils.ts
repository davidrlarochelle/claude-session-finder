import type { Session } from '../../shared/types';

/** claude-mem's background observer agent writes its sessions here. */
export const OBSERVER_PROJECT = 'observer-sessions';

/** True for claude-mem observer-agent runs (not interactive conversations). */
export function isObserverSession(s: Session): boolean {
  return s.project === OBSERVER_PROJECT;
}

export function relativeTime(ms: number | null | undefined): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

export function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compact token count, e.g. 950 → "950", 3870 → "3.9k", 1_250_000 → "1.3M". */
export function formatTokens(n: number | null | undefined): string {
  if (!n) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k < 10 ? k.toFixed(1) : Math.round(k)}k`;
  }
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** Compact wall-clock duration for a badge, e.g. 45s, 12m, 3h, 2d. */
export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return '0s';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

/** Exact integer with thousands separators, for detail readouts. */
export function formatCount(n: number | null | undefined): string {
  return (n || 0).toLocaleString();
}

export function shortId(id: string | null | undefined): string {
  return id ? id.slice(0, 8) : '';
}

/** The command a user pastes into a terminal to resume a session. */
export function resumeCommand(session: Session): string {
  const cwd = session.cwd || '';
  const cd = cwd ? `cd "${cwd}" && ` : '';
  return `${cd}claude --resume ${session.id}`;
}
