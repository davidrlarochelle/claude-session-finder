import { test, expect } from '@playwright/test';
import { session, VISIBLE, ERROR_SESSIONS } from '../fixtures/sessions.js';
import { rows, waitForList, row, openSession, visibleIds } from './helpers.js';

test.describe('metric badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('a row surfaces duration, tokens, top-tool and error badges', async ({ page }) => {
    const s = session('Add dark mode toggle to settings page'); // 1 Edit, has thinking, 1 tool error
    const r = row(page, s.id);
    await expect(r.getByTestId('badge-duration')).toBeVisible();
    await expect(r.getByTestId('badge-tokens')).toBeVisible();
    await expect(r.getByTestId('badge-tooltop')).toContainText('Edit');
    await expect(r.getByTestId('badge-errors')).toContainText('1');
  });

  test('the detail panel breaks down tool usage', async ({ page }) => {
    const s = session('Migrate auth to JWT refresh tokens'); // padded with 30 Edits
    const panel = await openSession(page, s);
    await expect(panel.getByTestId('detail-tools')).toContainText('Edit ×30');
  });
});

test.describe('advanced filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  const openFilters = async (page: Parameters<typeof waitForList>[0]): Promise<void> => {
    await page.getByTestId('filters-button').click();
    await expect(page.getByTestId('filters-panel')).toBeVisible();
  };

  test('"errors only" narrows to sessions with tool errors', async ({ page }) => {
    await openFilters(page);
    await page.getByTestId('filter-errors').check();
    await expect(rows(page)).toHaveCount(ERROR_SESSIONS.length);
    await expect(
      page.getByRole('heading', { name: session('Add dark mode toggle to settings page').title })
    ).toBeVisible();
    await expect(page.getByTestId('filters-active-count')).toHaveText('1');
  });

  test('model filter keeps only matching sessions', async ({ page }) => {
    await openFilters(page);
    await page.getByTestId('filter-model').selectOption('claude-sonnet-4-6');
    await expect(rows(page)).toHaveCount(1);
    await expect(
      page.getByRole('heading', { name: session('Investigate slow dashboard query').title })
    ).toBeVisible();
  });

  test('branch filter keeps only matching sessions', async ({ page }) => {
    await openFilters(page);
    await page.getByTestId('filter-branch').selectOption('fix/perf');
    await expect(rows(page)).toHaveCount(1);
    await expect(
      page.getByRole('heading', { name: session('Investigate slow dashboard query').title })
    ).toBeVisible();
  });

  test('"Clear all" resets every filter', async ({ page }) => {
    await openFilters(page);
    await page.getByTestId('filter-errors').check();
    await expect(rows(page)).toHaveCount(ERROR_SESSIONS.length);
    await page.getByTestId('filters-clear').click();
    await expect(rows(page)).toHaveCount(VISIBLE.length);
    await expect(page.getByTestId('filters-active-count')).toHaveCount(0);
  });
});

test.describe('sort by metrics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  // With the filters popover closed, the only combobox is the sort select.
  const sortSelect = (page: Parameters<typeof waitForList>[0]) => page.getByRole('combobox');

  test('"Tokens" puts the heaviest conversation first', async ({ page }) => {
    await sortSelect(page).selectOption('tokens');
    const ids = await visibleIds(page);
    expect(ids[0]).toBe(session('Migrate auth to JWT refresh tokens').id);
  });

  test('"Tool calls" puts the most tool-heavy conversation first', async ({ page }) => {
    await sortSelect(page).selectOption('tools');
    const ids = await visibleIds(page);
    expect(ids[0]).toBe(session('Migrate auth to JWT refresh tokens').id);
  });
});
