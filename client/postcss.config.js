import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    // Explicit config path: npm runs from the project root, but the Tailwind
    // config lives in client/, so auto-discovery would otherwise miss it.
    tailwindcss: { config: path.join(dir, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
