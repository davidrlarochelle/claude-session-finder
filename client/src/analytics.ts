/**
 * Client-side analytics over the enriched session index. Everything the
 * dashboard shows is derived here from the same `/api/sessions` payload the
 * list view uses — no extra backend round-trips.
 */
import type { Session } from '../../shared/types';

/**
 * Approximate Anthropic list prices (USD per million tokens). Used only for a
 * rough cost estimate; it does NOT account for prompt-caching discounts, so
 * treat the figure as an upper bound. Easy to update as pricing changes.
 */
const PRICING = {
  opus: { in: 15, out: 75 },
  sonnet: { in: 3, out: 15 },
  haiku: { in: 0.8, out: 4 },
} as const;

export interface Rate {
  in: number;
  out: number;
}

export function rateFor(model: string | null): Rate {
  const m = (model ?? '').toLowerCase();
  if (m.includes('opus')) return PRICING.opus;
  if (m.includes('sonnet')) return PRICING.sonnet;
  if (m.includes('haiku')) return PRICING.haiku;
  return PRICING.sonnet; // sensible mid-tier default for unknown models
}

/** Estimated USD cost of a single session from its token totals and model. */
export function sessionCost(s: Session): number {
  const r = rateFor(s.model);
  return ((s.tokensIn || 0) / 1e6) * r.in + ((s.tokensOut || 0) / 1e6) * r.out;
}

/** Compact USD label, e.g. "<$0.01", "$4.21", "$1.3k". */
export function formatUsd(n: number): string {
  if (!n) return '$0.00';
  if (n < 0.01) return '<$0.01';
  if (n < 1000) return `$${n.toFixed(2)}`;
  if (n < 1e6) return `$${(n / 1000).toFixed(1)}k`;
  return `$${(n / 1e6).toFixed(2)}M`;
}

/** Local-time YYYY-MM-DD bucket key for the activity calendar. */
export function localDayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const sessionTime = (s: Session): number => (s.lastTs ? Date.parse(s.lastTs) : s.mtimeMs);

export interface DayActivity {
  count: number;
  tokens: number;
}

export interface ProjectStat {
  name: string;
  sessions: number;
  tokens: number;
  cost: number;
}

export interface ModelStat {
  model: string;
  sessions: number;
  tokens: number;
  cost: number;
}

export interface ToolStat {
  name: string;
  count: number;
}

export interface Totals {
  sessions: number;
  tokensIn: number;
  tokensOut: number;
  tokens: number;
  toolCalls: number;
  durationMs: number;
  errors: number;
  cost: number;
}

export interface Analytics {
  totals: Totals;
  byProject: ProjectStat[];
  byModel: ModelStat[];
  byTool: ToolStat[];
  days: Map<string, DayActivity>;
}

/**
 * Aggregate a list of sessions into dashboard-ready buckets:
 * totals, ranked breakdowns by project/model/tool, and a per-day activity map.
 */
export function computeAnalytics(sessions: Session[]): Analytics {
  const totals: Totals = {
    sessions: sessions.length,
    tokensIn: 0,
    tokensOut: 0,
    tokens: 0,
    toolCalls: 0,
    durationMs: 0,
    errors: 0,
    cost: 0,
  };
  const projects = new Map<string, ProjectStat>();
  const models = new Map<string, ModelStat>();
  const tools = new Map<string, number>();
  const days = new Map<string, DayActivity>();

  for (const s of sessions) {
    const tin = s.tokensIn || 0;
    const tout = s.tokensOut || 0;
    const cost = sessionCost(s);

    totals.tokensIn += tin;
    totals.tokensOut += tout;
    totals.toolCalls += s.toolCallCount || 0;
    totals.durationMs += s.durationMs || 0;
    totals.errors += s.errorCount || 0;
    totals.cost += cost;

    const pk = s.project || '(unknown)';
    const p = projects.get(pk) ?? { name: pk, sessions: 0, tokens: 0, cost: 0 };
    p.sessions++;
    p.tokens += tin + tout;
    p.cost += cost;
    projects.set(pk, p);

    const mk = s.model || '(unknown)';
    const m = models.get(mk) ?? { model: mk, sessions: 0, tokens: 0, cost: 0 };
    m.sessions++;
    m.tokens += tin + tout;
    m.cost += cost;
    models.set(mk, m);

    for (const [name, n] of Object.entries(s.toolCounts || {})) {
      tools.set(name, (tools.get(name) ?? 0) + n);
    }

    const t = sessionTime(s);
    if (t) {
      const k = localDayKey(t);
      const d = days.get(k) ?? { count: 0, tokens: 0 };
      d.count++;
      d.tokens += tin + tout;
      days.set(k, d);
    }
  }

  totals.tokens = totals.tokensIn + totals.tokensOut;

  return {
    totals,
    byProject: [...projects.values()].sort((a, b) => b.tokens - a.tokens || b.sessions - a.sessions),
    byModel: [...models.values()].sort((a, b) => b.tokens - a.tokens),
    byTool: [...tools.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    days,
  };
}
