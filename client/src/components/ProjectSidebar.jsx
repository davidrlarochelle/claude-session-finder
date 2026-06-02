import { MessagesSquare, Folder, LayoutGrid } from 'lucide-react';

function CountBadge({ active, children }) {
  return (
    <span
      className={`ui-chip ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
        active ? 'bg-accent-fg/15 text-accent-fg' : 'bg-surface-hover text-fg-subtle'
      }`}
    >
      {children}
    </span>
  );
}

export default function ProjectSidebar({ projects, selected, onSelect, total }) {
  const itemClass = (active) =>
    `mb-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
      active ? 'ui-btn-accent' : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
    }`;

  return (
    <aside data-testid="project-sidebar" className="flex h-full w-64 shrink-0 flex-col border-r border-border ui-panel">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <div className="ui-btn-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <MessagesSquare size={17} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-fg">Session Finder</h1>
          <p className="text-xs text-fg-subtle">{total} sessions</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <button onClick={() => onSelect(null)} className={itemClass(selected === null)}>
          <LayoutGrid size={15} className="shrink-0 opacity-80" />
          <span>All projects</span>
          <CountBadge active={selected === null}>{total}</CountBadge>
        </button>
        {projects.map((p) => {
          const active = selected === p.name;
          return (
            <button key={p.name} onClick={() => onSelect(p.name)} className={itemClass(active)}>
              <Folder size={15} className="shrink-0 opacity-80" />
              <span className="truncate" title={p.name}>
                {p.name}
              </span>
              <CountBadge active={active}>{p.count}</CountBadge>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
