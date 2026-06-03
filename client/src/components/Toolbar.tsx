import { Search, RefreshCw, List, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type React from 'react';
import type { SortKey, ViewKey } from '../../../shared/types';
import ThemeToggle from './ThemeToggle';
import StyleSwitcher from './StyleSwitcher';
import Filters from './Filters';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'size', label: 'Size' },
  { value: 'project', label: 'Project A–Z' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'duration', label: 'Duration' },
  { value: 'tools', label: 'Tool calls' },
];

interface FiltersProps {
  models: string[];
  branches: string[];
  model: string | null;
  setModel: (v: string | null) => void;
  branch: string | null;
  setBranch: (v: string | null) => void;
  errorsOnly: boolean;
  setErrorsOnly: (v: boolean) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  activeCount: number;
  clear: () => void;
}

function ViewToggle({ view, setView }: { view: ViewKey; setView: (v: ViewKey) => void }) {
  const btn = (value: ViewKey, Icon: LucideIcon, label: string, testid: string) => (
    <button
      type="button"
      data-testid={testid}
      aria-pressed={view === value}
      onClick={() => setView(value)}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium ${
        view === value ? 'ui-btn-accent' : 'text-fg-muted hover:text-fg'
      }`}
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
  return (
    <div className="ui-inset flex items-center gap-0.5 rounded-lg p-0.5">
      {btn('list', List, 'List', 'view-list')}
      {btn('dashboard', BarChart3, 'Dashboard', 'view-dashboard')}
    </div>
  );
}

interface Props {
  query: string;
  setQuery: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  onRefresh: () => void;
  refreshing: boolean;
  count: number;
  hideObserver: boolean;
  setHideObserver: (v: boolean) => void;
  observerCount: number;
  theme: string;
  onToggleTheme: () => void;
  style: string;
  onChangeStyle: (v: string) => void;
  filters: FiltersProps | null | undefined;
  view: ViewKey;
  setView: (v: ViewKey) => void;
  deepSearch: boolean;
  setDeepSearch: (v: boolean) => void;
}

export default function Toolbar({
  query,
  setQuery,
  sort,
  setSort,
  onRefresh,
  refreshing,
  count,
  hideObserver,
  setHideObserver,
  observerCount,
  theme,
  onToggleTheme,
  style,
  onChangeStyle,
  filters,
  view,
  setView,
  deepSearch,
  setDeepSearch,
}: Props) {
  return (
    <div className="relative z-10 flex items-center gap-3 border-b border-border ui-raised px-4 py-3">
      <ViewToggle view={view} setView={setView} />

      {view === 'list' ? (
        <>
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Search title, preview, project, branch or id…"
              className="ui-input w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle"
            />
          </div>
          <label
            className="flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-xs text-fg-muted"
            title="Full-text search inside conversation content (ranked by relevance)"
          >
            <input
              type="checkbox"
              data-testid="deep-search-toggle"
              checked={deepSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeepSearch(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-accent"
            />
            Search contents
          </label>
          {observerCount > 0 && (
            <label
              className="flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-xs text-fg-muted"
              title={`${observerCount} claude-mem observer-agent sessions`}
            >
              <input
                type="checkbox"
                data-testid="observer-toggle"
                checked={hideObserver}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHideObserver(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-accent"
              />
              Hide observer ({observerCount})
            </label>
          )}
          <span className="hidden whitespace-nowrap text-xs tabular-nums text-fg-muted sm:inline">{count} shown</span>
          {filters && <Filters {...filters} />}
          <select
            value={sort}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortKey)}
            className="ui-btn rounded-lg border border-border px-2.5 py-2 text-sm text-fg-muted focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="flex-1" />
      )}

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="ui-btn inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg disabled:opacity-50"
      >
        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
      <StyleSwitcher style={style} onChange={onChangeStyle} />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </div>
  );
}
