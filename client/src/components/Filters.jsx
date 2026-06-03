import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

/** Compact popover holding the advanced filters (model, branch, errors, dates). */
export default function Filters({
  models,
  branches,
  model,
  setModel,
  branch,
  setBranch,
  errorsOnly,
  setErrorsOnly,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  activeCount,
  clear,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="filters-button"
        aria-expanded={open}
        className="ui-btn inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <SlidersHorizontal size={15} />
        Filters
        {activeCount > 0 && (
          <span
            data-testid="filters-active-count"
            className="ui-btn-accent inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            data-testid="filters-panel"
            className="ui-raised absolute right-0 z-30 mt-2 w-72 space-y-3 rounded-lg border border-border p-3 text-sm"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-fg-subtle">Model</span>
              <select
                data-testid="filter-model"
                value={model || ''}
                onChange={(e) => setModel(e.target.value || null)}
                className="ui-input rounded-md border border-border px-2 py-1.5 text-sm text-fg"
              >
                <option value="">All models</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-fg-subtle">Branch</span>
              <select
                data-testid="filter-branch"
                value={branch || ''}
                onChange={(e) => setBranch(e.target.value || null)}
                className="ui-input rounded-md border border-border px-2 py-1.5 text-sm text-fg"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-fg-subtle">From</span>
                <input
                  type="date"
                  data-testid="filter-date-from"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="ui-input rounded-md border border-border px-2 py-1.5 text-sm text-fg"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] uppercase tracking-wide text-fg-subtle">To</span>
                <input
                  type="date"
                  data-testid="filter-date-to"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="ui-input rounded-md border border-border px-2 py-1.5 text-sm text-fg"
                />
              </label>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-2 text-fg-muted">
              <input
                type="checkbox"
                data-testid="filter-errors"
                checked={errorsOnly}
                onChange={(e) => setErrorsOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-accent"
              />
              Only sessions with tool errors
            </label>

            <div className="flex justify-end border-t border-border pt-2">
              <button
                type="button"
                data-testid="filters-clear"
                onClick={clear}
                disabled={activeCount === 0}
                className="ui-btn rounded-md px-2.5 py-1 text-xs text-fg-muted hover:text-fg disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
