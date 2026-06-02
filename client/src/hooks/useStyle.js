import { useCallback, useEffect, useState } from 'react';

/** The three available design styles. */
export const STYLES = ['default', 'skeu', 'neu', 'glass'];

/** Resolve the initial style: saved preference, else flat default. Mirrors the boot script in index.html. */
function initialStyle() {
  try {
    const stored = localStorage.getItem('style');
    if (STYLES.includes(stored)) return stored;
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
  return 'default';
}

/** Design-style state synced to <html data-style> and persisted to localStorage. */
export function useStyle() {
  const [style, setStyle] = useState(initialStyle);

  useEffect(() => {
    document.documentElement.setAttribute('data-style', style);
    try {
      localStorage.setItem('style', style);
    } catch {
      // Ignore storage failures.
    }
  }, [style]);

  const choose = useCallback((next) => {
    if (STYLES.includes(next)) setStyle(next);
  }, []);

  return [style, choose];
}
