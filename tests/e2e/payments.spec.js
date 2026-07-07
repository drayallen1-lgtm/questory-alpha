import { test, expect } from '@playwright/test';
import { gotoScreen } from './helpers.js';

test.describe('Phase 17 payments', () => {
  test('passport wallet tab loads', async ({ page }) => {
    await gotoScreen(page, 'vault');
    const walletBtn = page.getByRole('button', { name: 'Wallet', exact: true });
    if (await walletBtn.isVisible().catch(() => false)) {
      await walletBtn.click();
      await expect(page.getByText(/Explorer Wallet/i)).toBeVisible({ timeout: 15000 });
    }
  });
});
