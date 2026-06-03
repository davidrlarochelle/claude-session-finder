import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MessageSquare, Coins, DollarSign, Wrench, Timer, AlertTriangle, Folder, Cpu, CalendarDays } from 'lucide-react';
import type { Session } from '../../../shared/types';
import { computeAnalytics, formatUsd } from '../analytics';
import { formatTokens, formatDuration, formatCount } from '../utils';
import Heatmap from './Heatmap';

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  testid,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  testid: string;
}) {
  return (
    <div className="ui-raised flex flex-col gap-1 rounded-xl border border-border p-4">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-subtle">
        <Icon size={12} />
        {label}
      </span>
      <span data-testid={testid} className="text-2xl font-semibold tabular-nums text-fg">
        {value}
      </span>
      {sub && <span className="text-xs text-fg-subtle">{sub}</span>}
    </div>
  );
}

/** A ranked horizontal-bar list (projects, models, tools). */
function BarList<T extends { _w: number }>({
  items,
  max,
  renderLabel,
  renderValue,
  limit = 8,
  testid,
}: {
  items: T[];
  max: number;
  renderLabel: (it: T) => string;
  renderValue: (it: T) => string;
  limit?: number;
  testid: string;
}) {
  const shown = items.slice(0, limit);
  const rest = items.length - shown.length;
  return (
    <div data-testid={testid} className="space-y-2">
      {shown.map((it, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-fg" title={renderLabel(it)}>
            {renderLabel(it)}
          </span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-accent-soft">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              style={{ width: `${max > 0 ? Math.max(3, (it._w / max) * 100) : 0}%` }}
            />
          </span>
          <span className="w-20 shrink-0 text-right tabular-nums text-fg-muted">{renderValue(it)}</span>
        </div>
      ))}
      {rest > 0 && <p className="text-xs text-fg-subtle">+{rest} more</p>}
    </div>
  );
}

function Panel({ title, icon: Icon, children, testid }: { title: string; icon: LucideIcon; children: ReactNode; testid: string }) {
  return (
    <section data-testid={testid} className="ui-panel rounded-xl border border-border p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Icon size={14} className="text-fg-subtle" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function Dashboard({ sessions, project }: { sessions: Session[]; project: string | null }) {
  const a = useMemo(() => computeAnalytics(sessions), [sessions]);

  if (a.totals.sessions === 0) {
    return (
      <div data-testid="dashboard" className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="ui-inset flex h-12 w-12 items-center justify-center rounded-full text-fg-subtle">
          <CalendarDays size={22} />
        </div>
        <p className="text-sm text-fg-muted">No sessions to analyze{project ? ` in ${project}` : ''}.</p>
      </div>
    );
  }

  const maxProject = a.byProject[0]?.tokens ?? 0;
  const maxModel = a.byModel[0]?.tokens ?? 0;
  const maxTool = a.byTool[0]?.count ?? 0;

  return (
    <div data-testid="dashboard" className="flex-1 overflow-y-auto p-4">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-base font-semibold text-fg">Analytics</h2>
        <span className="text-xs text-fg-subtle">
          {project ? `scoped to ${project}` : 'all interactive sessions'} · observer runs excluded
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={MessageSquare} label="Sessions" value={formatCount(a.totals.sessions)} testid="stat-sessions" />
        <StatCard
          icon={Coins}
          label="Tokens"
          value={formatTokens(a.totals.tokens)}
          sub={`${formatTokens(a.totals.tokensIn)} in · ${formatTokens(a.totals.tokensOut)} out`}
          testid="stat-tokens"
        />
        <StatCard icon={DollarSign} label="Est. cost" value={formatUsd(a.totals.cost)} sub="approx · list price" testid="stat-cost" />
        <StatCard icon={Wrench} label="Tool calls" value={formatCount(a.totals.toolCalls)} testid="stat-tools" />
        <StatCard icon={Timer} label="Total time" value={formatDuration(a.totals.durationMs)} testid="stat-duration" />
        <StatCard icon={AlertTriangle} label="Tool errors" value={formatCount(a.totals.errors)} testid="stat-errors" />
      </div>

      <div className="mt-4">
        <Panel title="Activity" icon={CalendarDays} testid="dashboard-activity">
          <Heatmap days={a.days} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Top projects" icon={Folder} testid="dashboard-projects">
          <BarList
            items={a.byProject.map((p) => ({ ...p, _w: p.tokens }))}
            max={maxProject}
            renderLabel={(p) => p.name}
            renderValue={(p) => formatTokens(p.tokens)}
            testid="bars-projects"
          />
        </Panel>

        <Panel title="Models" icon={Cpu} testid="dashboard-models">
          <BarList
            items={a.byModel.map((m) => ({ ...m, _w: m.tokens }))}
            max={maxModel}
            renderLabel={(m) => m.model}
            renderValue={(m) => formatUsd(m.cost)}
            testid="bars-models"
          />
        </Panel>

        <Panel title="Most-used tools" icon={Wrench} testid="dashboard-tools">
          <BarList
            items={a.byTool.map((t) => ({ ...t, _w: t.count }))}
            max={maxTool}
            limit={10}
            renderLabel={(t) => t.name}
            renderValue={(t) => formatCount(t.count)}
            testid="bars-tools"
          />
        </Panel>
      </div>
    </div>
  );
}
