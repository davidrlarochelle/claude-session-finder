import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSessions, refreshSessions } from '../api.js';
import { isObserverSession, OBSERVER_PROJECT } from '../utils.js';

const SORTS = {
  recent: (a, b) => b.mtimeMs - a.mtimeMs,
  oldest: (a, b) => a.mtimeMs - b.mtimeMs,
  size: (a, b) => b.sizeBytes - a.sizeBytes,
  project: (a, b) => (a.project || '').localeCompare(b.project || '') || b.mtimeMs - a.mtimeMs,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = all;
    // Hide observer sessions unless that project is explicitly selected.
    if (hideObserver && project !== OBSERVER_PROJECT) {
      rows = rows.filter((s) => !isObserverSession(s));
    }
    if (project) rows = rows.filter((s) => (s.project || '(unknown)') === project);
    if (q) {
      rows = rows.filter((s) => {
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.preview && s.preview.toLowerCase().includes(q)) ||
          (s.project && s.project.toLowerCase().includes(q)) ||
          (s.gitBranch && s.gitBranch.toLowerCase().includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q))
        );
      });
    }
    return [...rows].sort(SORTS[sort] || SORTS.recent);
  }, [all, query, project, sort, hideObserver]);

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
  };
}
