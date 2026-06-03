import { test, expect } from '@playwright/test';
import { VISIBLE, expectedToolCounts } from '../fixtures/sessions.js';
import { waitForList } from './helpers.js';

test.describe('analytics dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
    await page.getByTestId('view-dashboard').click();
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });

  test('summary reflects the interactive (non-observer) sessions', async ({ page }) => {
    await expect(page.getByTestId('stat-sessions')).toHaveText(String(VISIBLE.length));
    await expect(page.getByTestId('stat-cost')).toContainText('$');
  });

  test('aggregates tool usage across all sessions', async ({ page }) => {
    const editTotal = VISIBLE.reduce((n, s) => n + (expectedToolCounts(s)['Edit'] ?? 0), 0);
    const tools = page.getByTestId('dashboard-tools');
    await expect(tools).toContainText('Edit');
    await expect(tools).toContainText(String(editTotal));
    await expect(tools).toContainText('Bash');
  });

  test('breaks activity down by model and project', async ({ page }) => {
    const models = page.getByTestId('dashboard-models');
    await expect(models).toContainText('claude-opus-4-8');
    await expect(models).toContainText('claude-sonnet-4-6');

    const projects = page.getByTestId('dashboard-projects');
    await expect(projects).toContainText('webapp');
    await expect(projects).toContainText('api-server');
  });

  test('renders the activity heatmap with at least one active day', async ({ page }) => {
    await expect(page.getByTestId('heatmap')).toBeVisible();
    await expect(page.getByTestId('heatmap-day-active').first()).toBeVisible();
  });

  test('simplifies the toolbar (no search/sort/filters) in dashboard view', async ({ page }) => {
    await expect(page.getByRole('combobox')).toHaveCount(0); // sort select removed
    await expect(page.getByTestId('filters-button')).toHaveCount(0);
  });
});
