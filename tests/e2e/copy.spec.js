import { test, expect } from '@playwright/test';
import { session, resumeCommand } from '../fixtures/sessions.js';
import { waitForList, openSession, row, detailPanel, searchBox } from './helpers.js';

const readClipboard = (page) => page.evaluate(() => navigator.clipboard.readText());

/**
 * We assert the real contract — what lands on the clipboard — rather than the
 * transient "Copied" label. Under headless Chromium navigator.clipboard.writeText
 * loses transient activation inside the click handler and falls back to
 * document.execCommand('copy'), which still copies but reports failure, so the
 * cosmetic label never flips. The clipboard content is what users actually rely on.
 */
test.describe('copy to clipboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.bringToFront();
    await waitForList(page);
    // Establish document focus so the Clipboard API is permitted.
    await searchBox(page).click();
  });

  test('"Copy resume" on a row copies the resume command without opening the panel', async ({ page }) => {
    const s = session('Add dark mode toggle to settings page');
    await row(page, s.id).getByRole('button', { name: 'Copy resume' }).click();

    expect(await readClipboard(page)).toBe(resumeCommand(s));
    // Clicking copy must not select the row / open the detail panel.
    await expect(detailPanel(page).getByText(/Select a session to see details/i)).toBeVisible();
    await expect(row(page, s.id)).not.toHaveClass(/ui-row-selected/);
  });

  test('detail panel "Copy command" copies the full resume command', async ({ page }) => {
    const s = session('Migrate auth to JWT refresh tokens');
    const panel = await openSession(page, s);
    await panel.getByRole('button', { name: 'Copy command' }).click();
    expect(await readClipboard(page)).toBe(resumeCommand(s));
  });

  test('detail panel "Copy id only" copies just the session id', async ({ page }) => {
    const s = session('Migrate auth to JWT refresh tokens');
    const panel = await openSession(page, s);
    await panel.getByRole('button', { name: 'Copy id only' }).click();
    expect(await readClipboard(page)).toBe(s.id);
  });
});
