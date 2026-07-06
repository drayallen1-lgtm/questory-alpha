import { test, expect } from '@playwright/test';
import { primeAppState, gotoScreen } from './helpers.js';

test.describe('Guilds & territories', () => {
  test('Social opens Guild hub', async ({ page }) => {
    await primeAppState(page);
    await page.getByRole('button', { name: 'Social', exact: true }).click();
    await page.getByRole('button', { name: 'Guilds', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Guilds & Territories/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Public Guilds|Join a guild/i).first()).toBeVisible();
  });

  test('territory detail opens from guild panel', async ({ page }) => {
    await gotoScreen(page, 'map');
    await page.getByRole('button', { name: 'Social', exact: true }).click();
    await page.getByRole('button', { name: 'Guilds', exact: true }).click();
    await page.getByRole('button', { name: 'Territories', exact: true }).click();
    await page.locator('.faction-territory-card').first().click();
    await expect(page.locator('.faction-territory-detail, .faction-influence-list').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('faction rankings visible', async ({ page }) => {
    await primeAppState(page);
    await page.getByRole('button', { name: 'Social', exact: true }).click();
    await page.getByRole('button', { name: 'Guilds', exact: true }).click();
    await page.getByRole('button', { name: 'Rankings', exact: true }).click();
    await expect(page.getByText(/Season standings|Parsons Explorers Guild/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
