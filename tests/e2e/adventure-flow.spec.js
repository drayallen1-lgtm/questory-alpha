import { test, expect } from '@playwright/test';
import { primeAppState } from './helpers.js';

test.describe('Adventure claim flow', () => {
  test('Union Depot Ghost claim reaches victory', async ({ page }) => {
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
  });
});

test.describe('Adventure branch flow', () => {
  test('branch path can be selected without crash', async ({ page }) => {
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

    const branchBtn = page.getByRole('button', { name: /platform shadows|archive room/i }).first();
    await expect(branchBtn).toBeVisible({ timeout: 30_000 });
    await branchBtn.click({ force: true });
    await expect(page.locator('main.app')).toBeVisible();
    await expect(page.getByText(/ReferenceError|is not defined/i)).toHaveCount(0);
  });
});
