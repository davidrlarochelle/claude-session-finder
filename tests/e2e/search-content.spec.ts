import { test, expect } from '@playwright/test';
import { session } from '../fixtures/sessions.js';
import { rows, waitForList, row, searchBox } from './helpers.js';

const DARK = 'Add dark mode toggle to settings page';

test.describe('full-text content search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('a content-only term is found only with deep search on', async ({ page }) => {
    // "useTheme" appears in an assistant message, not in any metadata field.
    await searchBox(page).fill('useTheme');
    await expect(rows(page)).toHaveCount(0);

    await page.getByTestId('deep-search-toggle').check();
    await expect(rows(page)).toHaveCount(1);

    const r = row(page, session(DARK).id);
    await expect(r).toBeVisible();
    const snippet = r.getByTestId('session-snippet');
    await expect(snippet).toContainText('useTheme');
    await expect(snippet.locator('mark')).not.toHaveCount(0); // term is highlighted
  });

  test('toggling deep search off restores metadata-only results', async ({ page }) => {
    await page.getByTestId('deep-search-toggle').check();
    await searchBox(page).fill('useTheme');
    await expect(rows(page)).toHaveCount(1);
    await page.getByTestId('deep-search-toggle').uncheck();
    await expect(rows(page)).toHaveCount(0);
  });
});

test.describe('search API', () => {
  test('GET /api/search matches conversation content with a snippet', async ({ request }) => {
    const res = await request.get('/api/search?q=useTheme');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.results.length).toBe(1);
    expect(body.results[0].id).toBe(session(DARK).id);
    expect(body.results[0].snippet.length).toBeGreaterThan(0);
  });

  test('GET /api/search with an empty query returns no results', async ({ request }) => {
    const res = await request.get('/api/search?q=');
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).results).toHaveLength(0);
  });
});
