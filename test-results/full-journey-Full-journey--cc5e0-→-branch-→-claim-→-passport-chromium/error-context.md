# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-journey.spec.js >> Full journey regression >> map → adventure → branch → claim → passport
- Location: tests\e2e\full-journey.spec.js:5:7

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.goto: Test timeout of 120000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:5173/", waiting until "load"

```

# Test source

```ts
  1   | const STORAGE_KEY = 'questoryAlpha';
  2   | 
  3   | const E2E_ONBOARDING = {
  4   |   completed: true,
  5   |   skipped: true,
  6   |   journeyChosen: true,
  7   |   playerGuideCompleted: true,
  8   |   playerGuideSkipped: true,
  9   | };
  10  | 
  11  | const E2E_FIRST_TIME_METRICS = {
  12  |   firstCompletionCelebrated: true,
  13  |   demoCompleted: true,
  14  | };
  15  | 
  16  | const APP_ROOT_SELECTOR =
  17  |   'main.app, [data-testid="app-root"], .questory-shell, nav.bottom-nav-7, nav.bottom-nav-8';
  18  | 
  19  | const diagnosedPages = new WeakSet();
  20  | 
  21  | export { STORAGE_KEY };
  22  | 
  23  | function deepMerge(base, patch) {
  24  |   if (!patch || typeof patch !== 'object') return base;
  25  |   const out = { ...(base || {}) };
  26  |   for (const [key, value] of Object.entries(patch)) {
  27  |     if (
  28  |       value &&
  29  |       typeof value === 'object' &&
  30  |       !Array.isArray(value) &&
  31  |       base &&
  32  |       typeof base[key] === 'object' &&
  33  |       !Array.isArray(base[key])
  34  |     ) {
  35  |       out[key] = deepMerge(base[key], value);
  36  |     } else {
  37  |       out[key] = value;
  38  |     }
  39  |   }
  40  |   return out;
  41  | }
  42  | 
  43  | export function attachPageDiagnostics(page) {
  44  |   if (diagnosedPages.has(page)) return;
  45  |   diagnosedPages.add(page);
  46  | 
  47  |   page.on('pageerror', (err) => {
  48  |     console.log('PAGE ERROR', err.message);
  49  |   });
  50  | 
  51  |   page.on('console', (msg) => {
  52  |     if (msg.type() === 'error') {
  53  |       console.log('BROWSER ERROR', msg.text());
  54  |     }
  55  |   });
  56  | }
  57  | 
  58  | async function waitForAppRoot(page, timeout = 30_000) {
  59  |   await page.waitForSelector(APP_ROOT_SELECTOR, { timeout, state: 'visible' });
  60  | }
  61  | 
  62  | async function reloadApp(page, attempts = 3) {
  63  |   let lastErr;
  64  |   for (let attempt = 1; attempt <= attempts; attempt += 1) {
  65  |     await page.goto('/', { waitUntil: 'load', timeout: 45_000 });
  66  |     try {
  67  |       await waitForAppRoot(page, 30_000);
  68  |       return;
  69  |     } catch (err) {
  70  |       lastErr = err;
  71  |       if (attempt < attempts) {
  72  |         await page.waitForTimeout(500 * attempt);
  73  |       }
  74  |     }
  75  |   }
  76  |   throw lastErr;
  77  | }
  78  | 
  79  | function isOnAppOrigin(page) {
  80  |   try {
  81  |     const { origin, pathname } = new URL(page.url());
  82  |     return (
  83  |       (origin === 'http://127.0.0.1:5173' || origin === 'http://localhost:5173') &&
  84  |       (pathname === '/' || pathname === '')
  85  |     );
  86  |   } catch {
  87  |     return false;
  88  |   }
  89  | }
  90  | 
  91  | export async function primeAppState(page, patch = {}) {
  92  |   attachPageDiagnostics(page);
  93  | 
  94  |   if (!isOnAppOrigin(page)) {
> 95  |     await page.goto('/');
      |                ^ Error: page.goto: Test timeout of 120000ms exceeded.
  96  |   }
  97  |   await page.waitForLoadState('domcontentloaded');
  98  |   await waitForAppRoot(page).catch(() => {});
  99  | 
  100 |   const base = await page.evaluate((storageKey) => {
  101 |     try {
  102 |       const raw = localStorage.getItem(storageKey);
  103 |       return raw ? JSON.parse(raw) : {};
  104 |     } catch {
  105 |       return {};
  106 |     }
  107 |   }, STORAGE_KEY);
  108 | 
  109 |   const merged = deepMerge(base, {
  110 |     onboarding: { ...(base.onboarding || {}), ...E2E_ONBOARDING },
  111 |     firstTimeMetrics: { ...(base.firstTimeMetrics || {}), ...E2E_FIRST_TIME_METRICS },
  112 |     ...patch,
  113 |   });
  114 | 
  115 |   await page.evaluate(
  116 |     ({ storageKey, state }) => {
  117 |       localStorage.setItem(storageKey, JSON.stringify(state));
  118 |     },
  119 |     { storageKey: STORAGE_KEY, state: merged }
  120 |   );
  121 | 
  122 |   try {
  123 |     await reloadApp(page);
  124 |   } catch (err) {
  125 |     const bodyText = await page.locator('body').innerText().catch(() => '');
  126 |     throw new Error(
  127 |       `App root not visible after primeAppState reload. ${err.message}\nBody preview: ${bodyText.slice(0, 240)}`
  128 |     );
  129 |   }
  130 | }
  131 | 
  132 | export async function dismissFirstCompletionOverlay(page) {
  133 |   const overlay = page.locator('.first-completion-overlay');
  134 |   if (!(await overlay.isVisible().catch(() => false))) return;
  135 |   await page.locator('.first-completion-overlay button.ghost').first().click();
  136 |   await overlay.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  137 | }
  138 | 
  139 | export async function dismissPostClaimPrompts(page) {
  140 |   const overlays = page.locator('.modal-overlay, .invitation-overlay');
  141 |   for (let i = 0; i < 4; i += 1) {
  142 |     const count = await overlays.count();
  143 |     if (count === 0) break;
  144 |     const top = overlays.last();
  145 |     const skip = top.getByRole('button', { name: 'Skip' });
  146 |     const dismiss = top.locator('button.ghost').first();
  147 |     if (await skip.isVisible().catch(() => false)) {
  148 |       await skip.click({ force: true });
  149 |     } else if (await dismiss.isVisible().catch(() => false)) {
  150 |       await dismiss.click({ force: true });
  151 |     } else {
  152 |       break;
  153 |     }
  154 |     await page.waitForTimeout(400);
  155 |   }
  156 | }
  157 | 
  158 | export async function openPassportAfterClaim(page) {
  159 |   await dismissPostClaimPrompts(page);
  160 |   await dismissFirstCompletionOverlay(page);
  161 |   await page.getByRole('button', { name: /Open Passport/i }).click();
  162 | }
  163 | 
  164 | export async function gotoScreen(page, screen) {
  165 |   await primeAppState(page);
  166 |   await page.waitForSelector('nav.bottom-nav-7, nav.bottom-nav-8', { timeout: 30_000 });
  167 |   const labelMap = {
  168 |     home: 'Home',
  169 |     feed: 'Feed',
  170 |     map: 'Map',
  171 |     vault: 'Passport',
  172 |   };
  173 |   await page.getByRole('button', { name: labelMap[screen], exact: true }).click();
  174 | }
  175 | 
```