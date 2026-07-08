import { test, expect } from '@playwright/test';
import { gotoScreen, primeAppState } from './helpers.js';

test.describe('Living World (map-first)', () => {
  test('lands on Questory World shell with map and floating HUD', async ({ page }) => {
    await gotoScreen(page, 'map');

    await expect(page.getByTestId('world-shell')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Questory World' })).toBeAttached();
    await expect(page.getByTestId('floating-hud')).toBeVisible();
    await expect(page.locator('.map-stage-world-shell, .questory-map-wrap').first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'World navigation' })).toBeVisible();
  });

  test('living city panel and earth card are present', async ({ page }) => {
    await gotoScreen(page, 'map');

    await expect(page.locator('.living-city-panel')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[data-layer-id="earth"] .floating-card-summary, [data-testid="floating-hud"]')
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('floating dock navigates away from world and back', async ({ page }) => {
    await gotoScreen(page, 'map');

    const dock = page.getByRole('navigation', { name: 'World navigation' });
    await dock.getByRole('button', { name: 'Feed', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Explore Feed' })).toBeVisible({
      timeout: 15_000,
    });

    await primeAppState(page, { screen: 'map' });
    await expect(page.getByTestId('world-shell')).toBeVisible({ timeout: 15_000 });
  });

  test('expands a floating HUD card', async ({ page }) => {
    await gotoScreen(page, 'map');

    const deckToggle = page.getByTestId('floating-hud-deck-toggle');
    await expect(deckToggle).toBeVisible({ timeout: 15_000 });
    await deckToggle.click();
    const card = page.locator('.floating-card-summary').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click({ force: true });
    await expect(page.locator('.floating-card--expanded')).toBeVisible();
  });

  test('ambient director whisper can surface on the map', async ({ page }) => {
    await primeAppState(page, {
      screen: 'map',
      ambientDirector: { dismissedIds: [] },
      faction: { memberFactionId: 'parsons-explorers' },
    });
    await page.reload({ waitUntil: 'load' });
    await expect(page.getByTestId('world-shell')).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('.ambient-director-whisper')).toBeVisible({ timeout: 15_000 });
  });

  test('portrait mobile layout keeps world shell usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoScreen(page, 'map');

    await expect(page.getByTestId('world-shell')).toBeVisible();
    await expect(page.getByTestId('floating-hud')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'World navigation' })).toBeVisible();
  });

  test('landscape mobile layout keeps HUD and dock visible', async ({ page }) => {
    await gotoScreen(page, 'map');
    await page.setViewportSize({ width: 844, height: 390 });

    await expect(page.getByTestId('floating-hud')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'World navigation' })).toBeVisible();
  });
});
