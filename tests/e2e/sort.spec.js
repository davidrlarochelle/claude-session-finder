import { test, expect } from '@playwright/test';
import { ORDER, session } from '../fixtures/sessions.js';
import { waitForList, visibleIds } from './helpers.js';

test.describe('sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  const sortSelect = (page) => page.getByRole('combobox');

  test('defaults to most-recent first', async ({ page }) => {
    expect(await visibleIds(page)).toEqual(ORDER.recent);
  });

  test('"Oldest" reverses the order', async ({ page }) => {
    await sortSelect(page).selectOption('oldest');
    expect(await visibleIds(page)).toEqual(ORDER.oldest);
  });

  test('"Size" puts the largest conversation first', async ({ page }) => {
    await sortSelect(page).selectOption('size');
    const ids = await visibleIds(page);
    // The JWT migration is the padded, largest fixture.
    expect(ids[0]).toBe(session('Migrate auth to JWT refresh tokens').id);
  });

  test('"Project A–Z" orders by project name', async ({ page }) => {
    await sortSelect(page).selectOption('project');
    const ids = await visibleIds(page);
    // api-server, scripts, then webapp (×2) — alphabetical by project.
    expect(ids[0]).toBe(session('Migrate auth to JWT refresh tokens').id); // api-server
    expect(ids[1]).toBe(session('Write a bash script that rotates log files older than 7 days.').id); // scripts
  });
});
