import { test, expect } from '@playwright/test';
import { primeAppState, gotoScreen, openPassportAfterClaim } from './helpers.js';

test.describe('Full journey regression', () => {
  test('map → adventure → branch → claim → passport', async ({ page }) => {
    test.setTimeout(120_000);
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
      page.getByText(/Treasure claimed|Adventure complete|Victory!|View Celebration|Open Passport/i).first()
    ).toBeVisible({ timeout: 20_000 });

    await openPassportAfterClaim(page);
    await expect(page.getByRole('heading', { name: 'Questory Passport' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('.vault-tabs-scroll, .passport-region').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
