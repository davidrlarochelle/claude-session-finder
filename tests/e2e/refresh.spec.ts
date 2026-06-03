import { test, expect } from '@playwright/test';
import { SESSIONS, VISIBLE } from '../fixtures/sessions.js';
import { rows, waitForList } from './helpers.js';

test.describe('refresh', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('re-indexes and keeps the list intact', async ({ page }) => {
    const refresh = page.getByRole('button', { name: /refresh/i });

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/refresh') && r.request().method() === 'POST'
    );
    await refresh.click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.stats.total).toBe(SESSIONS.length);

    // Index reuse should kick in on a no-op refresh.
    expect(body.stats.reused).toBe(SESSIONS.length);
    expect(body.stats.parsed).toBe(0);

    await waitForList(page);
    await expect(rows(page)).toHaveCount(VISIBLE.length);
  });
});
