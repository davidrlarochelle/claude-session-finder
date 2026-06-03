import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import type { SessionSpec } from '../fixtures/sessions.js';

/** Wait until the session list has rendered (loading spinner gone, rows present). */
export async function waitForList(page: Page): Promise<void> {
  await expect(page.getByText('Loading sessions…')).toHaveCount(0);
  await expect(page.getByTestId('session-row').first()).toBeVisible();
}

/** All currently-rendered session rows, in DOM order. */
export function rows(page: Page): Locator {
  return page.getByTestId('session-row');
}

/** The session ids of the rendered rows, in DOM order. */
export async function visibleIds(page: Page): Promise<(string | null)[]> {
  return rows(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-session-id')));
}

/** A single row locator addressed by session id. */
export function row(page: Page, id: string): Locator {
  return page.locator(`[data-testid="session-row"][data-session-id="${id}"]`);
}

/** The detail panel (selected or empty state). */
export function detailPanel(page: Page): Locator {
  return page.getByTestId('detail-panel');
}

/** Open a session's detail panel and wait for it to render its title. */
export async function openSession(page: Page, spec: SessionSpec): Promise<Locator> {
  await row(page, spec.id).click();
  const panel = detailPanel(page);
  await expect(panel.getByRole('heading', { name: spec.title })).toBeVisible();
  return panel;
}

/** The search box. */
export function searchBox(page: Page): Locator {
  return page.getByPlaceholder(/Search title, preview/i);
}
