import { test, expect } from '@playwright/test';
import { SESSIONS, VISIBLE } from '../fixtures/sessions.js';
import { rows, waitForList } from './helpers.js';

test.describe('hide-observer toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('the toggle is present and checked, labelled with the observer count', async ({ page }) => {
    const toggle = page.getByRole('checkbox');
    await expect(toggle).toBeChecked();
    await expect(page.getByText(/Hide observer \(1\)/)).toBeVisible();
  });

  test('unchecking it reveals the observer session', async ({ page }) => {
    await expect(rows(page)).toHaveCount(VISIBLE.length);
    await page.getByRole('checkbox').uncheck();
    await expect(rows(page)).toHaveCount(SESSIONS.length);
    await expect(page.getByRole('heading', { name: 'Observed: summarize recent changes' })).toBeVisible();
  });

  test('re-checking it hides the observer session again', async ({ page }) => {
    const toggle = page.getByRole('checkbox');
    await toggle.uncheck();
    await expect(rows(page)).toHaveCount(SESSIONS.length);
    await toggle.check();
    await expect(rows(page)).toHaveCount(VISIBLE.length);
  });
});
