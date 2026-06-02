import { test, expect } from '@playwright/test';
import { SESSIONS, session, resumeCommand, expectedMessageCount } from '../fixtures/sessions.js';
import { waitForList, openSession, detailPanel, row } from './helpers.js';

test.describe('detail panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('shows a prompt to select a session initially', async ({ page }) => {
    await expect(detailPanel(page).getByText(/Select a session to see details/i)).toBeVisible();
  });

  test('opens with metadata when a row is clicked', async ({ page }) => {
    const s = session('Add dark mode toggle to settings page');
    const panel = await openSession(page, s);

    await expect(panel.getByText('webapp', { exact: true })).toBeVisible();
    await expect(panel.getByText('main', { exact: true })).toBeVisible();
    await expect(panel.getByText(s.model)).toBeVisible();
    await expect(panel.getByText(String(expectedMessageCount(s)), { exact: true })).toBeVisible();
    // cwd appears both inside the resume command and as the "Working dir" field;
    // pin to the standalone field with an exact match.
    await expect(panel.getByText(s.cwd, { exact: true })).toBeVisible();
    await expect(panel.getByText(s.id, { exact: true })).toBeVisible();
  });

  test('renders the resume command', async ({ page }) => {
    const s = session('Add dark mode toggle to settings page');
    const panel = await openSession(page, s);
    await expect(panel.getByText(resumeCommand(s))).toBeVisible();
  });

  test('loads the conversation preview (human/assistant text turns only)', async ({ page }) => {
    const s = session('Add dark mode toggle to settings page');
    const panel = await openSession(page, s);

    // First real human turn shows up...
    await expect(panel.getByText(s.firstUserText)).toBeVisible();
    // ...and the assistant's text reply.
    await expect(panel.getByText(/respect.*prefers-color-scheme|falls back to prefers-color-scheme/i)).toBeVisible();
    // Thinking blocks and tool I/O must never leak into the preview.
    await expect(panel.getByText(/They want a persisted theme toggle/)).toHaveCount(0);
    await expect(panel.getByText('File edited successfully.')).toHaveCount(0);
  });

  test('falls back to the first message as title when no ai-title exists', async ({ page }) => {
    const s = session('Write a bash script that rotates log files older than 7 days.');
    await openSession(page, s);
  });

  test('close button dismisses the panel', async ({ page }) => {
    const s = SESSIONS[0];
    const panel = await openSession(page, s);
    await panel.getByRole('button', { name: /close details/i }).click();
    await expect(detailPanel(page).getByText(/Select a session to see details/i)).toBeVisible();
  });

  test('selecting a row highlights it', async ({ page }) => {
    const s = SESSIONS[0];
    await openSession(page, s);
    await expect(row(page, s.id)).toHaveClass(/ui-row-selected/);
  });
});
