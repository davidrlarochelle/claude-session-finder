import { test, expect } from '@playwright/test';
import { waitForList } from './helpers.js';

const htmlAttr = (page, attr) =>
  page.evaluate((a) => document.documentElement.getAttribute(a), attr);
const hasDark = (page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));
const ls = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

test.describe('theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  test('toggles dark/light, syncs <html>.dark and persists across reload', async ({ page }) => {
    const before = await hasDark(page);
    const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i });

    await toggle.click();
    expect(await hasDark(page)).toBe(!before);
    expect(await ls(page, 'theme')).toBe(!before ? 'dark' : 'light');

    await page.reload();
    await waitForList(page);
    expect(await hasDark(page)).toBe(!before); // survived reload
  });
});

test.describe('design style switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForList(page);
  });

  const styleButton = (page, label) =>
    page.getByRole('group', { name: 'Design style' }).getByRole('button', { name: new RegExp(label, 'i') });

  test('defaults to the flat "default" style', async ({ page }) => {
    expect(await htmlAttr(page, 'data-style')).toBe('default');
  });

  for (const { label, value } of [
    { label: 'Skeuomorphism', value: 'skeu' },
    { label: 'Neumorphism', value: 'neu' },
    { label: 'Liquid Glass', value: 'glass' },
  ]) {
    test(`switching to ${value} updates <html data-style>, aria-pressed and localStorage`, async ({ page }) => {
      const button = styleButton(page, label);
      await button.click();
      expect(await htmlAttr(page, 'data-style')).toBe(value);
      expect(await ls(page, 'style')).toBe(value);
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  }

  test('the chosen style persists across reload', async ({ page }) => {
    await styleButton(page, 'Neumorphism').click();
    expect(await htmlAttr(page, 'data-style')).toBe('neu');
    await page.reload();
    await waitForList(page);
    expect(await htmlAttr(page, 'data-style')).toBe('neu');
  });
});
