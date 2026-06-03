import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSessions, refreshSessions } from '../api.js';
import { isObserverSession, OBSERVER_PROJECT } from '../utils.js';

const tokensOf = (s) => (s.tokensIn || 0) + (s.tokensOut || 0);

const SORTS = {
  recent: (a, b) => b.mtimeMs - a.mtimeMs,
  oldest: (a, b) => a.mtimeMs - b.mtimeMs,
  size: (a, b) => b.sizeBytes - a.sizeBytes,
  project: (a, b) => (a.project || '').localeCompare(b.project || '') || b.mtimeMs - a.mtimeMs,
  tokens: (a, b) => tokensOf(b) - tokensOf(a) || b.mtimeMs - a.mtimeMs,
  duration: (a, b) => (b.durationMs || 0) - (a.durationMs || 0) || b.mtimeMs - a.mtimeMs,
  tools: (a, b) => (b.toolCallCount || 0) - (a.toolCallCount || 0) || b.mtimeMs - a.mtimeMs,
};

export function useSessions() {
  const [all, setAll] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [project, setProject] = useState(null); // null = all
  const [hideObserver, setHideObserver] = useState(true); // hide claude-mem observer runs

  // Advanced filters (null/''/false = inactive).
  const [modelFilter, setModelFilter] = useState(null);
  const [branchFilter, setBranchFilter] = useState(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessions();
      setAll(data.sessions || []);
      setStats(data.stats || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await refreshSessions();
      setAll(data.sessions || []);
      setStats(data.stats || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Project list with counts, sorted by count desc.
  const projects = useMemo(() => {
    const counts = new Map();
    for (const s of all) {
      const p = s.project || '(unknown)';
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [all]);

  const observerCount = useMemo(() => all.filter(isObserverSession).length, [all]);

  // Distinct values that populate the filter dropdowns.
  const models = useMemo(
    () => [...new Set(all.map((s) => s.model).filter(Boolean))].sort(),
    [all]
  );
  const branches = useMemo(
    () => [...new Set(all.map((s) => s.gitBranch).filter(Boolean))].sort(),
    [all]
  );

  const activeFilterCount =
    (modelFilter ? 1 : 0) +
    (branchFilter ? 1 : 0) +
    (errorsOnly ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  const clearFilters = useCallback(() => {
    setModelFilter(null);
    setBranchFilter(null);
    setErrorsOnly(false);
    setDateFrom('');
    setDateTo('');
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = all;
    // Hide observer sessions unless that project is explicitly selected.
    if (hideObserver && project !== OBSERVER_PROJECT) {
      rows = rows.filter((s) => !isObserverSession(s));
    }
    if (project) rows = rows.filter((s) => (s.project || '(unknown)') === project);
    if (modelFilter) rows = rows.filter((s) => s.model === modelFilter);
    if (branchFilter) rows = rows.filter((s) => s.gitBranch === branchFilter);
    if (errorsOnly) rows = rows.filter((s) => (s.errorCount || 0) > 0);
    if (dateFrom || dateTo) {
      const from = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : -Infinity;
      const to = dateTo ? Date.parse(`${dateTo}T23:59:59.999`) : Infinity;
      rows = rows.filter((s) => {
        const t = s.lastTs ? Date.parse(s.lastTs) : s.mtimeMs;
        return t >= from && t <= to;
      });
    }
    if (q) {
      rows = rows.filter((s) => {
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.preview && s.preview.toLowerCase().includes(q)) ||
          (s.project && s.project.toLowerCase().includes(q)) ||
          (s.gitBranch && s.gitBranch.toLowerCase().includes(q)) ||
          (s.skill && s.skill.toLowerCase().includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q))
        );
      });
    }
    return [...rows].sort(SORTS[sort] || SORTS.recent);
  }, [all, query, project, sort, hideObserver, modelFilter, branchFilter, errorsOnly, dateFrom, dateTo]);

  return {
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
    filters: {
      model: modelFilter,
      setModel: setModelFilter,
      branch: branchFilter,
      setBranch: setBranchFilter,
      errorsOnly,
      setErrorsOnly,
      dateFrom,
      setDateFrom,
      dateTo,
      setDateTo,
      models,
      branches,
      activeCount: activeFilterCount,
      clear: clearFilters,
    },
  };
}
