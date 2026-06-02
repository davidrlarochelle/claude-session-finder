import { test, expect } from '@playwright/test';
import { VISIBLE } from '../fixtures/sessions.js';
import { rows, waitForList, searchBox } from './helpers.js';

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('filters by title', async ({ page }) => {
    await searchBox(page).fill('dark mode');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Add dark mode toggle to settings page' })).toBeVisible();
  });

  test('filters by preview text', async ({ page }) => {
    await searchBox(page).fill('8 seconds');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Investigate slow dashboard query' })).toBeVisible();
  });

  test('filters by project name', async ({ page }) => {
    await searchBox(page).fill('api-server');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Migrate auth to JWT refresh tokens' })).toBeVisible();
  });

  test('filters by git branch', async ({ page }) => {
    await searchBox(page).fill('fix/perf');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Investigate slow dashboard query' })).toBeVisible();
  });

  test('filters by session id', async ({ page }) => {
    await searchBox(page).fill('3c333333');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Migrate auth to JWT refresh tokens' })).toBeVisible();
  });

  test('is case-insensitive', async ({ page }) => {
    await searchBox(page).fill('DARK MODE');
    await expect(rows(page)).toHaveCount(1);
  });

  test('shows an empty state when nothing matches', async ({ page }) => {
    await searchBox(page).fill('this-matches-nothing-zzz');
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByText('No sessions match your search.')).toBeVisible();
  });

  test('clearing the query restores all rows', async ({ page }) => {
    await searchBox(page).fill('dark mode');
    await expect(rows(page)).toHaveCount(1);
    await searchBox(page).clear();
    await expect(rows(page)).toHaveCount(VISIBLE.length);
  });
});
