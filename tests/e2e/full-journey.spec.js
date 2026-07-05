import { test, expect } from '@playwright/test';
import { primeAppState, gotoScreen } from './helpers.js';

test.describe('Full journey regression', () => {
  test('map → adventure → branch → claim → passport', async ({ page }) => {
    await gotoScreen(page, 'map');
    await expect(
      page.locator('.questory-map-wrap, .map-fallback-list, .map-stage').first()
    ).toBeVisible({ timeout: 30_000 });

    await primeAppState(page, {
      screen: 'play',
      selectedAdventureId: 'union-depot-ghost',
      previewMode: true,
      progress: {
        'union-depot-ghost': {
          step: 0,
          claimed: false,
          bonuses: [],
          medallionTapped: false,
        },
      },
    });

    const branchBtn = page.getByRole('button', { name: /ghost|lantern|path/i }).first();
    if (await branchBtn.isVisible().catch(() => false)) {
      await branchBtn.click();
    }

    await primeAppState(page, {
      screen: 'play',
      selectedAdventureId: 'union-depot-ghost',
      previewMode: true,
      progress: {
        'union-depot-ghost': {
          step: 2,
          claimed: false,
          bonuses: [],
          medallionTapped: false,
          pathId: 'ghost',
          branchCommittedAt: new Date().toISOString(),
        },
      },
    });

    await expect(page.getByText(/Claim Treasure|Enter the claim code/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const input = page.locator('input[type="text"], input[placeholder*="code" i]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('DEPOTGHOST');
    }

    await page.getByRole('button', { name: /Claim Treasure/i }).click();

    await expect(
      page.getByText(/Treasure claimed|Adventure complete|View Celebration|Passport/i).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Passport', exact: true }).click();
    await expect(page.locator('.vault-tabs-scroll, .passport-region, .codex-hub').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
