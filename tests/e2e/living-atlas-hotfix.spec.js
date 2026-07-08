import { test, expect } from '@playwright/test';
import { gotoScreen } from './helpers.js';

test.describe('Living Atlas map-first presentation', () => {
  test('atlas mode shows compact HUD only on initial load', async ({ page }) => {
    await gotoScreen(page, 'map');

    await expect(page.getByTestId('world-shell')).toHaveAttribute('data-atlas-mode', 'true');
    await expect(page.getByTestId('floating-hud')).toHaveAttribute('data-atlas-mode', 'true');

    await expect(page.locator('.marketplace-map-hud')).toHaveCount(0);
    await expect(page.locator('.legendary-map-hud')).toHaveCount(0);
    await expect(page.locator('.discovery-hud')).toHaveCount(0);
    await expect(page.locator('.living-world-activity-feed')).toHaveCount(0);
    await expect(page.locator('.smart-notif-stack-wrap')).toHaveCount(0);
    await expect(page.locator('.adaptive-hud-strip')).toHaveCount(0);
    await expect(page.locator('.floating-hud-deck-toggle')).toHaveCount(0);
  });

  test('map container fills viewport and core controls are visible', async ({ page }) => {
    await gotoScreen(page, 'map');

    const viewport = page.viewportSize();
    const mapFrame = page.locator('.world-map-frame');
    const mapStage = page.locator('.map-stage-atlas-mode, .questory-map-wrap, .fallback-map').first();

    await expect(mapFrame).toBeVisible();
    await expect(mapStage).toBeVisible();
    await expect(page.getByTestId('world-radial-menu')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'World navigation' })).toBeVisible();
    await expect(page.getByTestId('living-city-chip')).toBeVisible();

    const frameBox = await mapFrame.boundingBox();
    expect(frameBox.height).toBeGreaterThan((viewport?.height || 800) * 0.85);
  });

  test('compact chips stay narrow on load', async ({ page }) => {
    await gotoScreen(page, 'map');

    const chips = page.locator(
      '.world-atlas-mode .living-city-compact-chip, .world-atlas-mode .micro-hud-chip'
    );
    const count = await chips.count();
    for (let i = 0; i < count; i += 1) {
      const box = await chips.nth(i).boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(400);
      }
    }
  });

  test('radial menu is collapsed by default and blooms on tap', async ({ page }) => {
    await gotoScreen(page, 'map');

    const radial = page.getByTestId('world-radial-menu');
    await expect(radial).not.toHaveClass(/world-radial-menu--open/);

    await radial.getByRole('button', { name: 'Open world menu' }).click();
    await expect(radial).toHaveClass(/world-radial-menu--open/);
    await expect(radial.locator('.world-radial-bloom')).toBeVisible();
  });
});
