import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, TEST_PORT, PROJECTS_DIR, CACHE_DIR } from './tests/fixtures/sessions.js';

/**
 * E2E config. We run the app exactly as in production — a single Express server
 * serves both the built client and the API on one origin — so there is no Vite
 * proxy to reason about. The `webServer` command rebuilds the client, writes a
 * deterministic fixtures tree, then boots the server pointed at it.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The copy-to-clipboard buttons rely on navigator.clipboard.
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run build && node tests/setup/prepare-fixtures.js && node server/index.js',
    url: `${BASE_URL}/api/health`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'production',
      PORT: String(TEST_PORT),
      CLAUDE_PROJECTS_DIR: PROJECTS_DIR,
      CACHE_DIR,
    },
  },
});
