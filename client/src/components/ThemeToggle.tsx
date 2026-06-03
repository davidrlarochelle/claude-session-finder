import { Moon, Sun } from 'lucide-react';

interface Props {
  theme: string;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="ui-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
