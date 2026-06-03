import { test, expect } from '@playwright/test';
import { SESSIONS, VISIBLE } from '../fixtures/sessions.js';
import { waitForList, rows } from './helpers.js';

test.describe('initial load & session list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('renders the app shell', async ({ page }) => {
    await expect(page).toHaveTitle(/Claude Session Finder/i);
    await expect(page.getByRole('heading', { name: 'Session Finder' })).toBeVisible();
    await expect(page.getByTestId('project-sidebar')).toBeVisible();
  });

  test('declares an SVG favicon', async ({ page }) => {
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  });

  test('shows every non-observer session by default', async ({ page }) => {
    await expect(rows(page)).toHaveCount(VISIBLE.length);
    for (const s of VISIBLE) {
      await expect(page.getByRole('heading', { name: s.title })).toBeVisible();
    }
  });

  test('hides the observer session by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Observed: summarize recent changes' })).toHaveCount(0);
  });

  test('renders metadata on a row (project, branch, short id)', async ({ page }) => {
    const webapp = SESSIONS[0];
    if (!webapp) throw new Error('SESSIONS[0] is undefined');
    const card = page.locator(`[data-session-id="${webapp.id}"]`);
    await expect(card.getByText('webapp', { exact: true })).toBeVisible();
    await expect(card.getByText('main', { exact: true })).toBeVisible();
    await expect(card.getByText(webapp.id.slice(0, 8))).toBeVisible();
  });

  test('shows the stats footer with the total indexed count', async ({ page }) => {
    await expect(page.getByText(`${SESSIONS.length} sessions ·`)).toBeVisible();
    await expect(page.getByText(/indexed in \d+ms/)).toBeVisible();
  });

  test('shows the "shown" count reflecting visible rows', async ({ page }) => {
    await expect(page.getByText(`${VISIBLE.length} shown`)).toBeVisible();
  });
});
