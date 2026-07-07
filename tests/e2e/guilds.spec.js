import { test, expect } from '@playwright/test';
import { gotoScreen, primeAppState } from './helpers.js';

const GUILD_PRIME = {
  screen: 'social',
  socialTab: 'guild',
  faction: { memberFactionId: 'parsons-explorers' },
};

test.describe('Guilds & territories', () => {
  test('Social opens Guild hub', async ({ page }) => {
    await primeAppState(page, { screen: 'social', socialTab: 'guild' });
    await expect(page.getByRole('heading', { name: /Guild Home/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Public Guilds|Join a guild|Join Guild/i).first()).toBeVisible();
  });

  test('territory detail opens from guild panel', async ({ page }) => {
    await primeAppState(page, GUILD_PRIME);
    await page.getByRole('tab', { name: 'Territories', exact: true }).click();
    await page.locator('.faction-territory-card').first().click();
    await expect(page.locator('.faction-territory-detail, .faction-influence-list').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('season standings visible', async ({ page }) => {
    await primeAppState(page, GUILD_PRIME);
    await page.getByRole('tab', { name: 'Season', exact: true }).click();
    await expect(page.getByText(/Season standings|Parsons Explorers Guild/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
