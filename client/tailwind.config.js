import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** Semantic color backed by a CSS variable so light/dark themes swap in one place. */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  // Absolute globs so content is found regardless of the cwd npm runs from.
  content: [path.join(dir, 'index.html'), path.join(dir, 'src/**/*.{js,jsx}')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('--bg'),
        surface: token('--surface'),
        'surface-hover': token('--surface-hover'),
        border: token('--border'),
        fg: token('--fg'),
        'fg-muted': token('--fg-muted'),
        'fg-subtle': token('--fg-subtle'),
        accent: token('--accent'),
        'accent-fg': token('--accent-fg'),
        'accent-soft': token('--accent-soft'),
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        // Style-aware pressed state (used by the copy-confirmation button).
        pressed: 'var(--shadow-pressed)',
      },
    },
  },
  plugins: [],
};
