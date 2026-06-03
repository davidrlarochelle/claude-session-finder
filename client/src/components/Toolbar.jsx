import { Search, RefreshCw } from 'lucide-react';
import ThemeToggle from './ThemeToggle.jsx';
import StyleSwitcher from './StyleSwitcher.jsx';
import Filters from './Filters.jsx';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'size', label: 'Size' },
  { value: 'project', label: 'Project A–Z' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'duration', label: 'Duration' },
  { value: 'tools', label: 'Tool calls' },
];

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
}) {
  return (
    <div className="relative z-10 flex items-center gap-3 border-b border-border ui-raised px-4 py-3">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, preview, project, branch or id…"
          className="ui-input w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle"
        />
      </div>
      {observerCount > 0 && (
        <label
          className="flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-xs text-fg-muted"
          title={`${observerCount} claude-mem observer-agent sessions`}
        >
          <input
            type="checkbox"
            checked={hideObserver}
            onChange={(e) => setHideObserver(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-accent"
          />
          Hide observer ({observerCount})
        </label>
      )}
      <span className="hidden whitespace-nowrap text-xs tabular-nums text-fg-muted sm:inline">{count} shown</span>
      {filters && <Filters {...filters} />}
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className="ui-btn rounded-lg border border-border px-2.5 py-2 text-sm text-fg-muted focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
