# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.js >> Questory smoke >> map opens
- Location: tests\e2e\smoke.spec.js:12:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
Call log:
  - navigating to "http://127.0.0.1:5173/", waiting until "load"

```

# Test source

```ts
  1   | import { expect } from '@playwright/test';
  2   | 
  3   | const STORAGE_KEY = 'questoryAlpha';
  4   | 
  5   | const E2E_ONBOARDING = {
  6   |   completed: true,
  7   |   skipped: true,
  8   |   journeyChosen: true,
  9   |   playerGuideCompleted: true,
  10  |   playerGuideSkipped: true,
  11  | };
  12  | 
  13  | const E2E_FIRST_TIME_METRICS = {
  14  |   firstCompletionCelebrated: true,
  15  |   demoCompleted: true,
  16  | };
  17  | 
  18  | const APP_ROOT_SELECTOR =
  19  |   'main.app, [data-testid="app-root"], .questory-shell, nav.bottom-nav-7, nav.bottom-nav-8';
  20  | 
  21  | const diagnosedPages = new WeakSet();
  22  | 
  23  | export { STORAGE_KEY };
  24  | 
  25  | function deepMerge(base, patch) {
  26  |   if (!patch || typeof patch !== 'object') return base;
  27  |   const out = { ...(base || {}) };
  28  |   for (const [key, value] of Object.entries(patch)) {
  29  |     if (
  30  |       value &&
  31  |       typeof value === 'object' &&
  32  |       !Array.isArray(value) &&
  33  |       base &&
  34  |       typeof base[key] === 'object' &&
  35  |       !Array.isArray(base[key])
  36  |     ) {
  37  |       out[key] = deepMerge(base[key], value);
  38  |     } else {
  39  |       out[key] = value;
  40  |     }
  41  |   }
  42  |   return out;
  43  | }
  44  | 
  45  | export function attachPageDiagnostics(page) {
  46  |   if (diagnosedPages.has(page)) return;
  47  |   diagnosedPages.add(page);
  48  | 
  49  |   page.on('pageerror', (err) => {
  50  |     console.log('PAGE ERROR', err.message);
  51  |   });
  52  | 
  53  |   page.on('console', (msg) => {
  54  |     if (msg.type() === 'error') {
  55  |       console.log('BROWSER ERROR', msg.text());
  56  |     }
  57  |   });
  58  | }
  59  | 
  60  | async function waitForAppRoot(page, timeout = 30_000) {
  61  |   await page.waitForSelector(APP_ROOT_SELECTOR, { timeout, state: 'visible' });
  62  | }
  63  | 
  64  | async function reloadApp(page, attempts = 3) {
  65  |   let lastErr;
  66  |   for (let attempt = 1; attempt <= attempts; attempt += 1) {
  67  |     await page.goto('/', { waitUntil: 'load', timeout: 45_000 });
  68  |     try {
  69  |       await waitForAppRoot(page, 30_000);
  70  |       return;
  71  |     } catch (err) {
  72  |       lastErr = err;
  73  |       if (attempt < attempts) {
  74  |         await page.waitForTimeout(500 * attempt);
  75  |       }
  76  |     }
  77  |   }
  78  |   throw lastErr;
  79  | }
  80  | 
  81  | function isOnAppOrigin(page) {
  82  |   try {
  83  |     const { origin, pathname } = new URL(page.url());
  84  |     return (
  85  |       (origin === 'http://127.0.0.1:5173' || origin === 'http://localhost:5173') &&
  86  |       (pathname === '/' || pathname === '')
  87  |     );
  88  |   } catch {
  89  |     return false;
  90  |   }
  91  | }
  92  | 
  93  | export async function primeAppState(page, patch = {}) {
  94  |   attachPageDiagnostics(page);
  95  | 
  96  |   if (!isOnAppOrigin(page)) {
> 97  |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
  98  |   }
  99  |   await page.waitForLoadState('domcontentloaded');
  100 |   await waitForAppRoot(page).catch(() => {});
  101 | 
  102 |   const base = await page.evaluate((storageKey) => {
  103 |     try {
  104 |       const raw = localStorage.getItem(storageKey);
  105 |       return raw ? JSON.parse(raw) : {};
  106 |     } catch {
  107 |       return {};
  108 |     }
  109 |   }, STORAGE_KEY);
  110 | 
  111 |   const merged = deepMerge(base, {
  112 |     onboarding: { ...(base.onboarding || {}), ...E2E_ONBOARDING },
  113 |     firstTimeMetrics: { ...(base.firstTimeMetrics || {}), ...E2E_FIRST_TIME_METRICS },
  114 |     ...patch,
  115 |   });
  116 | 
  117 |   await page.evaluate(
  118 |     ({ storageKey, state }) => {
  119 |       localStorage.setItem(storageKey, JSON.stringify(state));
  120 |     },
  121 |     { storageKey: STORAGE_KEY, state: merged }
  122 |   );
  123 | 
  124 |   try {
  125 |     await reloadApp(page);
  126 |   } catch (err) {
  127 |     const bodyText = await page.locator('body').innerText().catch(() => '');
  128 |     throw new Error(
  129 |       `App root not visible after primeAppState reload. ${err.message}\nBody preview: ${bodyText.slice(0, 240)}`
  130 |     );
  131 |   }
  132 | }
  133 | 
  134 | export async function dismissFirstCompletionOverlay(page) {
  135 |   const overlay = page.locator('.first-completion-overlay');
  136 |   if (!(await overlay.isVisible().catch(() => false))) return;
  137 |   await page.locator('.first-completion-overlay button.ghost').first().click();
  138 |   await overlay.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  139 | }
  140 | 
  141 | export async function dismissPostClaimPrompts(page) {
  142 |   const overlays = page.locator('.modal-overlay, .invitation-overlay');
  143 |   for (let i = 0; i < 4; i += 1) {
  144 |     const count = await overlays.count();
  145 |     if (count === 0) break;
  146 |     const top = overlays.last();
  147 |     const skip = top.getByRole('button', { name: 'Skip' });
  148 |     const dismiss = top.locator('button.ghost').first();
  149 |     if (await skip.isVisible().catch(() => false)) {
  150 |       await skip.click({ force: true });
  151 |     } else if (await dismiss.isVisible().catch(() => false)) {
  152 |       await dismiss.click({ force: true });
  153 |     } else {
  154 |       break;
  155 |     }
  156 |     await page.waitForTimeout(400);
  157 |   }
  158 | }
  159 | 
  160 | export async function openPassportAfterClaim(page) {
  161 |   await dismissPostClaimPrompts(page);
  162 |   await dismissFirstCompletionOverlay(page);
  163 |   await page.getByRole('button', { name: /Open Passport/i }).click();
  164 | }
  165 | 
  166 | export async function gotoScreen(page, screen) {
  167 |   const screenAliases = { home: 'map', world: 'map' };
  168 |   const target = screenAliases[screen] || screen;
  169 | 
  170 |   await primeAppState(page, target === 'map' ? { screen: 'map' } : { screen: target });
  171 | 
  172 |   if (target === 'map') {
  173 |     await expect(page.getByTestId('world-shell')).toBeVisible({ timeout: 30_000 });
  174 |     return;
  175 |   }
  176 | 
  177 |   const labelMap = {
  178 |     feed: 'Feed',
  179 |     map: 'World',
  180 |     vault: 'Passport',
  181 |     social: 'Social',
  182 |     create: 'Create',
  183 |     admin: 'Admin',
  184 |     sponsor: 'Sponsor',
  185 |   };
  186 |   const label = labelMap[target];
  187 |   if (!label) {
  188 |     throw new Error(`Unknown e2e screen: ${screen}`);
  189 |   }
  190 | 
  191 |   const nav = page.locator(
  192 |     'nav.floating-dock, nav.bottom-nav-6, nav.bottom-nav-7, nav.bottom-nav-8'
  193 |   );
  194 |   await nav.getByRole('button', { name: label, exact: true }).click();
  195 | }
  196 | 
```