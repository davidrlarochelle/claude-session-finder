import { useCallback, useEffect, useState } from 'react';

/** The four available design styles. */
export const STYLES = ['default', 'skeu', 'neu', 'glass'] as const;

export type Style = (typeof STYLES)[number];

/** Resolve the initial style: saved preference, else flat default. Mirrors the boot script in index.html. */
function initialStyle(): Style {
  try {
    const stored = localStorage.getItem('style');
    if (stored !== null && (STYLES as readonly string[]).includes(stored)) return stored as Style;
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
  return 'default';
}

/** Design-style state synced to <html data-style> and persisted to localStorage. */
export function useStyle(): [Style, (next: string) => void] {
  const [style, setStyle] = useState<Style>(initialStyle);

  useEffect(() => {
    document.documentElement.setAttribute('data-style', style);
    try {
      localStorage.setItem('style', style);
    } catch {
      // Ignore storage failures.
    }
  }, [style]);

  const choose = useCallback((next: string) => {
    if ((STYLES as readonly string[]).includes(next)) setStyle(next as Style);
  }, []);

  return [style, choose];
}
