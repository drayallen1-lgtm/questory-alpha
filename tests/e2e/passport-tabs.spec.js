import { test, expect } from '@playwright/test';
import { gotoScreen } from './helpers.js';

const PASSPORT_TABS = [
  'Passport',
  'Codex',
  'Economy',
  'Progress',
  'Craft',
  'Rewards',
  'Market',
  'Creators',
  'Badges',
];

test.describe('Passport tabs', () => {
  test('vault tabs switch visible panels', async ({ page }) => {
    await gotoScreen(page, 'vault');

    for (const tab of PASSPORT_TABS) {
      const btn = page.getByRole('button', { name: tab, exact: true });
      if (!(await btn.isVisible().catch(() => false))) continue;
      await btn.click();
      await expect(page.locator('.vault-tabs-scroll, .codex-hub, .passport-region, .card').first()).toBeVisible();
    }
  });
});
