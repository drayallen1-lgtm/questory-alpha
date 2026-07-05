import { test, expect } from '@playwright/test';
import { gotoScreen } from './helpers.js';

test.describe('Questory smoke', () => {
  test('app loads and home renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main.app')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  });

  test('map opens', async ({ page }) => {
    await gotoScreen(page, 'map');
    await expect(page.getByRole('heading', { name: 'Adventure Map' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('.questory-map-wrap, .map-stage, .fallback-map, .map-pin-fallback-list').first()
    ).toBeVisible();
  });

  test('passport opens', async ({ page }) => {
    await gotoScreen(page, 'vault');
    await expect(page.getByRole('heading', { name: 'Questory Passport' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('feed opens', async ({ page }) => {
    await gotoScreen(page, 'feed');
    await expect(page.getByRole('heading', { name: 'Explore Feed' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
