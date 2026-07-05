import { test, expect } from '@playwright/test';
import { gotoScreen } from './helpers.js';

test.describe('Map flow', () => {
  test('map container loads and adventure markers render', async ({ page }) => {
    await gotoScreen(page, 'map');
    await expect(page.getByRole('heading', { name: 'Adventure Map' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('.questory-map-wrap, .map-stage, .fallback-map, .map-pin-fallback-list').first()
    ).toBeVisible();

    const marker = page.locator('.fallback-marker, .map-pin-fallback-list button, .questory-map').first();
    await expect(marker).toBeVisible();
  });
});
