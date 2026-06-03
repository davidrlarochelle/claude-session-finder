import { test, expect } from '@playwright/test';
import { VISIBLE } from '../fixtures/sessions.js';
import { rows, waitForList } from './helpers.js';

test.describe('project sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  const sidebar = (page: Parameters<typeof waitForList>[0]) => page.getByTestId('project-sidebar');
  const projectButton = (page: Parameters<typeof waitForList>[0], name: string) =>
    sidebar(page).getByRole('button', { name: new RegExp(`^${name}`) });

  test('lists every project (including the observer project) with counts', async ({ page }) => {
    await expect(projectButton(page, 'All projects')).toBeVisible();
    await expect(projectButton(page, 'webapp')).toContainText('2');
    await expect(projectButton(page, 'api-server')).toContainText('1');
    await expect(projectButton(page, 'scripts')).toContainText('1');
    await expect(projectButton(page, 'observer-sessions')).toContainText('1');
  });

  test('"All projects" shows the total session count', async ({ page }) => {
    await expect(projectButton(page, 'All projects')).toContainText('5');
  });

  test('selecting a project filters the list', async ({ page }) => {
    await projectButton(page, 'webapp').click();
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Add dark mode toggle to settings page' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Investigate slow dashboard query' })).toBeVisible();
  });

  test('selecting the observer project reveals its (otherwise hidden) session', async ({ page }) => {
    await projectButton(page, 'observer-sessions').click();
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Observed: summarize recent changes' })).toBeVisible();
  });

  test('"All projects" resets the filter', async ({ page }) => {
    await projectButton(page, 'scripts').click();
    await expect(rows(page)).toHaveCount(1);
    await projectButton(page, 'All projects').click();
    await expect(rows(page)).toHaveCount(VISIBLE.length); // observer still hidden
  });
});
