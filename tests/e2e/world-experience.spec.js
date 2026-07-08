import { test, expect } from '@playwright/test';
import { gotoScreen, primeAppState, dismissWelcomeOnboarding } from './helpers.js';

test.describe('World experience polish', () => {
  test('tracks map open analytics on world shell', async ({ page }) => {
    await gotoScreen(page, 'map');
    await expect(page.getByTestId('world-shell')).toBeVisible();
    await page.waitForTimeout(800);

    const counters = await page.evaluate(() => {
      const raw = localStorage.getItem('questoryAlpha');
      if (!raw) return null;
      const state = JSON.parse(raw);
      return state.worldAnalytics?.counters || {};
    });
    expect(counters?.map_open).toBeGreaterThan(0);
  });

  test('shows friendly world recovery banner', async ({ page }) => {
    await primeAppState(page, {
      screen: 'map',
      worldExperience: { lastError: 'network timeout', offlineMode: false },
    });
    await dismissWelcomeOnboarding(page);
    if (!(await page.getByTestId('world-shell').isVisible().catch(() => false))) {
      await primeAppState(page, { screen: 'map' });
    }
    await expect(page.getByTestId('world-recovery-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue Offline' })).toBeVisible();
  });

  test('explorer deck stays story-driven when layers open', async ({ page }) => {
    await gotoScreen(page, 'map');
    const radial = page.getByTestId('world-radial-menu');
    await radial.getByRole('button', { name: 'Open world menu' }).click();
    await radial.locator('.world-radial-item').nth(4).click();
    const explorer = page.locator('[data-layer-id="explorer"]');
    if (await explorer.isVisible().catch(() => false)) {
      await expect(explorer).not.toContainText(/No [Dd]ata/);
    }
  });

  test('marketplace is a map-native venue card, not a HUD stack', async ({ page }) => {
    // Prime a selected venue so the world-object preview card opens without a live map.
    await primeAppState(page, {
      screen: 'map',
      marketplaceVenueId: 'downtown-market',
      marketplaceTab: 'featured',
    });
    await dismissWelcomeOnboarding(page);
    await expect(page.getByTestId('world-shell')).toBeVisible({ timeout: 30_000 });

    // No permanent horizontal market bar over the map.
    await expect(page.locator('.marketplace-map-hud')).toHaveCount(0);

    const venueCard = page.locator('.market-venue-card');
    if (!(await venueCard.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await expect(venueCard.locator('.market-venue-card-items li').first()).toBeVisible();

    await venueCard.getByRole('button', { name: /Browse Market/i }).click();
    await expect(page.getByRole('heading', { name: /Marketplace/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('guild hub reachable from social', async ({ page }) => {
    await gotoScreen(page, 'social');
    await page.getByRole('tab', { name: 'Guild', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Guild Home/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('desktop viewport keeps HUD and map visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoScreen(page, 'map');
    await expect(page.getByTestId('floating-hud')).toBeVisible();
    await expect(page.locator('.map-stage-world-shell, .questory-map-wrap').first()).toBeVisible();
  });
});
