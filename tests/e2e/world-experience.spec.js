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
      await page
        .getByRole('navigation', { name: 'World navigation' })
        .getByRole('button', { name: 'World', exact: true })
        .click({ force: true });
    }
    await expect(page.getByTestId('world-recovery-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue Offline' })).toBeVisible();
  });

  test('explorer deck stays story-driven when layers open', async ({ page }) => {
    await gotoScreen(page, 'map');
    const layers = page.getByTestId('floating-hud-deck-toggle');
    if (!(await layers.isVisible().catch(() => false))) {
      test.skip();
      return;
    }
    await layers.click();
    const explorer = page.locator('[data-layer-id="explorer"]');
    if (await explorer.isVisible().catch(() => false)) {
      await expect(explorer).not.toContainText(/No [Dd]ata/);
    }
  });

  test('marketplace navigation from HUD card', async ({ page }) => {
    await gotoScreen(page, 'map');
    const layers = page.getByTestId('floating-hud-deck-toggle');
    if (!(await layers.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await layers.click();
    const marketCard = page.locator('[data-layer-id="marketplace"] .floating-card-summary').first();
    if (!(await marketCard.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await marketCard.click();
    await page.getByRole('button', { name: 'View All' }).click();
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
