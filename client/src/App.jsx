import { useState } from 'react';
import { MessagesSquare, FolderSearch } from 'lucide-react';
import { useSessions } from './hooks/useSessions.js';
import { useTheme } from './hooks/useTheme.js';
import { useStyle } from './hooks/useStyle.js';
import ProjectSidebar from './components/ProjectSidebar.jsx';
import Toolbar from './components/Toolbar.jsx';
import SessionList from './components/SessionList.jsx';
import DetailPanel from './components/DetailPanel.jsx';

export default function App() {
  const {
    all,
    filtered,
    projects,
    stats,
    loading,
    refreshing,
    error,
    query,
    setQuery,
    sort,
    setSort,
    project,
    setProject,
    hideObserver,
    setHideObserver,
    observerCount,
    refresh,
    filters,
  } = useSessions();

  const [theme, toggleTheme] = useTheme();
  const [style, chooseStyle] = useStyle();
  const [selected, setSelected] = useState(null);

  return (
    <div className="ui-app flex h-screen w-screen overflow-hidden text-fg">
      <ProjectSidebar projects={projects} selected={project} onSelect={setProject} total={all.length} />

      <main className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          onRefresh={refresh}
          refreshing={refreshing}
          count={filtered.length}
          hideObserver={hideObserver}
          setHideObserver={setHideObserver}
          observerCount={observerCount}
          theme={theme}
          onToggleTheme={toggleTheme}
          style={style}
          onChangeStyle={chooseStyle}
          filters={filters}
        />

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-fg-subtle">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
            Loading sessions…
          </div>
        ) : all.length === 0 && !error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="ui-btn-accent flex h-12 w-12 items-center justify-center rounded-full">
              <FolderSearch size={22} />
            </div>
            <p className="text-sm font-semibold text-fg">No Claude Code sessions found</p>
            <p className="max-w-sm text-xs text-fg-muted">
              Expected to find conversations under{' '}
              <code className="rounded bg-surface-hover px-1 py-0.5 font-mono text-fg-muted">~/.claude/projects/</code>.
              Start a Claude Code session and hit Refresh.
            </p>
          </div>
        ) : (
          <SessionList sessions={filtered} selectedId={selected?.id} onSelect={setSelected} />
        )}

        {stats && (
          <div className="relative z-10 flex items-center gap-1.5 border-t border-border ui-panel px-4 py-1.5 text-[11px] text-fg-subtle">
            <MessagesSquare size={12} className="text-fg-subtle" />
            {stats.total} sessions · indexed in {stats.ms}ms (parsed {stats.parsed}, reused {stats.reused}
            {stats.errors ? `, ${stats.errors} errors` : ''})
          </div>
        )}
      </main>

      <DetailPanel session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
