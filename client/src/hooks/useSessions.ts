import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, IndexStats, SortKey, ListSession, SearchResult } from '../../../shared/types';
import { fetchSessions, refreshSessions, searchContent } from '../api';
import { isObserverSession, OBSERVER_PROJECT } from '../utils';

const tokensOf = (s: Session): number => (s.tokensIn || 0) + (s.tokensOut || 0);

const SORTS: Record<SortKey, (a: Session, b: Session) => number> = {
  recent: (a, b) => b.mtimeMs - a.mtimeMs,
  oldest: (a, b) => a.mtimeMs - b.mtimeMs,
  size: (a, b) => b.sizeBytes - a.sizeBytes,
  project: (a, b) => (a.project || '').localeCompare(b.project || '') || b.mtimeMs - a.mtimeMs,
  tokens: (a, b) => tokensOf(b) - tokensOf(a) || b.mtimeMs - a.mtimeMs,
  duration: (a, b) => (b.durationMs || 0) - (a.durationMs || 0) || b.mtimeMs - a.mtimeMs,
  tools: (a, b) => (b.toolCallCount || 0) - (a.toolCallCount || 0) || b.mtimeMs - a.mtimeMs,
};

export function useSessions() {
  const [all, setAll] = useState<Session[]>([]);
  const [stats, setStats] = useState<IndexStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [project, setProject] = useState<string | null>(null); // null = all
  const [hideObserver, setHideObserver] = useState(true); // hide claude-mem observer runs

  // Advanced filters (null/''/false = inactive).
  const [modelFilter, setModelFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Deep (full-text) search over conversation content, served by the FTS index.
  const [deepSearch, setDeepSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessions();
      setAll(data.sessions || []);
      setStats(data.stats || null);
    } catch (e) {
      setError((e as Error).message);
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
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced content search: hit the FTS endpoint while deep search is on.
  useEffect(() => {
    if (!deepSearch || !query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchContent(query)
        .then((r) => setSearchResults(r.results))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [deepSearch, query]);

  // Project list with counts, sorted by count desc.
  const projects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of all) {
      const p = s.project || '(unknown)';
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [all]);

  const observerCount = useMemo(() => all.filter(isObserverSession).length, [all]);

  // Distinct values that populate the filter dropdowns.
  const models = useMemo(
    () => [...new Set(all.map((s) => s.model).filter((m): m is string => m !== null))].sort(),
    [all]
  );
  const branches = useMemo(
    () => [...new Set(all.map((s) => s.gitBranch).filter((b): b is string => b !== null))].sort(),
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

  const filtered = useMemo<ListSession[]>(() => {
    const q = query.trim().toLowerCase();
    // Deep mode draws from the relevance-ranked FTS results; otherwise from the
    // full in-memory list with the as-you-type metadata match.
    const deep = deepSearch && q.length > 0;
    let rows: ListSession[] = deep ? searchResults : all;
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
    // Deep mode preserves the server's BM25 relevance order. The metadata
    // match and sort dropdown only apply to the in-memory list.
    if (deep) return rows;
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
    const sortFn = SORTS[sort] ?? SORTS.recent;
    return [...rows].sort(sortFn);
  }, [all, searchResults, deepSearch, query, project, sort, hideObserver, modelFilter, branchFilter, errorsOnly, dateFrom, dateTo]);

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
    deepSearch,
    setDeepSearch,
    searching,
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
