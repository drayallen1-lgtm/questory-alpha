/**
 * Capture browser console errors when navigating to adventure detail/play.
 * Usage: node scripts/capture-crash.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:4173/';
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('pageerror', (err) => {
  errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
});
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push({ type: 'console', message: msg.text() });
  }
});

async function seedState(screen, adventureId = 'union-depot-ghost') {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(
    ({ screen, adventureId }) => {
      localStorage.setItem('questory_force_event', 'halloween');
      const key = 'questoryAlpha';
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(
        key,
        JSON.stringify({
          ...saved,
          screen,
          selectedAdventureId: adventureId,
          adminPreview: false,
          progress: {
            ...(saved.progress || {}),
            [adventureId]: saved.progress?.[adventureId] || { step: 0, claimed: false },
          },
        })
      );
    },
    { screen, adventureId }
  );
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
}

async function gotoScreen(label, screen) {
  console.log(`\n>>> Navigating to screen: ${label} (${screen})`);
  await seedState(screen);
}

try {
  for (const [label, screen] of [
    ['home', 'home'],
    ['feed', 'feed'],
    ['detail', 'detail'],
    ['play', 'play'],
    ['world', 'world'],
  ]) {
    await gotoScreen(label, screen);
  }

  // UI path: feed -> card -> detail -> start
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    localStorage.removeItem('questoryAlpha');
    localStorage.setItem('questory_force_event', 'halloween');
  });
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);

  const explore = page.getByRole('button', { name: /Explore Hunts/i }).first();
  if (await explore.count()) await explore.click({ timeout: 5000 });
  await page.waitForTimeout(1500);

  const card = page.locator('.feed-card, .card').filter({ hasText: /Union|Depot|Ghost|Lantern/i }).first();
  if (await card.count()) await card.click({ timeout: 8000 });
  await page.waitForTimeout(2000);

  const start = page.getByRole('button', { name: /Start Adventure|Continue/i }).first();
  if (await start.count()) await start.click({ timeout: 8000 });
  await page.waitForTimeout(3000);
} catch (err) {
  errors.push({ type: 'script', message: err.message, stack: err.stack });
}

console.log('=== CAPTURED ERRORS ===');
if (!errors.length) {
  console.log('(none)');
} else {
  for (const e of errors) {
    console.log('\n---');
    console.log(JSON.stringify(e, null, 2));
  }
}

await browser.close();
process.exit(errors.length ? 1 : 0);
